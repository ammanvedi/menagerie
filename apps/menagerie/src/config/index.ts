import { readFileSync } from "fs"
import { join } from "path"
import { parse } from "yaml"
import { Schema } from "effect"
import { MenagerieConfig } from "@/lib/schemas/config"

// ============================================================================
// Config Loader
// ============================================================================

/**
 * Load and parse the menagerie.yaml configuration file
 */
const loadConfig = (): MenagerieConfig => {
  // Use process.cwd() for Next.js compatibility - __dirname doesn't work in bundled environment
  const configPath = join(process.cwd(), "src", "config", "menagerie.yaml")
  const rawYaml = readFileSync(configPath, "utf-8")
  const parsed = parse(rawYaml)

  // Validate and decode the config using Effect Schema
  const result = Schema.decodeUnknownSync(MenagerieConfig)(parsed)

  return result
}

/**
 * The validated Menagerie configuration
 */
export const config = loadConfig()

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a model definition by slug
 */
export const getModel = (slug: string) =>
  config.models.find((m) => m.slug === slug)

/**
 * Get an integration definition by slug
 */
export const getIntegration = (slug: string) =>
  config.integrations.find((i) => i.slug === slug)

/**
 * Get a resource template definition by slug
 */
export const getResourceTemplate = (slug: string) =>
  config.resourceTemplates.find((r) => r.slug === slug)

/**
 * Get an agent type definition by slug
 */
export const getAgentType = (slug: string) =>
  config.agentTypes.find((a) => a.slug === slug)

/**
 * Get all models that require a specific integration
 */
export const getModelsByIntegration = (integrationSlug: string) =>
  config.models.filter((m) => m.requiredIntegrations.includes(integrationSlug as never))

/**
 * Get all resource templates that require a specific integration
 */
export const getResourceTemplatesByIntegration = (integrationSlug: string) =>
  config.resourceTemplates.filter((r) => r.requiredIntegrations.includes(integrationSlug as never))

/**
 * Validate that all required integrations for a model exist in the config
 */
export const validateModelIntegrations = (modelSlug: string): string[] => {
  const model = getModel(modelSlug)
  if (!model) return [`Model "${modelSlug}" not found`]

  const missing: string[] = []
  for (const integrationSlug of model.requiredIntegrations) {
    if (!getIntegration(integrationSlug)) {
      missing.push(`Integration "${integrationSlug}" required by model "${modelSlug}" not found`)
    }
  }
  return missing
}

/**
 * Validate that all required integrations for a resource template exist in the config
 */
export const validateResourceTemplateIntegrations = (templateSlug: string): string[] => {
  const template = getResourceTemplate(templateSlug)
  if (!template) return [`Resource template "${templateSlug}" not found`]

  const missing: string[] = []
  for (const integrationSlug of template.requiredIntegrations) {
    if (!getIntegration(integrationSlug)) {
      missing.push(`Integration "${integrationSlug}" required by resource template "${templateSlug}" not found`)
    }
  }
  return missing
}

// Re-export types for convenience
export type { MenagerieConfig } from "@/lib/schemas/config"
