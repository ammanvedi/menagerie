import { Schema } from "effect"
import { Slug } from "./common"

// ============================================================================
// JSON Schema Type (for configJsonSchema fields)
// ============================================================================

/**
 * Represents a JSON Schema object for validating configuration
 * This is intentionally loose to allow any valid JSON Schema
 */
export const JsonSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown,
})
export type JsonSchema = typeof JsonSchema.Type

// ============================================================================
// Model Definition Schema
// ============================================================================

/**
 * Defines an AI model that agents can use
 */
export const ModelDefinition = Schema.Struct({
  /** Display name of the model */
  name: Schema.NonEmptyString,

  /** Unique identifier for the model */
  slug: Slug,

  /** JSON Schema for model-specific configuration options */
  configJsonSchema: Schema.optional(JsonSchema),

  /** List of integration slugs required to use this model */
  requiredIntegrations: Schema.Array(Slug),

  /** Setup script to run in the sandbox before using the model */
  setupScript: Schema.optional(Schema.String),
})
export type ModelDefinition = typeof ModelDefinition.Type

// ============================================================================
// Integration Definition Schema
// ============================================================================

/**
 * Defines an external service integration type (GitHub, Anthropic, etc.)
 */
export const IntegrationDefinition = Schema.Struct({
  /** Display name of the integration */
  name: Schema.NonEmptyString,

  /** Unique identifier for the integration */
  slug: Slug,

  /** JSON Schema for integration configuration (API keys, tokens, etc.) */
  configJsonSchema: Schema.optional(JsonSchema),

  /** Description of what this integration provides */
  description: Schema.optional(Schema.String),
})
export type IntegrationDefinition = typeof IntegrationDefinition.Type

// ============================================================================
// Resource Template Definition Schema
// ============================================================================

/**
 * Defines a resource template (GitHub repo, database, etc.)
 */
export const ResourceTemplateDefinition = Schema.Struct({
  /** Display name of the resource template */
  name: Schema.NonEmptyString,

  /** Unique identifier for the resource template */
  slug: Slug,

  /** JSON Schema for resource configuration */
  configJsonSchema: Schema.optional(JsonSchema),

  /** List of integration slugs required to use this resource */
  requiredIntegrations: Schema.Array(Slug),

  /** Setup script to run in the sandbox to initialize the resource */
  setupScript: Schema.optional(Schema.String),

  /** Description of what this resource template provides */
  description: Schema.optional(Schema.String),
})
export type ResourceTemplateDefinition = typeof ResourceTemplateDefinition.Type

// ============================================================================
// Agent Type Definition Schema
// ============================================================================

/**
 * Defines an agent type (Claude Code, etc.)
 */
export const AgentTypeDefinition = Schema.Struct({
  /** Display name of the agent type */
  name: Schema.NonEmptyString,

  /** Unique identifier for the agent type */
  slug: Slug,

  /** Description of what this agent type does */
  description: Schema.optional(Schema.String),

  /** List of integration slugs required to use this agent type */
  requiredIntegrations: Schema.Array(Slug),

  /** Dockerfile content for building the E2B sandbox image */
  dockerFile: Schema.String,
})
export type AgentTypeDefinition = typeof AgentTypeDefinition.Type

// ============================================================================
// Root Menagerie Config Schema
// ============================================================================

/**
 * Root configuration schema for menagerie.yaml
 */
export const MenagerieConfig = Schema.Struct({
  /** Available AI models for agents */
  models: Schema.Array(ModelDefinition),

  /** Available external service integrations */
  integrations: Schema.Array(IntegrationDefinition),

  /** Available resource templates */
  resourceTemplates: Schema.Array(ResourceTemplateDefinition),

  /** Available agent types */
  agentTypes: Schema.Array(AgentTypeDefinition),
})
export type MenagerieConfig = typeof MenagerieConfig.Type
