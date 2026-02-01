import { Effect, Schema } from "effect"
import { NextRequest } from "next/server"
import { runEffect, runEffectNoContent, getAuthUser, parseJsonBody, getParams } from "@/lib/api"
import { DataStore } from "@/lib/services"
import { UpdateOrganisation } from "@/lib/schemas"
import { PermissionError, ValidationError } from "@/lib/errors"
import type { Slug, OrganisationId, UserId } from "@/lib/schemas"
import type { Organisation, OrganisationMember } from "@prisma/client"

type RouteParams = { params: Promise<{ slug: string }> }

// GET /api/orgs/[slug] - Get organisation by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug } = yield* getParams(params)
    const dataStore = yield* DataStore

    // Get org
    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation

    // Verify user is a member
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership) {
      return yield* Effect.fail(new PermissionError({ message: "Not a member of this organisation" }))
    }

    return org
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// PUT /api/orgs/[slug] - Update organisation
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug } = yield* getParams(params)
    const body = yield* parseJsonBody(request)
    const dataStore = yield* DataStore

    // Validate request body
    const data = yield* Schema.decodeUnknown(UpdateOrganisation)(body).pipe(
      Effect.mapError(() => new ValidationError({ message: "Invalid request body" }))
    )

    // Get org
    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation

    // Verify user is admin or owner
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership || membership.role === "MEMBER") {
      return yield* Effect.fail(new PermissionError({ message: "Admin or owner access required" }))
    }

    // Update org
    const updated = yield* dataStore.organisations.update(org.id as OrganisationId, {
      name: data.name,
      slug: data.slug,
    })

    return updated
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// DELETE /api/orgs/[slug] - Delete organisation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug } = yield* getParams(params)
    const dataStore = yield* DataStore

    // Get org
    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation

    // Verify user is owner
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership || membership.role !== "OWNER") {
      return yield* Effect.fail(new PermissionError({ message: "Owner access required" }))
    }

    // Delete org
    yield* dataStore.organisations.delete(org.id as OrganisationId)
  }).pipe(Effect.provide(DataStore.Default))

  return runEffectNoContent(effect)
}
