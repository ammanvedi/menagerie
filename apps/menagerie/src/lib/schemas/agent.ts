import { Schema } from "effect"
import { AgentId, OrganisationId, ResourceId, Slug, CreatedAt, UpdatedAt, JsonValue } from "./common"

// ============================================================================
// Agent Avatar Types
// ============================================================================

export const AvatarType = Schema.Literal("robot", "animal", "abstract", "custom")
export type AvatarType = typeof AvatarType.Type

// ============================================================================
// Agent Schema
// ============================================================================

export const Agent = Schema.Struct({
  id: AgentId,
  slug: Slug,
  name: Schema.NonEmptyString,
  avatarType: Schema.NullOr(Schema.String),
  organisationId: OrganisationId,
  modelId: Schema.NonEmptyString,
  modelConfig: Schema.NullOr(JsonValue),
  resourceIds: Schema.Array(ResourceId),
  createdAt: CreatedAt,
  updatedAt: UpdatedAt,
})
export type Agent = typeof Agent.Type

/**
 * Schema for creating a new agent
 */
export const CreateAgent = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  avatarType: Schema.optional(Schema.String),
  organisationId: OrganisationId,
  modelId: Schema.NonEmptyString,
  modelConfig: Schema.optional(JsonValue),
  resourceIds: Schema.optional(Schema.Array(ResourceId)),
})
export type CreateAgent = typeof CreateAgent.Type

/**
 * Schema for updating an agent
 */
export const UpdateAgent = Schema.Struct({
  name: Schema.optional(Schema.NonEmptyString),
  avatarType: Schema.optional(Schema.NullOr(Schema.String)),
  modelId: Schema.optional(Schema.NonEmptyString),
  modelConfig: Schema.optional(Schema.NullOr(JsonValue)),
  resourceIds: Schema.optional(Schema.Array(ResourceId)),
})
export type UpdateAgent = typeof UpdateAgent.Type

// ============================================================================
// Model Configuration Schema
// ============================================================================

/**
 * Base model configuration
 */
export const ModelConfig = Schema.Struct({
  temperature: Schema.optional(Schema.Number.pipe(Schema.between(0, 2))),
  maxTokens: Schema.optional(Schema.Number.pipe(Schema.positive())),
  systemPrompt: Schema.optional(Schema.String),
})
export type ModelConfig = typeof ModelConfig.Type
