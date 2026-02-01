import { Effect, Schema } from "effect"
import { NextRequest } from "next/server"
import { runEffect, runEffectCreated, getAuthUser, parseJsonBody } from "@/lib/api"
import { DataStore } from "@/lib/services"
import { CreateOrganisation } from "@/lib/schemas"
import { ValidationError } from "@/lib/errors"
import type { UserId } from "@/lib/schemas"
import type { Organisation } from "@prisma/client"

// GET /api/orgs - List user's organisations
export async function GET() {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const dataStore = yield* DataStore
    const orgs = yield* dataStore.organisations.listByUser(user.id as UserId)
    return orgs
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// POST /api/orgs - Create organisation
export async function POST(request: NextRequest) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const body = yield* parseJsonBody(request)

    // Validate request body with Effect Schema
    const data = yield* Schema.decodeUnknown(CreateOrganisation)(body).pipe(
      Effect.mapError(() => new ValidationError({ message: "Invalid request body" }))
    )

    const dataStore = yield* DataStore

    // Create org
    const org = (yield* dataStore.organisations.create({
      name: data.name,
      slug: data.slug,
    })) as Organisation

    // Add creator as owner
    yield* dataStore.organisationMembers.add({
      userId: user.id,
      organisationId: org.id,
      role: "OWNER",
    })

    return org
  }).pipe(Effect.provide(DataStore.Default))

  return runEffectCreated(effect)
}
