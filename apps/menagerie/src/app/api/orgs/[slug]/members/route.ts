import { Effect, Schema } from "effect"
import { NextRequest } from "next/server"
import { runEffect, runEffectCreated, getAuthUser, parseJsonBody, getParams } from "@/lib/api"
import { DataStore } from "@/lib/services"
import { PermissionError, ValidationError } from "@/lib/errors"
import type { Slug, OrganisationId, UserId } from "@/lib/schemas"
import type { Organisation, OrganisationMember } from "@prisma/client"

type RouteParams = { params: Promise<{ slug: string }> }

// GET /api/orgs/[slug]/members - List organisation members
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

    // Get all members
    const members = yield* dataStore.organisationMembers.listByOrganisation(org.id as OrganisationId)

    return members
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// POST /api/orgs/[slug]/members - Add member to organisation
export async function POST(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug } = yield* getParams(params)
    const body = yield* parseJsonBody(request)
    const dataStore = yield* DataStore

    // Validate request body
    const data = yield* Schema.decodeUnknown(
      Schema.Struct({
        userId: Schema.String,
        role: Schema.optional(Schema.Literal("ADMIN", "MEMBER")),
      })
    )(body).pipe(
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

    // Add member
    const newMember = yield* dataStore.organisationMembers.add({
      userId: data.userId,
      organisationId: org.id,
      role: data.role ?? "MEMBER",
    })

    return newMember
  }).pipe(Effect.provide(DataStore.Default))

  return runEffectCreated(effect)
}
