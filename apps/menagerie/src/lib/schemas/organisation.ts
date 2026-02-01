import { Schema } from "effect"
import { OrganisationId, UserId, Slug, CreatedAt, UpdatedAt } from "./common"

// ============================================================================
// Member Role Enum
// ============================================================================

export const MemberRole = Schema.Literal("OWNER", "ADMIN", "MEMBER")
export type MemberRole = typeof MemberRole.Type

// ============================================================================
// Organisation Schema
// ============================================================================

export const Organisation = Schema.Struct({
  id: OrganisationId,
  name: Schema.NonEmptyString,
  slug: Slug,
  createdAt: CreatedAt,
  updatedAt: UpdatedAt,
})
export type Organisation = typeof Organisation.Type

/**
 * Schema for creating a new organisation
 */
export const CreateOrganisation = Schema.Struct({
  name: Schema.NonEmptyString,
  slug: Slug,
})
export type CreateOrganisation = typeof CreateOrganisation.Type

/**
 * Schema for updating an organisation
 */
export const UpdateOrganisation = Schema.Struct({
  name: Schema.optional(Schema.NonEmptyString),
  slug: Schema.optional(Slug),
})
export type UpdateOrganisation = typeof UpdateOrganisation.Type

// ============================================================================
// Organisation Member Schema
// ============================================================================

export const OrganisationMemberId = Schema.String.pipe(
  Schema.brand("OrganisationMemberId")
)
export type OrganisationMemberId = typeof OrganisationMemberId.Type

export const OrganisationMember = Schema.Struct({
  id: OrganisationMemberId,
  userId: UserId,
  organisationId: OrganisationId,
  role: MemberRole,
  createdAt: CreatedAt,
  updatedAt: UpdatedAt,
})
export type OrganisationMember = typeof OrganisationMember.Type

/**
 * Schema for adding a member to an organisation
 */
export const AddOrganisationMember = Schema.Struct({
  userId: UserId,
  organisationId: OrganisationId,
  role: Schema.optional(MemberRole),
})
export type AddOrganisationMember = typeof AddOrganisationMember.Type

/**
 * Schema for updating a member's role
 */
export const UpdateMemberRole = Schema.Struct({
  role: MemberRole,
})
export type UpdateMemberRole = typeof UpdateMemberRole.Type
