import { Data } from "effect"

// ============================================================================
// Base Error Classes
// ============================================================================

/**
 * Base error for all database operations
 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Error when a requested entity is not found
 */
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly entity: string
  readonly id: string
}> {}

/**
 * Error when an operation violates a unique constraint
 */
export class DuplicateError extends Data.TaggedError("DuplicateError")<{
  readonly entity: string
  readonly field: string
  readonly value: string
}> {}

/**
 * Error when validation fails
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string
  readonly field?: string
}> {}

/**
 * Error when user lacks permission for an operation
 */
export class PermissionError extends Data.TaggedError("PermissionError")<{
  readonly message: string
  readonly requiredRole?: string
}> {}

// ============================================================================
// Domain-specific Errors
// ============================================================================

/**
 * Error related to organisation operations
 */
export class OrganisationError extends Data.TaggedError("OrganisationError")<{
  readonly message: string
  readonly organisationId?: string
}> {}

/**
 * Error related to agent operations
 */
export class AgentError extends Data.TaggedError("AgentError")<{
  readonly message: string
  readonly agentId?: string
}> {}

/**
 * Error related to agent job operations
 */
export class AgentJobError extends Data.TaggedError("AgentJobError")<{
  readonly message: string
  readonly jobId?: string
  readonly status?: string
}> {}

// ============================================================================
// Sandbox Errors
// ============================================================================

/**
 * Error when sandbox creation fails
 */
export class SandboxCreationError extends Data.TaggedError("SandboxCreationError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Error when a sandbox command execution fails
 */
export class SandboxCommandError extends Data.TaggedError("SandboxCommandError")<{
  readonly message: string
  readonly command: string
  readonly exitCode?: number
  readonly stderr?: string
  readonly cause?: unknown
}> {}

/**
 * Error when sandbox file operations fail
 */
export class SandboxFileError extends Data.TaggedError("SandboxFileError")<{
  readonly message: string
  readonly path: string
  readonly operation: "read" | "write"
  readonly cause?: unknown
}> {}

/**
 * Error when sandbox connection/communication fails
 */
export class SandboxConnectionError extends Data.TaggedError("SandboxConnectionError")<{
  readonly message: string
  readonly sandboxId?: string
  readonly cause?: unknown
}> {}

/**
 * General sandbox error for other sandbox-related issues
 */
export class SandboxError extends Data.TaggedError("SandboxError")<{
  readonly message: string
  readonly sandboxId?: string
  readonly cause?: unknown
}> {}
