"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, Plus, Play } from "lucide-react"

interface Agent {
  id: string
  name: string
  slug: string
  modelId: string
  avatarType: string | null
  createdAt: string
}

export default function AgentsPage() {
  const params = useParams<{ orgSlug: string }>()
  const [agents, setAgents] = React.useState<Agent[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch(`/api/orgs/${params.orgSlug}/agents`)
        if (response.ok) {
          const data = await response.json()
          setAgents(data)
        }
      } catch (error) {
        console.error("Failed to fetch agents:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAgents()
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
            <Skeleton key={i} className="h-48" />
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
            <Bot className="h-8 w-8" />
            Agents
          </h1>
          <p className="text-muted-foreground">
            Configure and manage your AI agents
          </p>
        </div>
        <Link href={`/${params.orgSlug}/agents/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </Link>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No agents yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Create your first agent to start automating tasks.
            </p>
            <Link href={`/${params.orgSlug}/agents/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {agent.avatarType ?? agent.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription>
                        <Badge variant="secondary">{agent.modelId}</Badge>
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Link href={`/${params.orgSlug}/agents/${agent.slug}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      Configure
                    </Button>
                  </Link>
                  <Link href={`/${params.orgSlug}/agents/${agent.slug}/jobs`}>
                    <Button size="sm">
                      <Play className="mr-1 h-3 w-3" />
                      Run
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
