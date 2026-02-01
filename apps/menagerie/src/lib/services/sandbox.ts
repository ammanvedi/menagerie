import { Effect, Layer } from "effect"
import { Sandbox as E2BSandbox } from "e2b"
import crypto from "crypto"
import { DataStore } from "./datastore"
import {
  SandboxCreationError,
  SandboxCommandError,
  SandboxFileError,
  SandboxError,
  DatabaseError,
  DuplicateError,
} from "../errors"
import type { CommandResult, OrganisationId } from "../schemas"
import type { Integration } from "@prisma/client"
import type { AgentId } from "../schemas"

// ============================================================================
// Types
// ============================================================================

/**
 * Agent type configuration from YAML
 */
export interface AgentTypeConfig {
  slug: string
  name: string
  description: string
  dockerFile: string
  requiredIntegrations: string[]
}

/**
 * Agent record with optional Image relation
 */
export interface AgentWithImage {
  id: string
  agentTypeSlug: string
  image: {
    id: string
    dockerfileHash: string
    deployedImageName: string | null
  } | null
}

/**
 * A wrapped E2B Sandbox instance
 */
export interface SandboxInstance {
  /** The underlying E2B Sandbox */
  readonly sandbox: E2BSandbox
  /** Unique sandbox identifier */
  readonly id: string
  /** When this instance was created */
  readonly createdAt: Date
}

/**
 * Options for running a command
 */
export interface RunCommandOptions {
  /** Working directory */
  cwd?: string
  /** Environment variables */
  env?: Record<string, string>
  /** Timeout in milliseconds */
  timeoutMs?: number
}

/**
 * File to write to sandbox
 */
export interface SandboxFile {
  path: string
  content: string
}

// ============================================================================
// SandboxService
// ============================================================================

