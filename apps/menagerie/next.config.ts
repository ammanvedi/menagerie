import { withWorkflow } from "workflow/next"
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Ensure the src directory is used
  experimental: {
    // No experimental flags needed for app directory in Next.js 16
  },
}

export default withWorkflow(nextConfig)
