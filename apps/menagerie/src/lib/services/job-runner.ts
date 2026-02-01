import { Effect, Layer } from "effect"
import { SandboxService, type SandboxInstance, type AgentTypeConfig } from "./sandbox"
import { DataStore } from "./datastore"
import { getAgentType, getResourceTemplate, getIntegration } from "@/config"
import {
  AgentJobError,
  SandboxError,
  SandboxCommandError,
  SandboxFileError,
  SandboxCreationError,
  NotFoundError,
  DatabaseError,
  DuplicateError,
} from "../errors"
import type { AgentJobId, AgentId, OrganisationId } from "../schemas"
import type { AgentJob, Integration, Resource } from "@prisma/client"

// ============================================================================
// Types
// ============================================================================

/**
 * Agent with resources and optional image relation
 */
type AgentWithRelations = {
  id: string
  name: string
  slug: string
  organisationId: string
  agentTypeSlug: string
  resourceIds: string[]
  image: {
    id: string
    dockerfileHash: string
    deployedImageName: string | null
  } | null
  resources: Resource[]
}

/**
 * Status of a running job
 */
export interface JobStatus {
  jobId: string
  status: "pending" | "starting" | "running" | "completed" | "failed" | "cancelled"
  sandboxUrl: string | null
  output: string[]
  errors: string[]
  startedAt: Date | null
  completedAt: Date | null
}

/**
 * All possible errors from JobRunner operations
 */
export type JobRunnerError =
  | AgentJobError
  | NotFoundError
  | DatabaseError
  | DuplicateError
  | SandboxError
  | SandboxCreationError
  | SandboxCommandError
  | SandboxFileError

/**
 * Map of active sandbox instances by job ID
 */
const activeSandboxes = new Map<string, SandboxInstance>()

// ============================================================================
// JobRunner Service
// ============================================================================

