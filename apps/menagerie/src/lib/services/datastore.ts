import { Effect, Layer } from "effect"
import { Prisma } from "@prisma/client"
import { prisma } from "../prisma"
import { DatabaseError, NotFoundError, DuplicateError } from "../errors"
import type {
  OrganisationId,
  IntegrationId,
  ResourceId,
  AgentId,
  AgentJobId,
  UserId,
  Slug,
} from "../schemas"

// ============================================================================
// Error Handling Helpers
// ============================================================================

const handlePrismaError = <T>(
  entity: string
): ((error: unknown) => Effect.Effect<T, DatabaseError | DuplicateError>) => {
  return (error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation
      if (error.code === "P2002") {
        const target = (error.meta?.target as string[]) ?? ["unknown"]
        return Effect.fail(
          new DuplicateError({
            entity,
            field: target.join(", "),
            value: "already exists",
          })
        )
      }
    }
    return Effect.fail(
      new DatabaseError({
        message: `Failed to operate on ${entity}`,
        cause: error,
      })
    )
  }
}

const notFoundOrValue = <T>(
  entity: string,
  id: string
): ((value: T | null) => Effect.Effect<T, NotFoundError>) => {
  return (value: T | null) => {
    if (value === null) {
      return Effect.fail(new NotFoundError({ entity, id }))
    }
    return Effect.succeed(value)
  }
}

/**
 * Strips undefined values from an object
 * This ensures only defined values are passed to Prisma update operations
 */
const stripUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const result: Partial<T> = {}
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key]
    }
  }
  return result
}

// ============================================================================
// DataStore Service
// ============================================================================

