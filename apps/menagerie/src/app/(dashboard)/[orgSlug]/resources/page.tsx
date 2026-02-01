"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FolderCog, Plus, Settings } from "lucide-react"

interface Resource {
  id: string
  name: string
  slug: string
  config: Record<string, unknown>
  createdAt: string
}

export default function ResourcesPage() {
  const params = useParams<{ orgSlug: string }>()
  const [resources, setResources] = React.useState<Resource[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await fetch(`/api/orgs/${params.orgSlug}/resources`)
        if (response.ok) {
          const data = await response.json()
          setResources(data)
        }
      } catch (error) {
        console.error("Failed to fetch resources:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchResources()
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
            <FolderCog className="h-8 w-8" />
            Resources
          </h1>
          <p className="text-muted-foreground">
            Configure resource templates for your agents
          </p>
        </div>
        <Link href={`/${params.orgSlug}/resources/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Resource
          </Button>
        </Link>
      </div>

      {resources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderCog className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No resources yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Add your first resource to provide agents with repositories or workspaces.
            </p>
            <Link href={`/${params.orgSlug}/resources/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Resource
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Link
              key={resource.id}
              href={`/${params.orgSlug}/resources/${resource.slug}`}
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{resource.name}</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardDescription>
                    <Badge variant="secondary">{resource.slug}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(resource.createdAt).toLocaleDateString()}
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
