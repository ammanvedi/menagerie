import { Effect, Schema } from "effect"
import { NextRequest } from "next/server"
import { runEffect, runEffectNoContent, getAuthUser, parseJsonBody, getParams } from "@/lib/api"
import { DataStore } from "@/lib/services"
import { PermissionError, ValidationError, NotFoundError } from "@/lib/errors"
import type { Slug, OrganisationId, ResourceId, UserId } from "@/lib/schemas"
import type { Organisation, OrganisationMember, Resource } from "@prisma/client"

type RouteParams = { params: Promise<{ slug: string; resSlug: string }> }

// GET /api/orgs/[slug]/resources/[resSlug]
export async function GET(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug, resSlug } = yield* getParams(params)
    const dataStore = yield* DataStore

    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership) {
      return yield* Effect.fail(new PermissionError({ message: "Not a member of this organisation" }))
    }

    const resource = (yield* dataStore.resources.findByOrgAndSlug(
      org.id as OrganisationId,
      resSlug as Slug
    )) as Resource | null

    if (!resource) {
      return yield* Effect.fail(new NotFoundError({ entity: "Resource", id: resSlug }))
    }

    return resource
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// PUT /api/orgs/[slug]/resources/[resSlug]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug, resSlug } = yield* getParams(params)
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

    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership || membership.role === "MEMBER") {
      return yield* Effect.fail(new PermissionError({ message: "Admin or owner access required" }))
    }

    const resource = (yield* dataStore.resources.findByOrgAndSlug(
      org.id as OrganisationId,
      resSlug as Slug
    )) as Resource | null

    if (!resource) {
      return yield* Effect.fail(new NotFoundError({ entity: "Resource", id: resSlug }))
    }

    const updated = yield* dataStore.resources.update(resource.id as ResourceId, {
      name: data.name,
      config: data.config,
    })

    return updated
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// DELETE /api/orgs/[slug]/resources/[resSlug]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug, resSlug } = yield* getParams(params)
    const dataStore = yield* DataStore

    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership || membership.role === "MEMBER") {
      return yield* Effect.fail(new PermissionError({ message: "Admin or owner access required" }))
    }

    const resource = (yield* dataStore.resources.findByOrgAndSlug(
      org.id as OrganisationId,
      resSlug as Slug
    )) as Resource | null

    if (!resource) {
      return yield* Effect.fail(new NotFoundError({ entity: "Resource", id: resSlug }))
    }

    yield* dataStore.resources.delete(resource.id as ResourceId)
  }).pipe(Effect.provide(DataStore.Default))

  return runEffectNoContent(effect)
}
