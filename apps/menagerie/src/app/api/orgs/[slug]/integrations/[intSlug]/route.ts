import { Effect, Schema } from "effect"
import { NextRequest } from "next/server"
import { runEffect, runEffectNoContent, getAuthUser, parseJsonBody, getParams } from "@/lib/api"
import { DataStore } from "@/lib/services"
import { PermissionError, ValidationError, NotFoundError } from "@/lib/errors"
import type { Slug, OrganisationId, IntegrationId, UserId } from "@/lib/schemas"
import type { Organisation, OrganisationMember, Integration } from "@prisma/client"

type RouteParams = { params: Promise<{ slug: string; intSlug: string }> }

// GET /api/orgs/[slug]/integrations/[intSlug]
export async function GET(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug, intSlug } = yield* getParams(params)
    const dataStore = yield* DataStore

    // Get org and verify membership
    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership) {
      return yield* Effect.fail(new PermissionError({ message: "Not a member of this organisation" }))
    }

    const integration = (yield* dataStore.integrations.findByOrgAndSlug(
      org.id as OrganisationId,
      intSlug as Slug
    )) as Integration | null

    if (!integration) {
      return yield* Effect.fail(new NotFoundError({ entity: "Integration", id: intSlug }))
    }

    return integration
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// PUT /api/orgs/[slug]/integrations/[intSlug]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug, intSlug } = yield* getParams(params)
    const body = yield* parseJsonBody(request)
    const dataStore = yield* DataStore

    const data = yield* Schema.decodeUnknown(
      Schema.Struct({
        name: Schema.optional(Schema.String),
        config: Schema.optional(Schema.Unknown),
      })
    )(body).pipe(
      Effect.mapError(() => new ValidationError({ message: "Invalid request body" }))
    )

    // Get org and verify admin/owner
    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership || membership.role === "MEMBER") {
      return yield* Effect.fail(new PermissionError({ message: "Admin or owner access required" }))
    }

    const integration = (yield* dataStore.integrations.findByOrgAndSlug(
      org.id as OrganisationId,
      intSlug as Slug
    )) as Integration | null

    if (!integration) {
      return yield* Effect.fail(new NotFoundError({ entity: "Integration", id: intSlug }))
    }

    const updated = yield* dataStore.integrations.update(integration.id as IntegrationId, {
      name: data.name,
      config: data.config,
    })

    return updated
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// DELETE /api/orgs/[slug]/integrations/[intSlug]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug, intSlug } = yield* getParams(params)
    const dataStore = yield* DataStore

    // Get org and verify admin/owner
    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership || membership.role === "MEMBER") {
      return yield* Effect.fail(new PermissionError({ message: "Admin or owner access required" }))
    }

    const integration = (yield* dataStore.integrations.findByOrgAndSlug(
      org.id as OrganisationId,
      intSlug as Slug
    )) as Integration | null

    if (!integration) {
      return yield* Effect.fail(new NotFoundError({ entity: "Integration", id: intSlug }))
    }

    yield* dataStore.integrations.delete(integration.id as IntegrationId)
  }).pipe(Effect.provide(DataStore.Default))

  return runEffectNoContent(effect)
}
