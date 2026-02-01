import { Effect, Exit, Cause, Option } from "effect"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  NotFoundError,
  PermissionError,
  ValidationError,
  DatabaseError,
  DuplicateError,
  SandboxError,
  SandboxCreationError,
  SandboxCommandError,
  AgentJobError,
} from "@/lib/errors"

// ============================================================================
// Types
// ============================================================================

export interface ApiError {
  error: string
  field?: string
  details?: unknown
}

export interface AuthUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

// ============================================================================
// Error to Response Mapping
// ============================================================================

/**
 * Convert an Effect error to an appropriate HTTP response
 */
const errorToResponse = (cause: Cause.Cause<unknown>): NextResponse<ApiError> => {
  // Extract the error from the cause
  const failureOpt = Cause.failureOption(cause)
  const error = Option.isSome(failureOpt) ? failureOpt.value : null

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: `${error.entity} not found`, details: { id: error.id } },
      { status: 404 }
    )
  }

  if (error instanceof PermissionError) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    )
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, field: error.field },
      { status: 400 }
    )
  }

  if (error instanceof DuplicateError) {
    return NextResponse.json(
      { error: `${error.entity} with ${error.field} already exists` },
      { status: 409 }
    )
  }

  if (error instanceof DatabaseError) {
    console.error("Database error:", error.cause)
    return NextResponse.json(
      { error: "Database error occurred" },
      { status: 500 }
    )
  }

  if (error instanceof AgentJobError) {
    return NextResponse.json(
      { error: error.message, details: { jobId: error.jobId, status: error.status } },
      { status: 400 }
    )
  }

  if (error instanceof SandboxCreationError || error instanceof SandboxCommandError || error instanceof SandboxError) {
    console.error("Sandbox error:", error.cause)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  // Default error
  console.error("Unhandled error:", cause)
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  )
}

// ============================================================================
// Effect Runner
// ============================================================================

/**
 * Run an Effect and return a NextResponse
 * Automatically converts errors to appropriate HTTP responses
 */
export const runEffect = async <A, E>(
  effect: Effect.Effect<A, E>
): Promise<NextResponse> => {
  const exit = await Effect.runPromiseExit(effect)

  if (Exit.isSuccess(exit)) {
    return NextResponse.json(exit.value)
  }

  return errorToResponse(exit.cause)
}

/**
 * Run an Effect that returns void/undefined and return a 204 No Content on success
 */
export const runEffectNoContent = async <E>(
  effect: Effect.Effect<void, E>
): Promise<NextResponse> => {
  const exit = await Effect.runPromiseExit(effect)

  if (Exit.isSuccess(exit)) {
    return new NextResponse(null, { status: 204 })
  }

  return errorToResponse(exit.cause)
}

/**
 * Run an Effect and return a 201 Created on success
 */
export const runEffectCreated = async <A, E>(
  effect: Effect.Effect<A, E>
): Promise<NextResponse> => {
  const exit = await Effect.runPromiseExit(effect)

  if (Exit.isSuccess(exit)) {
    return NextResponse.json(exit.value, { status: 201 })
  }

  return errorToResponse(exit.cause)
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Effect that gets the authenticated user from the session
 * Fails with PermissionError if not authenticated
 */
export const getAuthUser: Effect.Effect<AuthUser, PermissionError> = Effect.tryPromise({
  try: async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      throw new Error("No session")
    }
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    }
  },
  catch: () => new PermissionError({ message: "Unauthorized" }),
})

// ============================================================================
// Request Parsing
// ============================================================================

/**
 * Parse JSON body from request, failing with ValidationError if invalid
 */
export const parseJsonBody = <T>(
  request: Request
): Effect.Effect<T, ValidationError> =>
  Effect.tryPromise({
    try: async () => {
      const body = await request.json()
      return body as T
    },
    catch: () => new ValidationError({ message: "Invalid JSON body" }),
  })

/**
 * Get path parameters from Next.js params promise
 */
export const getParams = <T extends Record<string, string>>(
  params: Promise<T>
): Effect.Effect<T, never> => Effect.promise(() => params)
