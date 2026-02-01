import { Effect, Schema } from "effect"
import { NextRequest } from "next/server"
import { runEffect, runEffectCreated, getAuthUser, parseJsonBody, getParams } from "@/lib/api"
import { DataStore } from "@/lib/services"
import { PermissionError, ValidationError } from "@/lib/errors"
import type { Slug, OrganisationId, UserId } from "@/lib/schemas"
import type { Organisation, OrganisationMember } from "@prisma/client"

type RouteParams = { params: Promise<{ slug: string }> }

// GET /api/orgs/[slug]/resources
export async function GET(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug } = yield* getParams(params)
    const dataStore = yield* DataStore

    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership) {
      return yield* Effect.fail(new PermissionError({ message: "Not a member of this organisation" }))
    }

    const resources = yield* dataStore.resources.listByOrganisation(org.id as OrganisationId)
    return resources
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// POST /api/orgs/[slug]/resources
export async function POST(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug } = yield* getParams(params)
    const body = yield* parseJsonBody(request)
    const dataStore = yield* DataStore

    const data = yield* Schema.decodeUnknown(
      Schema.Struct({
        slug: Schema.String,
        name: Schema.String,
        config: Schema.Unknown,
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

    const resource = yield* dataStore.resources.create({
      slug: data.slug,
      name: data.name,
      organisationId: org.id,
      config: data.config,
    })

    return resource
  }).pipe(Effect.provide(DataStore.Default))

  return runEffectCreated(effect)
}
