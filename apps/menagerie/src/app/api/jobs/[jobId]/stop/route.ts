import { Effect } from "effect"
import { NextRequest } from "next/server"
import { runEffect, getAuthUser, getParams } from "@/lib/api"
import { DataStore, JobRunner } from "@/lib/services"
import { PermissionError, NotFoundError } from "@/lib/errors"
import type { OrganisationId, AgentJobId, AgentId, UserId } from "@/lib/schemas"
import type { AgentJob, Agent, OrganisationMember } from "@prisma/client"

type RouteParams = { params: Promise<{ jobId: string }> }

// POST /api/jobs/[jobId]/stop - Stop a running job
export async function POST(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { jobId } = yield* getParams(params)
    const dataStore = yield* DataStore

    const job = (yield* dataStore.agentJobs.findById(jobId as AgentJobId)) as AgentJob

    if (!job) {
      return yield* Effect.fail(new NotFoundError({ entity: "Job", id: jobId }))
    }

    // Get the agent to verify organisation membership
    const agent = (yield* dataStore.agents.findById(job.agentId as AgentId)) as Agent

    if (!agent) {
      return yield* Effect.fail(new NotFoundError({ entity: "Agent", id: job.agentId }))
    }

    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      agent.organisationId as OrganisationId
    )) as OrganisationMember | null

    if (!membership) {
      return yield* Effect.fail(new PermissionError({ message: "Not a member of this organisation" }))
    }

    // Stop the job
    const jobRunner = yield* JobRunner
    yield* jobRunner.stopJob(jobId as AgentJobId)

    // Return updated job
    const updatedJob = yield* dataStore.agentJobs.findById(jobId as AgentJobId)

    return updatedJob
  }).pipe(
    Effect.provide(DataStore.Default),
    Effect.provide(JobRunner.Default)
  )

  return runEffect(effect)
}
