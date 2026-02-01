import { NextResponse } from "next/server"
import { config } from "@/config"

// GET /api/config - Get menagerie configuration (models, integrations, resource templates)
export async function GET() {
  return NextResponse.json({
    models: config.models,
    integrations: config.integrations,
    resourceTemplates: config.resourceTemplates,
  })
}
