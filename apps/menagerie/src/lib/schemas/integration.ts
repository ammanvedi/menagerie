import { Schema } from "effect"
import { IntegrationId, OrganisationId, Slug, CreatedAt, UpdatedAt, JsonValue } from "./common"

// ============================================================================
// Integration Schema
// ============================================================================

export const Integration = Schema.Struct({
  id: IntegrationId,
  slug: Slug,
  name: Schema.NonEmptyString,
  organisationId: OrganisationId,
  config: JsonValue,
  createdAt: CreatedAt,
  updatedAt: UpdatedAt,
})
export type Integration = typeof Integration.Type

/**
 * Schema for creating a new integration
 */
export const CreateIntegration = Schema.Struct({
  slug: Slug,
  name: Schema.NonEmptyString,
  organisationId: OrganisationId,
  config: JsonValue,
})
export type CreateIntegration = typeof CreateIntegration.Type

/**
 * Schema for updating an integration
 */
export const UpdateIntegration = Schema.Struct({
  name: Schema.optional(Schema.NonEmptyString),
  config: Schema.optional(JsonValue),
})
export type UpdateIntegration = typeof UpdateIntegration.Type

// ============================================================================
// Known Integration Types (for type-safe config)
// ============================================================================

/**
 * GitHub integration config schema
 */
export const GitHubIntegrationConfig = Schema.Struct({
  type: Schema.Literal("github"),
  accessToken: Schema.String,
})
export type GitHubIntegrationConfig = typeof GitHubIntegrationConfig.Type

/**
 * Anthropic/Claude integration config schema
 */
export const AnthropicIntegrationConfig = Schema.Struct({
  type: Schema.Literal("anthropic"),
  apiKey: Schema.String,
})
export type AnthropicIntegrationConfig = typeof AnthropicIntegrationConfig.Type

/**
 * Union of all known integration configs
 */
export const KnownIntegrationConfig = Schema.Union(
  GitHubIntegrationConfig,
  AnthropicIntegrationConfig
)
export type KnownIntegrationConfig = typeof KnownIntegrationConfig.Type
