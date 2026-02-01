import { Effect, Schema } from "effect"
import { NextRequest } from "next/server"
import { runEffect, runEffectNoContent, getAuthUser, parseJsonBody, getParams } from "@/lib/api"
import { DataStore } from "@/lib/services"
import { PermissionError, ValidationError, NotFoundError } from "@/lib/errors"
import type { Slug, OrganisationId, AgentId, UserId } from "@/lib/schemas"
import type { Organisation, OrganisationMember, Agent } from "@prisma/client"

type RouteParams = { params: Promise<{ slug: string; agentSlug: string }> }

// GET /api/orgs/[slug]/agents/[agentSlug]
export async function GET(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug, agentSlug } = yield* getParams(params)
    const dataStore = yield* DataStore

    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership) {
      return yield* Effect.fail(new PermissionError({ message: "Not a member of this organisation" }))
    }

    const agent = (yield* dataStore.agents.findByOrgAndSlug(
      org.id as OrganisationId,
      agentSlug as Slug
    )) as Agent | null

    if (!agent) {
      return yield* Effect.fail(new NotFoundError({ entity: "Agent", id: agentSlug }))
    }

    return agent
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// PUT /api/orgs/[slug]/agents/[agentSlug]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug, agentSlug } = yield* getParams(params)
    const body = yield* parseJsonBody(request)
    const dataStore = yield* DataStore

    const data = yield* Schema.decodeUnknown(
      Schema.Struct({
        name: Schema.optional(Schema.String),
        agentTypeSlug: Schema.optional(Schema.String),
        resourceIds: Schema.optional(Schema.Array(Schema.String)),
        avatarType: Schema.optional(Schema.String),
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

    const agent = (yield* dataStore.agents.findByOrgAndSlug(
      org.id as OrganisationId,
      agentSlug as Slug
    )) as Agent | null

    if (!agent) {
      return yield* Effect.fail(new NotFoundError({ entity: "Agent", id: agentSlug }))
    }

    const updated = yield* dataStore.agents.update(agent.id as AgentId, {
      name: data.name,
      agentTypeSlug: data.agentTypeSlug,
      resourceIds: data.resourceIds ? [...data.resourceIds] : undefined,
      avatarType: data.avatarType,
    })

    return updated
  }).pipe(Effect.provide(DataStore.Default))

  return runEffect(effect)
}

// DELETE /api/orgs/[slug]/agents/[agentSlug]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const effect = Effect.gen(function* () {
    const user = yield* getAuthUser
    const { slug, agentSlug } = yield* getParams(params)
    const dataStore = yield* DataStore

    const org = (yield* dataStore.organisations.findBySlug(slug as Slug)) as Organisation
    const membership = (yield* dataStore.organisationMembers.findByUserAndOrg(
      user.id as UserId,
      org.id as OrganisationId
    )) as OrganisationMember | null

    if (!membership || membership.role === "MEMBER") {
      return yield* Effect.fail(new PermissionError({ message: "Admin or owner access required" }))
    }

    const agent = (yield* dataStore.agents.findByOrgAndSlug(
      org.id as OrganisationId,
      agentSlug as Slug
    )) as Agent | null

    if (!agent) {
      return yield* Effect.fail(new NotFoundError({ entity: "Agent", id: agentSlug }))
    }

    yield* dataStore.agents.delete(agent.id as AgentId)
  }).pipe(Effect.provide(DataStore.Default))

  return runEffectNoContent(effect)
}
