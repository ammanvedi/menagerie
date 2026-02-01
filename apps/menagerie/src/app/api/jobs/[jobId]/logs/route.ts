import { Effect } from "effect"
import { NextRequest } from "next/server"
import { getAuthUser, getParams } from "@/lib/api"
import { DataStore, JobRunner } from "@/lib/services"
import { PermissionError, NotFoundError } from "@/lib/errors"
import type { OrganisationId, AgentJobId, AgentId, UserId } from "@/lib/schemas"
import type { AgentJob, Agent, OrganisationMember } from "@prisma/client"

type RouteParams = { params: Promise<{ jobId: string }> }

// GET /api/jobs/[jobId]/logs - Stream job logs
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    return { job, agent }
  }).pipe(Effect.provide(DataStore.Default))

  const result = await Effect.runPromiseExit(effect)

  if (result._tag === "Failure") {
    return new Response(JSON.stringify({ error: "Failed to get job" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { job } = result.value

  // Return a streaming response with Server-Sent Events
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Get the job runner to access logs
        const jobRunner = await Effect.runPromise(
          JobRunner.pipe(Effect.provide(JobRunner.Default))
        )

        const status = await Effect.runPromise(
          jobRunner.getStatus(job.id as AgentJobId).pipe(
            Effect.provide(JobRunner.Default)
          )
        )

        // Send initial status
        sendEvent("status", status)

        // If job is complete, close the stream
        if (job.status === "COMPLETED" || job.status === "FAILED") {
          sendEvent("complete", { status: job.status })
          controller.close()
          return
        }

        // For running jobs, we would poll or use a subscription mechanism
        // For now, just send what we have and close
        sendEvent("logs", { message: "Job is running..." })
        controller.close()
      } catch (error) {
        sendEvent("error", { message: String(error) })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
