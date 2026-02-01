import { Schema } from "effect"

// ============================================================================
// Sandbox Runtime
// ============================================================================

/**
 * Available sandbox runtime environments
 */
export const SandboxRuntime = Schema.Literal("node24", "node22", "python3.13")
export type SandboxRuntime = typeof SandboxRuntime.Type

// ============================================================================
// Sandbox Configuration
// ============================================================================

/**
 * Git source configuration for sandbox initialization
 */
export const GitSource = Schema.Struct({
  type: Schema.Literal("git"),
  url: Schema.String,
  username: Schema.optional(Schema.String),
  password: Schema.optional(Schema.String),
})
export type GitSource = typeof GitSource.Type

/**
 * Configuration for creating a new sandbox
 */
export const SandboxConfig = Schema.Struct({
  /** Runtime environment */
  runtime: Schema.optional(SandboxRuntime),
  
  /** Timeout duration in milliseconds */
  timeoutMs: Schema.optional(Schema.Number),
  
  /** Ports to expose */
  ports: Schema.optional(Schema.Array(Schema.Number)),
  
  /** Git source to clone */
  source: Schema.optional(GitSource),
  
  /** Number of vCPUs to allocate */
  vcpus: Schema.optional(Schema.Number),
})
export type SandboxConfig = typeof SandboxConfig.Type

// ============================================================================
// Command Result
// ============================================================================

/**
 * Result of executing a command in the sandbox
 */
export const CommandResult = Schema.Struct({
  /** Exit code of the command (0 = success) */
  exitCode: Schema.Number,
  
  /** Standard output */
  stdout: Schema.String,
  
  /** Standard error output */
  stderr: Schema.String,
})
export type CommandResult = typeof CommandResult.Type

// ============================================================================
// Sandbox Status
// ============================================================================

/**
 * Current status of a sandbox
 */
export const SandboxStatus = Schema.Literal(
  "creating",
  "running",
  "stopping",
  "stopped",
  "error"
)
export type SandboxStatus = typeof SandboxStatus.Type

// ============================================================================
// Sandbox Instance Info
// ============================================================================

/**
 * Information about a running sandbox instance
 */
export const SandboxInfo = Schema.Struct({
  /** Unique sandbox identifier */
  id: Schema.String,
  
  /** Current status */
  status: SandboxStatus,
  
  /** Public URL for accessing the sandbox (if ports are exposed) */
  url: Schema.NullOr(Schema.String),
  
  /** Runtime environment */
  runtime: SandboxRuntime,
  
  /** When the sandbox was created */
  createdAt: Schema.Date,
})
export type SandboxInfo = typeof SandboxInfo.Type

// ============================================================================
// Command Options
// ============================================================================

/**
 * Options for running a command in the sandbox
 */
export const CommandOptions = Schema.Struct({
  /** Working directory */
  cwd: Schema.optional(Schema.String),
  
  /** Environment variables */
  env: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  
  /** Run with sudo */
  sudo: Schema.optional(Schema.Boolean),
  
  /** Run in detached mode (don't wait for completion) */
  detached: Schema.optional(Schema.Boolean),
})
export type CommandOptions = typeof CommandOptions.Type