export class JobRunner extends Effect.Service<JobRunner>()("JobRunner", {
  effect: Effect.gen(function* () {
    const sandboxService = yield* SandboxService
    const dataStore = yield* DataStore

    return {
      /**
       * Start a job: create sandbox with E2B, setup resources, return URL
       */
      startJob: (jobId: AgentJobId): Effect.Effect<string, JobRunnerError> =>
        Effect.gen(function* () {
          console.log(`[JobRunner] Starting job ${jobId}`)

          // 1. Fetch the job from database
          const job = (yield* dataStore.agentJobs.findById(jobId)) as AgentJob & { agent: { organisationId: string } }
          console.log(`[JobRunner] Fetched job: agentId=${job.agentId}, prompt="${job.initialPrompt.substring(0, 50)}..."`)

          // 2. Fetch the agent with image relation
          const agent = (yield* dataStore.agents.findById(job.agentId as AgentId)) as AgentWithRelations
          console.log(`[JobRunner] Fetched agent: name=${agent.name}, agentTypeSlug=${agent.agentTypeSlug}, resourceIds=${JSON.stringify(agent.resourceIds)}`)

          // 3. Get agent type definition from config
          const agentTypeDef = getAgentType(agent.agentTypeSlug)
          if (!agentTypeDef) {
            console.error(`[JobRunner] Agent type "${agent.agentTypeSlug}" not found in configuration`)
            return yield* Effect.fail(
              new AgentJobError({
                message: `Agent type "${agent.agentTypeSlug}" not found in configuration`,
                jobId,
              })
            )
          }
          console.log(`[JobRunner] Using agent type: ${agentTypeDef.name} (${agentTypeDef.slug})`)

          // 4. Fetch integrations for this agent's organisation
          const integrations = (yield* dataStore.integrations.listByOrganisation(
            agent.organisationId as OrganisationId
          )) as Integration[]
          console.log(`[JobRunner] Found ${integrations.length} integrations: ${integrations.map(i => i.slug).join(", ")}`)

          // 5. Fetch resources assigned to this agent
          const resources = (yield* dataStore.resources.listByOrganisation(
            agent.organisationId as OrganisationId
          )) as Resource[]
          const agentResources = resources.filter((r) =>
            agent.resourceIds.includes(r.id)
          )
          console.log(`[JobRunner] Found ${agentResources.length} assigned resources: ${agentResources.map(r => r.slug).join(", ")}`)

          // 6. Build environment variables from integrations using explicit envVarName from schema
          const envs: Record<string, string> = {}
          for (const integration of integrations) {
            const integrationDef = getIntegration(integration.slug)
            if (!integrationDef?.configJsonSchema) continue

            const schema = integrationDef.configJsonSchema as {
              properties?: Record<string, { envVarName?: string }>
            }
            const integrationConfig = integration.config as Record<string, unknown>

            for (const [key, propSchema] of Object.entries(schema.properties || {})) {
              const envVarName = propSchema.envVarName
              const value = integrationConfig[key]
              if (envVarName && typeof value === "string") {
                envs[envVarName] = value
              }
            }
          }
          console.log(`[JobRunner] Built env vars: ${Object.keys(envs).join(", ")}`)

          // 7. Prepare agent type config for sandbox creation
          const agentTypeConfig: AgentTypeConfig = {
            slug: agentTypeDef.slug,
            name: agentTypeDef.name,
            description: agentTypeDef.description ?? "",
            dockerFile: agentTypeDef.dockerFile,
            requiredIntegrations: [...agentTypeDef.requiredIntegrations],
          }

          // 8. Create the sandbox (E2B handles image building/caching internally)
          console.log(`[JobRunner] Creating E2B sandbox...`)
          const instance = yield* sandboxService.create(
            {
              id: agent.id,
              agentTypeSlug: agent.agentTypeSlug,
              image: agent.image ? {
                id: agent.image.id,
                dockerfileHash: agent.image.dockerfileHash,
                deployedImageName: agent.image.deployedImageName,
              } : null,
            },
            agentTypeConfig,
            envs,
            agent.organisationId as OrganisationId
          )
          console.log(`[JobRunner] E2B Sandbox created: id=${instance.id}`)

          // Store the instance for later use
          activeSandboxes.set(jobId, instance)

          // 9. Run resource setup scripts (resources may still need setup inside sandbox)
          for (const resource of agentResources) {
            const templateDef = getResourceTemplate(resource.slug)
            if (!templateDef?.setupScript) continue

            console.log(`[JobRunner] Running setup script for resource: ${resource.slug}`)
            const resourceConfig = resource.config as Record<string, unknown>
            const resourceEnv: Record<string, string> = {
              ...envs,
              RESOURCE_SLUG: resource.slug,
            }

            // Build resource env vars using explicit envVarName from schema
            const schema = templateDef.configJsonSchema as {
              properties?: Record<string, { envVarName?: string }>
            } | undefined

            for (const [key, propSchema] of Object.entries(schema?.properties || {})) {
              const envVarName = propSchema.envVarName
              const value = resourceConfig[key]
              if (envVarName && (typeof value === "string" || typeof value === "number")) {
                resourceEnv[envVarName] = String(value)
              }
            }
            console.log(`[JobRunner] Resource env vars: ${Object.keys(resourceEnv).filter(k => k !== "RESOURCE_SLUG" && !Object.keys(envs).includes(k)).join(", ")}`)

            const resourceResult = yield* sandboxService.runScript(
              instance,
              templateDef.setupScript,
              resourceEnv
            )

            if (resourceResult.exitCode !== 0) {
              console.error(`[JobRunner] Resource setup script for "${resource.slug}" failed: ${resourceResult.stderr}`)
              return yield* Effect.fail(
                new AgentJobError({
                  message: `Resource setup script for "${resource.slug}" failed: ${resourceResult.stderr}`,
                  jobId,
                  status: "failed",
                })
              )
            }
            console.log(`[JobRunner] Resource setup script for "${resource.slug}" completed successfully`)
          }

          // 10. Get the sandbox URL
          const sandboxHost = yield* sandboxService.getHost(instance, 3000)
          const sandboxUrl = `https://${sandboxHost}`
          console.log(`[JobRunner] Sandbox URL: ${sandboxUrl}`)

          // 11. Update job status in database
          yield* dataStore.agentJobs.updateStatus(jobId, {
            status: "RUNNING",
            sandboxUrl,
            startedAt: new Date(),
          })
          console.log(`[JobRunner] Job status updated to RUNNING`)

          console.log(`[JobRunner] Job ${jobId} started successfully, sandbox URL: ${sandboxUrl}`)
          return sandboxUrl
        }),

      /**
       * Get current job status and output
       */
      getStatus: (jobId: AgentJobId): Effect.Effect<JobStatus, JobRunnerError> =>
        Effect.gen(function* () {
          const job = (yield* dataStore.agentJobs.findById(jobId)) as AgentJob

          return {
            jobId,
            status: job.status.toLowerCase() as JobStatus["status"],
            sandboxUrl: job.sandboxUrl,
            output: [], // Would be populated from streaming logs
            errors: [],
            startedAt: job.startedAt,
            completedAt: job.completedAt,
          }
        }),

      /**
       * Stop a running job and cleanup sandbox
       */
      stopJob: (jobId: AgentJobId): Effect.Effect<void, JobRunnerError> =>
        Effect.gen(function* () {
          const instance = activeSandboxes.get(jobId)

          if (instance) {
            // Stop the sandbox
            yield* sandboxService.stop(instance)
            activeSandboxes.delete(jobId)
          }

          // Update job status in database
          yield* dataStore.agentJobs.updateStatus(jobId, {
            status: "CANCELLED",
            completedAt: new Date(),
          })
        }),

      /**
       * Mark a job as completed
       */
      completeJob: (
        jobId: AgentJobId,
        success: boolean
      ): Effect.Effect<void, JobRunnerError> =>
        Effect.gen(function* () {
          const instance = activeSandboxes.get(jobId)

          if (instance) {
            // Stop the sandbox
            yield* sandboxService.stop(instance)
            activeSandboxes.delete(jobId)
          }

          // Update job status in database
          yield* dataStore.agentJobs.updateStatus(jobId, {
            status: success ? "COMPLETED" : "FAILED",
            completedAt: new Date(),
          })
        }),

      /**
       * Get active sandbox instance for a job (for direct access if needed)
       */
      getSandboxInstance: (jobId: AgentJobId): SandboxInstance | undefined =>
        activeSandboxes.get(jobId),
    }
  }),
  dependencies: [SandboxService.Default, DataStore.Default],
}) { }

// ============================================================================
// Layer Export
// ============================================================================

export const JobRunnerLive: Layer.Layer<JobRunner, never, SandboxService | DataStore> =
  JobRunner.Default
