import { Schema } from "effect"

// ============================================================================
// Common Branded ID Types
// ============================================================================

/**
 * Branded type for User IDs (from better-auth, not ObjectId)
 */
export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

/**
 * Branded type for Organisation IDs (MongoDB ObjectId as string)
 */
export const OrganisationId = Schema.String.pipe(Schema.brand("OrganisationId"))
export type OrganisationId = typeof OrganisationId.Type

/**
 * Branded type for Integration IDs
 */
export const IntegrationId = Schema.String.pipe(Schema.brand("IntegrationId"))
export type IntegrationId = typeof IntegrationId.Type

/**
 * Branded type for Resource IDs
 */
export const ResourceId = Schema.String.pipe(Schema.brand("ResourceId"))
export type ResourceId = typeof ResourceId.Type

/**
 * Branded type for Agent IDs
 */
export const AgentId = Schema.String.pipe(Schema.brand("AgentId"))
export type AgentId = typeof AgentId.Type

/**
 * Branded type for AgentJob IDs
 */
export const AgentJobId = Schema.String.pipe(Schema.brand("AgentJobId"))
export type AgentJobId = typeof AgentJobId.Type

// ============================================================================
// Common Slug Type
// ============================================================================

/**
 * Slug pattern: lowercase letters, numbers, and hyphens only
 */
export const Slug = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  Schema.brand("Slug")
)
export type Slug = typeof Slug.Type

// ============================================================================
// Common DateTime Schemas
// ============================================================================

export const CreatedAt = Schema.Date
export const UpdatedAt = Schema.Date

// ============================================================================
// JSON Config Schema (for flexible configuration storage)
// ============================================================================

export const JsonValue: Schema.Schema<unknown> = Schema.Unknown
export type JsonValue = typeof JsonValue.Type
