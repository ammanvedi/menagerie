"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plug, Plus, Settings } from "lucide-react"

interface Integration {
  id: string
  name: string
  slug: string
  config: Record<string, unknown>
  createdAt: string
}

export default function IntegrationsPage() {
  const params = useParams<{ orgSlug: string }>()
  const [integrations, setIntegrations] = React.useState<Integration[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await fetch(`/api/orgs/${params.orgSlug}/integrations`)
        if (response.ok) {
          const data = await response.json()
          setIntegrations(data)
        }
      } catch (error) {
        console.error("Failed to fetch integrations:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchIntegrations()
  }, [params.orgSlug])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Plug className="h-8 w-8" />
            Integrations
          </h1>
          <p className="text-muted-foreground">
            Connect external services to your agents
          </p>
        </div>
        <Link href={`/${params.orgSlug}/integrations/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Integration
          </Button>
        </Link>
      </div>

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plug className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No integrations yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Connect your first integration to enable agents to interact with external services.
            </p>
            <Link href={`/${params.orgSlug}/integrations/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Integration
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <Link
              key={integration.id}
              href={`/${params.orgSlug}/integrations/${integration.slug}`}
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardDescription>
                    <Badge variant="secondary">{integration.slug}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(integration.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
