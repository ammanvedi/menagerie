import { Effect, Schema } from "effect"
import { NextRequest } from "next/server"
import { runEffect, runEffectCreated, getAuthUser, parseJsonBody, getParams } from "@/lib/api"
import { DataStore, BackgroundJob } from "@/lib/services"
import { PermissionError, ValidationError, NotFoundError } from "@/lib/errors"
import type { Slug, OrganisationId, AgentId, UserId } from "@/lib/schemas"
import type { Organisation, OrganisationMember, Agent, AgentJob } from "@prisma/client"
import { runAgentJob } from "@/workflows/start-job"

type RouteParams = { params: Promise<{ slug: string; agentSlug: string }> }

// GET /api/orgs/[slug]/agents/[agentSlug]/jobs - List jobs for agent
export async function GET(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug, agentSlug } = yield* getParams(params)
    const dataStore = yield* DataStore

    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership) {
      return yield* Effect.fail(new PermissionError({ message: "Not a member of this organisation" }))
    }

    const agent = (yield* dataStore.agents.findByOrgAndSlug(
      org.id as OrganisationId,
      agentSlug as Slug
    )) as Agent | null

    if (!agent) {
      return yield* Effect.fail(new NotFoundError({ entity: "Agent", id: agentSlug }))
    }

    const jobs = yield* dataStore.agentJobs.listByAgent(agent.id as AgentId)
    return jobs
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// POST /api/orgs/[slug]/agents/[agentSlug]/jobs - Create and start a new job
export async function POST(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug, agentSlug } = yield* getParams(params)
    const body = yield* parseJsonBody(request)
    const dataStore = yield* DataStore

    const data = yield* Schema.decodeUnknown(
      Schema.Struct({
        prompt: Schema.String,
      })
    )(body).pipe(
      Effect.mapError(() => new ValidationError({ message: "Invalid request body" }))
    )

    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership) {
      return yield* Effect.fail(new PermissionError({ message: "Not a member of this organisation" }))
    }

    const agent = (yield* dataStore.agents.findByOrgAndSlug(
      org.id as OrganisationId,
      agentSlug as Slug
    )) as Agent | null

    if (!agent) {
      return yield* Effect.fail(new NotFoundError({ entity: "Agent", id: agentSlug }))
    }

    // Create the job record
    const job = (yield* dataStore.agentJobs.create({
      agentId: agent.id,
      initialPrompt: data.prompt,
    })) as AgentJob

    // Start the job asynchronously using Vercel Workflows
    const backgroundJob = yield* BackgroundJob
    yield* Effect.logInfo(`[API] Starting background job for job ID: ${job.id}`)
    yield* backgroundJob.start(runAgentJob, [job.id])

    return job
  }).pipe(
    Effect.provide(DataStore.Default),
    Effect.provide(BackgroundJob.Default)
  )

  return runEffectCreated(effect)
}
