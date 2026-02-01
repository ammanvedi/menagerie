import { Effect } from "effect"
import { start } from "workflow/api"

// ============================================================================
// Errors
// ============================================================================

export class BackgroundJobError extends Error {
  readonly _tag = "BackgroundJobError"

  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = "BackgroundJobError"
  }
}

// ============================================================================
// BackgroundJob Service
// ============================================================================

/**
 * BackgroundJob service wraps Vercel Workflow's start() function
 * for clean integration with the Effect ecosystem.
 * 
 * Use this to start durable, retryable background workflows that
 * survive beyond the lifetime of the original HTTP request.
 */
export class BackgroundJob extends Effect.Service<BackgroundJob>()("BackgroundJob", {
  effect: Effect.succeed({
    /**
     * Start a workflow in the background.
     * 
     * The workflow will be executed durably by Vercel Workflows,
     * with automatic retries and observability.
     * 
     * @param workflow - The workflow function to execute
     * @param args - Arguments to pass to the workflow
     * @returns Effect that resolves when the workflow is enqueued
     */
    start: <Args extends unknown[]>(
      workflow: (...args: Args) => Promise<unknown>,
      args: Args
    ): Effect.Effect<void, BackgroundJobError> =>
      Effect.tryPromise({
        try: () => start(workflow, args),
        catch: (error) =>
          new BackgroundJobError(
            `Failed to start background job: ${error}`,
            error
          ),
      }),
  }),
}) { }

// ============================================================================
// Layer Export
// ============================================================================

export const BackgroundJobLive = BackgroundJob.Default
