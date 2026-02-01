import { Effect } from "effect"
import { JobRunner } from "@/lib/services"
import type { AgentJobId } from "@/lib/schemas"

/**
 * Workflow to run an agent job.
 * 
 * This is a durable workflow that will be executed by Vercel Workflows.
 * It survives beyond the lifetime of the original HTTP request and
 * will be automatically retried on failure.
 * 
 * @param jobId - The ID of the agent job to start
 */
export async function runAgentJob(jobId: string) {
  "use workflow"

  await startAgentJobStep(jobId)
}

/**
 * Step to start an agent job.
 * 
 * This step wraps the Effect-based JobRunner.startJob() method
 * and executes it within the Vercel Workflow step context.
 */
async function startAgentJobStep(jobId: string) {
  "use step"

  console.log(`[Workflow Step] Starting agent job: ${jobId}`)

  const effect = Effect.gen(function* () {
    const jobRunner = yield* JobRunner
    const sandboxUrl = yield* jobRunner.startJob(jobId as AgentJobId)
    return sandboxUrl
  }).pipe(Effect.provide(JobRunner.Default))

  const sandboxUrl = await Effect.runPromise(effect)
  
  console.log(`[Workflow Step] Agent job ${jobId} started, sandbox URL: ${sandboxUrl}`)
  
  return sandboxUrl
}
