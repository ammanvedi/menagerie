import { Schema } from "effect"
import { ResourceId, OrganisationId, AgentId, Slug, CreatedAt, UpdatedAt, JsonValue } from "./common"

// ============================================================================
// Resource Schema
// ============================================================================

export const Resource = Schema.Struct({
  id: ResourceId,
  slug: Slug,
  name: Schema.NonEmptyString,
  organisationId: OrganisationId,
  config: JsonValue,
  agentIds: Schema.Array(AgentId),
  createdAt: CreatedAt,
  updatedAt: UpdatedAt,
})
export type Resource = typeof Resource.Type

/**
 * Schema for creating a new resource
 */
export const CreateResource = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  organisationId: OrganisationId,
  config: JsonValue,
})
export type CreateResource = typeof CreateResource.Type

/**
 * Schema for updating a resource
 */
export const UpdateResource = Schema.Struct({
  name: Schema.optional(Schema.NonEmptyString),
  config: Schema.optional(JsonValue),
})
export type UpdateResource = typeof UpdateResource.Type

// ============================================================================
// Known Resource Types (for type-safe config)
// ============================================================================

/**
 * GitHub repository resource config schema
 */
export const GitHubRepoConfig = Schema.Struct({
  type: Schema.Literal("github-repo"),
  owner: Schema.NonEmptyString,
  repo: Schema.NonEmptyString,
  branch: Schema.optional(Schema.String),
})
export type GitHubRepoConfig = typeof GitHubRepoConfig.Type

/**
 * Union of all known resource configs
 */
export const KnownResourceConfig = Schema.Union(GitHubRepoConfig)
export type KnownResourceConfig = typeof KnownResourceConfig.Type