export class DataStore extends Effect.Service<DataStore>()("DataStore", {
  effect: Effect.gen(function* () {
    return {
      // ========================================================================
      // Organisation Operations
      // ========================================================================
      organisations: {
        create: (data: { name: string; slug: string }) =>
          Effect.tryPromise(() => prisma.organisation.create({ data })).pipe(
            Effect.catchAll(handlePrismaError("Organisation"))
          ),

        findById: (id: OrganisationId) =>
          Effect.tryPromise(() =>
            prisma.organisation.findUnique({ where: { id } })
          ).pipe(
            Effect.flatMap(notFoundOrValue("Organisation", id)),
            Effect.catchAll(handlePrismaError("Organisation"))
          ),

        findBySlug: (slug: Slug) =>
          Effect.tryPromise(() =>
            prisma.organisation.findUnique({ where: { slug } })
          ).pipe(
            Effect.flatMap(notFoundOrValue("Organisation", slug)),
            Effect.catchAll(handlePrismaError("Organisation"))
          ),

        findBySlugOptional: (slug: Slug) =>
          Effect.tryPromise(() =>
            prisma.organisation.findUnique({ where: { slug } })
          ).pipe(Effect.catchAll(handlePrismaError("Organisation"))),

        update: (id: OrganisationId, data: { name?: string; slug?: string }) =>
          Effect.tryPromise(() =>
            prisma.organisation.update({ where: { id }, data })
          ).pipe(Effect.catchAll(handlePrismaError("Organisation"))),

        delete: (id: OrganisationId) =>
          Effect.tryPromise(() =>
            prisma.organisation.delete({ where: { id } })
          ).pipe(Effect.catchAll(handlePrismaError("Organisation"))),

        listByUser: (userId: UserId) =>
          Effect.tryPromise(() =>
            prisma.organisation.findMany({
              where: {
                members: {
                  some: { userId },
                },
              },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Organisation"))),
      },

      // ========================================================================
      // Organisation Member Operations
      // ========================================================================
      organisationMembers: {
        add: (data: {
          userId: string
          organisationId: string
          role?: "OWNER" | "ADMIN" | "MEMBER"
        }) =>
          Effect.tryPromise(() =>
            prisma.organisationMember.create({
              data: {
                userId: data.userId,
                organisationId: data.organisationId,
                role: data.role ?? "MEMBER",
              },
            })
          ).pipe(Effect.catchAll(handlePrismaError("OrganisationMember"))),

        findByUserAndOrg: (userId: UserId, organisationId: OrganisationId) =>
          Effect.tryPromise(() =>
            prisma.organisationMember.findUnique({
              where: {
                userId_organisationId: { userId, organisationId },
              },
            })
          ).pipe(Effect.catchAll(handlePrismaError("OrganisationMember"))),

        updateRole: (
          userId: UserId,
          organisationId: OrganisationId,
          role: "OWNER" | "ADMIN" | "MEMBER"
        ) =>
          Effect.tryPromise(() =>
            prisma.organisationMember.update({
              where: {
                userId_organisationId: { userId, organisationId },
              },
              data: { role },
            })
          ).pipe(Effect.catchAll(handlePrismaError("OrganisationMember"))),

        remove: (userId: UserId, organisationId: OrganisationId) =>
          Effect.tryPromise(() =>
            prisma.organisationMember.delete({
              where: {
                userId_organisationId: { userId, organisationId },
              },
            })
          ).pipe(Effect.catchAll(handlePrismaError("OrganisationMember"))),

        listByOrganisation: (organisationId: OrganisationId) =>
          Effect.tryPromise(() =>
            prisma.organisationMember.findMany({
              where: { organisationId },
              include: { user: true },
            })
          ).pipe(Effect.catchAll(handlePrismaError("OrganisationMember"))),
      },

      // ========================================================================
      // Integration Operations
      // ========================================================================
      integrations: {
        create: (data: {
          slug: string
          name: string
          organisationId: string
          config: unknown
        }) =>
          Effect.tryPromise(() =>
            prisma.integration.create({
              data: {
                slug: data.slug,
                name: data.name,
                organisationId: data.organisationId,
                config: data.config as Prisma.InputJsonValue,
              },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Integration"))),

        findById: (id: IntegrationId) =>
          Effect.tryPromise(() =>
            prisma.integration.findUnique({ where: { id } })
          ).pipe(
            Effect.flatMap(notFoundOrValue("Integration", id)),
            Effect.catchAll(handlePrismaError("Integration"))
          ),

        findByOrgAndSlug: (organisationId: OrganisationId, slug: Slug) =>
          Effect.tryPromise(() =>
            prisma.integration.findUnique({
              where: { organisationId_slug: { organisationId, slug } },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Integration"))),

        update: (id: IntegrationId, data: { name?: string; config?: unknown }) =>
          Effect.tryPromise(() =>
            prisma.integration.update({
              where: { id },
              data: stripUndefined({
                name: data.name,
                config: data.config as Prisma.InputJsonValue | undefined,
              }),
            })
          ).pipe(Effect.catchAll(handlePrismaError("Integration"))),

        delete: (id: IntegrationId) =>
          Effect.tryPromise(() =>
            prisma.integration.delete({ where: { id } })
          ).pipe(Effect.catchAll(handlePrismaError("Integration"))),

        listByOrganisation: (organisationId: OrganisationId) =>
          Effect.tryPromise(() =>
            prisma.integration.findMany({ where: { organisationId } })
          ).pipe(Effect.catchAll(handlePrismaError("Integration"))),
      },

      // ========================================================================
      // Resource Operations
      // ========================================================================
      resources: {
        create: (data: {
          slug: string
          name: string
          organisationId: string
          config: unknown
        }) =>
          Effect.tryPromise(() =>
            prisma.resource.create({
              data: {
                slug: data.slug,
                name: data.name,
                organisationId: data.organisationId,
                config: data.config as Prisma.InputJsonValue,
              },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Resource"))),

        findById: (id: ResourceId) =>
          Effect.tryPromise(() =>
            prisma.resource.findUnique({ where: { id } })
          ).pipe(
            Effect.flatMap(notFoundOrValue("Resource", id)),
            Effect.catchAll(handlePrismaError("Resource"))
          ),

        findByOrgAndSlug: (organisationId: OrganisationId, slug: Slug) =>
          Effect.tryPromise(() =>
            prisma.resource.findUnique({
              where: { organisationId_slug: { organisationId, slug } },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Resource"))),

        update: (id: ResourceId, data: { name?: string; config?: unknown }) =>
          Effect.tryPromise(() =>
            prisma.resource.update({
              where: { id },
              data: stripUndefined({
                name: data.name,
                config: data.config as Prisma.InputJsonValue | undefined,
              }),
            })
          ).pipe(Effect.catchAll(handlePrismaError("Resource"))),

        delete: (id: ResourceId) =>
          Effect.tryPromise(() =>
            prisma.resource.delete({ where: { id } })
          ).pipe(Effect.catchAll(handlePrismaError("Resource"))),

        listByOrganisation: (organisationId: OrganisationId) =>
          Effect.tryPromise(() =>
            prisma.resource.findMany({ where: { organisationId } })
          ).pipe(Effect.catchAll(handlePrismaError("Resource"))),
      },

      // ========================================================================
      // Image Operations
      // ========================================================================
      images: {
        create: (data: {
          dockerfile: string
          dockerfileHash: string
          deployedImageName?: string | null
        }) =>
          Effect.tryPromise(() =>
            prisma.image.create({
              data: {
                dockerfile: data.dockerfile,
                dockerfileHash: data.dockerfileHash,
                deployedImageName: data.deployedImageName ?? null,
              },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Image"))),

        findByHash: (dockerfileHash: string) =>
          Effect.tryPromise(() =>
            prisma.image.findUnique({
              where: { dockerfileHash },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Image"))),

        upsertByHash: (
          dockerfileHash: string,
          data: {
            dockerfile: string
            dockerfileHash: string
            deployedImageName?: string | null
          }
        ) =>
          Effect.tryPromise(() =>
            prisma.image.upsert({
              where: { dockerfileHash },
              create: {
                dockerfile: data.dockerfile,
                dockerfileHash: data.dockerfileHash,
                deployedImageName: data.deployedImageName ?? null,
              },
              update: {
                deployedImageName: data.deployedImageName,
              },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Image"))),

        updateDeployedImageName: (id: string, deployedImageName: string) =>
          Effect.tryPromise(() =>
            prisma.image.update({
              where: { id },
              data: { deployedImageName },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Image"))),
      },

      // ========================================================================
      // Agent Operations
      // ========================================================================
      agents: {
        create: (data: {
          slug: string
          name: string
          avatarType?: string
          organisationId: string
          agentTypeSlug: string
          imageId?: string | null
          resourceIds?: string[]
        }) =>
          Effect.tryPromise(() =>
            prisma.agent.create({
              data: {
                slug: data.slug,
                name: data.name,
                avatarType: data.avatarType ?? null,
                organisationId: data.organisationId,
                agentTypeSlug: data.agentTypeSlug,
                imageId: data.imageId ?? null,
                resourceIds: data.resourceIds ?? [],
              },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Agent"))),

        findById: (id: AgentId) =>
          Effect.tryPromise(() =>
            prisma.agent.findUnique({
              where: { id },
              include: { resources: true, image: true },
            })
          ).pipe(
            Effect.flatMap(notFoundOrValue("Agent", id)),
            Effect.catchAll(handlePrismaError("Agent"))
          ),

        findByIdWithImage: (id: AgentId) =>
          Effect.tryPromise(() =>
            prisma.agent.findUnique({
              where: { id },
              include: { image: true },
            })
          ).pipe(
            Effect.flatMap(notFoundOrValue("Agent", id)),
            Effect.catchAll(handlePrismaError("Agent"))
          ),

        findByOrgAndSlug: (organisationId: OrganisationId, slug: Slug) =>
          Effect.tryPromise(() =>
            prisma.agent.findUnique({
              where: { organisationId_slug: { organisationId, slug } },
              include: { resources: true, image: true },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Agent"))),

        update: (
          id: AgentId,
          data: {
            name?: string
            avatarType?: string | null
            agentTypeSlug?: string
            imageId?: string | null
            resourceIds?: string[]
          }
        ) =>
          Effect.tryPromise(() =>
            prisma.agent.update({
              where: { id },
              data: stripUndefined({
                name: data.name,
                avatarType: data.avatarType,
                agentTypeSlug: data.agentTypeSlug,
                imageId: data.imageId,
                resourceIds: data.resourceIds,
              }),
            })
          ).pipe(Effect.catchAll(handlePrismaError("Agent"))),

        delete: (id: AgentId) =>
          Effect.tryPromise(() =>
            prisma.agent.delete({ where: { id } })
          ).pipe(Effect.catchAll(handlePrismaError("Agent"))),

        listByOrganisation: (organisationId: OrganisationId) =>
          Effect.tryPromise(() =>
            prisma.agent.findMany({
              where: { organisationId },
              include: { resources: true, image: true },
            })
          ).pipe(Effect.catchAll(handlePrismaError("Agent"))),
      },

      // ========================================================================
      // Agent Job Operations
      // ========================================================================
      agentJobs: {
        create: (data: { agentId: string; initialPrompt: string }) =>
          Effect.tryPromise(() =>
            prisma.agentJob.create({
              data: {
                agentId: data.agentId,
                initialPrompt: data.initialPrompt,
              },
            })
          ).pipe(Effect.catchAll(handlePrismaError("AgentJob"))),

        findById: (id: AgentJobId) =>
          Effect.tryPromise(() =>
            prisma.agentJob.findUnique({
              where: { id },
              include: { agent: true },
            })
          ).pipe(
            Effect.flatMap(notFoundOrValue("AgentJob", id)),
            Effect.catchAll(handlePrismaError("AgentJob"))
          ),

        updateStatus: (
          id: AgentJobId,
          data: {
            status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"
            sandboxUrl?: string | null
            startedAt?: Date | null
            completedAt?: Date | null
          }
        ) =>
          Effect.tryPromise(() =>
            prisma.agentJob.update({
              where: { id },
              data: stripUndefined({
                status: data.status,
                sandboxUrl: data.sandboxUrl,
                startedAt: data.startedAt,
                completedAt: data.completedAt,
              }),
            })
          ).pipe(Effect.catchAll(handlePrismaError("AgentJob"))),

        listByAgent: (agentId: AgentId) =>
          Effect.tryPromise(() =>
            prisma.agentJob.findMany({
              where: { agentId },
              orderBy: { createdAt: "desc" },
            })
          ).pipe(Effect.catchAll(handlePrismaError("AgentJob"))),

        listByOrganisation: (organisationId: OrganisationId) =>
          Effect.tryPromise(() =>
            prisma.agentJob.findMany({
              where: {
                agent: { organisationId },
              },
              include: { agent: true },
              orderBy: { createdAt: "desc" },
            })
          ).pipe(Effect.catchAll(handlePrismaError("AgentJob"))),

        listRunning: () =>
          Effect.tryPromise(() =>
            prisma.agentJob.findMany({
              where: { status: "RUNNING" },
              include: { agent: true },
            })
          ).pipe(Effect.catchAll(handlePrismaError("AgentJob"))),
      },
    }
  }),
}) { }

// ============================================================================
// Layer Export
// ============================================================================

export const DataStoreLive: Layer.Layer<DataStore> = DataStore.Default