export class SandboxService extends Effect.Service<SandboxService>()("SandboxService", {
  effect: Effect.gen(function* () {
    const dataStore = yield* DataStore

    /**
     * Extract E2B API key from integrations array
     */
    const extractE2BApiKey = (integrations: Integration[]): string | undefined => {
      const e2bIntegration = integrations.find((i) => i.slug === "e2b")
      if (!e2bIntegration) {
        console.log(`[Sandbox] No E2B integration found in provided integrations`)
        return undefined
      }

      const config = e2bIntegration.config as { apiKey?: string } | null
      if (!config || !config.apiKey) {
        console.warn(`[Sandbox] E2B integration found but missing apiKey`)
        return undefined
      }

      console.log(`[Sandbox] E2B API key extracted`)
      return config.apiKey
    }

    /**
     * Build an E2B template from a dockerfile
     */
    const buildTemplate = async (
      agentTypeConfig: AgentTypeConfig,
      apiKey: string
    ): Promise<string> => {
      console.log(`[Sandbox] Building E2B template for agent type: ${agentTypeConfig.slug}`)

      // Use E2B SDK to build template from dockerfile
      // The template alias will be menagerie-{agentTypeSlug}
      const templateAlias = `menagerie-${agentTypeConfig.slug}`

      // Note: E2B template building is done via their CLI or API
      // For now, we assume the template is built externally and we use the alias
      // In production, you would use the E2B SDK's template building capabilities
      // 
      // Example with E2B SDK (requires API access):
      // const template = await Template.build({
      //   dockerfile: agentTypeConfig.dockerFile,
      //   alias: templateAlias,
      // })

      console.log(`[Sandbox] Template alias: ${templateAlias}`)
      return templateAlias
    }

    return {
      /**
       * Create a new sandbox instance for an agent
       * @param agent - The agent record (with optional Image relation)
       * @param agentTypeConfig - The agent type config from YAML (with dockerFile)
       * @param envs - Environment variables to inject
       * @param organisationId - Organisation ID for fetching integrations
       */
      create: (
        agent: AgentWithImage,
        agentTypeConfig: AgentTypeConfig,
        envs: Record<string, string>,
        organisationId: OrganisationId
      ): Effect.Effect<SandboxInstance, SandboxCreationError | DatabaseError | DuplicateError> =>
        Effect.gen(function* () {
          // Fetch integrations from database to get E2B API key
          const integrations = (yield* dataStore.integrations.listByOrganisation(organisationId)) as Integration[]
          console.log(`[Sandbox] Fetched ${integrations.length} integrations for org ${organisationId}`)

          const apiKey = extractE2BApiKey(integrations)
          if (!apiKey) {
            return yield* Effect.fail(new SandboxCreationError({
              message: "E2B integration not configured. Please add E2B API key in integrations.",
            }))
          }

          // Hash incoming dockerfile
          const incomingHash = crypto.createHash("sha256")
            .update(agentTypeConfig.dockerFile)
            .digest("hex")

          let deployedImageName: string | null = null

          // Check if agent's current image matches the dockerfile
          if (agent.image?.dockerfileHash === incomingHash && agent.image.deployedImageName) {
            // Use cached image
            console.log(`[Sandbox] Using cached image: ${agent.image.deployedImageName}`)
            deployedImageName = agent.image.deployedImageName
          } else {
            // Check if an Image with this hash already exists (shared by other agents)
            const existingImage = (yield* dataStore.images.findByHash(incomingHash)) as {
              id: string
              dockerfileHash: string
              deployedImageName: string | null
            } | null

            if (existingImage?.deployedImageName) {
              // Image exists and is deployed - link agent to it
              console.log(`[Sandbox] Found existing deployed image: ${existingImage.deployedImageName}`)
              deployedImageName = existingImage.deployedImageName

              // Link agent to the existing image
              yield* dataStore.agents.update(agent.id as AgentId, { imageId: existingImage.id })
            } else {
              // Build new E2B template
              console.log(`[Sandbox] Building new E2B template...`)
              deployedImageName = yield* Effect.tryPromise({
                try: () => buildTemplate(agentTypeConfig, apiKey),
                catch: (error) => new SandboxCreationError({
                  message: `Failed to build E2B template: ${error instanceof Error ? error.message : String(error)}`,
                  cause: error,
                }),
              })

              // Create or update Image record
              const image = (yield* dataStore.images.upsertByHash(incomingHash, {
                dockerfile: agentTypeConfig.dockerFile,
                dockerfileHash: incomingHash,
                deployedImageName,
              })) as { id: string }

              // Link agent to the image
              yield* dataStore.agents.update(agent.id as AgentId, { imageId: image.id })
            }
          }

          if (!deployedImageName) {
            return yield* Effect.fail(new SandboxCreationError({
              message: "Failed to determine deployed image name",
            }))
          }

          // Create sandbox with the deployed image
          const instance = yield* Effect.tryPromise({
            try: async () => {
              console.log(`[Sandbox] Creating E2B sandbox with template: ${deployedImageName}`)

              const sandbox = await E2BSandbox.create(deployedImageName!, {
                apiKey,
                envs,
              })

              const sandboxId = sandbox.sandboxId

              console.log(`[Sandbox] E2B Sandbox created successfully: ${sandboxId}`)

              return {
                sandbox,
                id: sandboxId,
                createdAt: new Date(),
              }
            },
            catch: (error) => {
              const errorMessage = error instanceof Error ? error.message : String(error)
              console.error(`[Sandbox] Failed to create E2B sandbox: ${errorMessage}`, error)
              return new SandboxCreationError({
                message: `Failed to create E2B sandbox: ${errorMessage}`,
                cause: error,
              })
            },
          })

          return instance
        }),

      /**
       * Run a command in the sandbox
       */
      runCommand: (
        instance: SandboxInstance,
        cmd: string,
        args: string[] = [],
        options: RunCommandOptions = {}
      ): Effect.Effect<CommandResult, SandboxCommandError> =>
        Effect.tryPromise({
          try: async () => {
            const fullCommand = args.length > 0 ? `${cmd} ${args.join(" ")}` : cmd

            const result = await instance.sandbox.commands.run(fullCommand, {
              cwd: options.cwd,
              envs: options.env,
              timeoutMs: options.timeoutMs,
            })

            return {
              exitCode: result.exitCode,
              stdout: result.stdout,
              stderr: result.stderr,
            }
          },
          catch: (error) =>
            new SandboxCommandError({
              message: `Failed to run command: ${cmd}`,
              command: `${cmd} ${args.join(" ")}`,
              cause: error,
            }),
        }),

      /**
       * Run a shell script in the sandbox
       */
      runScript: (
        instance: SandboxInstance,
        script: string,
        env: Record<string, string> = {}
      ): Effect.Effect<CommandResult, SandboxCommandError> =>
        Effect.tryPromise({
          try: async () => {
            // Write script to a temp file and execute it
            const scriptPath = "/tmp/menagerie-setup-script.sh"
            await instance.sandbox.files.write(scriptPath, script)

            const result = await instance.sandbox.commands.run(`bash ${scriptPath}`, {
              envs: env,
            })

            return {
              exitCode: result.exitCode,
              stdout: result.stdout,
              stderr: result.stderr,
            }
          },
          catch: (error) =>
            new SandboxCommandError({
              message: "Failed to run script",
              command: "bash script",
              cause: error,
            }),
        }),

      /**
       * Write a single file to the sandbox
       */
      writeFile: (
        instance: SandboxInstance,
        path: string,
        content: string
      ): Effect.Effect<void, SandboxFileError> =>
        Effect.tryPromise({
          try: async () => {
            await instance.sandbox.files.write(path, content)
          },
          catch: (error) =>
            new SandboxFileError({
              message: `Failed to write file: ${path}`,
              path,
              operation: "write",
              cause: error,
            }),
        }),

      /**
       * Write multiple files to the sandbox
       */
      writeFiles: (
        instance: SandboxInstance,
        files: SandboxFile[]
      ): Effect.Effect<void, SandboxFileError> =>
        Effect.tryPromise({
          try: async () => {
            for (const file of files) {
              await instance.sandbox.files.write(file.path, file.content)
            }
          },
          catch: (error) =>
            new SandboxFileError({
              message: "Failed to write files",
              path: files.map((f) => f.path).join(", "),
              operation: "write",
              cause: error,
            }),
        }),

      /**
       * Read a file from the sandbox
       */
      readFile: (
        instance: SandboxInstance,
        path: string
      ): Effect.Effect<string | null, SandboxFileError> =>
        Effect.tryPromise({
          try: async () => {
            const content = await instance.sandbox.files.read(path)
            return content
          },
          catch: (error) =>
            new SandboxFileError({
              message: `Failed to read file: ${path}`,
              path,
              operation: "read",
              cause: error,
            }),
        }),

      /**
       * Get the sandbox host URL
       */
      getHost: (
        instance: SandboxInstance,
        port: number
      ): Effect.Effect<string, SandboxError> =>
        Effect.try({
          try: () => instance.sandbox.getHost(port),
          catch: (error) =>
            new SandboxError({
              message: `Failed to get host for port ${port}`,
              sandboxId: instance.id,
              cause: error,
            }),
        }),

      /**
       * Stop the sandbox
       */
      stop: (instance: SandboxInstance): Effect.Effect<void, SandboxError> =>
        Effect.tryPromise({
          try: async () => {
            await instance.sandbox.kill()
          },
          catch: (error) =>
            new SandboxError({
              message: "Failed to stop sandbox",
              sandboxId: instance.id,
              cause: error,
            }),
        }),
    }
  }),
  dependencies: [DataStore.Default],
}) { }

// ============================================================================
// Layer Export
// ============================================================================

export const SandboxServiceLive: Layer.Layer<SandboxService, never, DataStore> = SandboxService.Default
