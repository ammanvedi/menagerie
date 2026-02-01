import { Schema } from "effect"
import { AgentJobId, AgentId, CreatedAt, UpdatedAt } from "./common"

// ============================================================================
// Agent Job Status Enum
// ============================================================================

export const AgentJobStatus = Schema.Literal(
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
)
export type AgentJobStatus = typeof AgentJobStatus.Type

// ============================================================================
// Agent Job Schema
// ============================================================================

export const AgentJob = Schema.Struct({
  id: AgentJobId,
  agentId: AgentId,
  initialPrompt: Schema.NonEmptyString,
  status: AgentJobStatus,
  sandboxUrl: Schema.NullOr(Schema.String),
  createdAt: CreatedAt,
  startedAt: Schema.NullOr(Schema.Date),
  completedAt: Schema.NullOr(Schema.Date),
  updatedAt: UpdatedAt,
})
export type AgentJob = typeof AgentJob.Type

/**
 * Schema for creating a new agent job
 */
export const CreateAgentJob = Schema.Struct({
  agentId: AgentId,
  initialPrompt: Schema.NonEmptyString,
})
export type CreateAgentJob = typeof CreateAgentJob.Type

/**
 * Schema for updating an agent job status
 */
export const UpdateAgentJobStatus = Schema.Struct({
  status: AgentJobStatus,
  sandboxUrl: Schema.optional(Schema.NullOr(Schema.String)),
  startedAt: Schema.optional(Schema.NullOr(Schema.Date)),
  completedAt: Schema.optional(Schema.NullOr(Schema.Date)),
})
export type UpdateAgentJobStatus = typeof UpdateAgentJobStatus.Type
