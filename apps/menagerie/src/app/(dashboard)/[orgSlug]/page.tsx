"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Bot, Plug, FolderCog, Play } from "lucide-react"

interface OrgStats {
  agents: number
  integrations: number
  resources: number
  activeJobs: number
}

export default function OrgOverviewPage() {
  const params = useParams<{ orgSlug: string }>()
  const [stats, setStats] = React.useState<OrgStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const [agentsRes, integrationsRes, resourcesRes] = await Promise.all([
          fetch(`/api/orgs/${params.orgSlug}/agents`),
          fetch(`/api/orgs/${params.orgSlug}/integrations`),
          fetch(`/api/orgs/${params.orgSlug}/resources`),
        ])

        const agents = agentsRes.ok ? await agentsRes.json() : []
        const integrations = integrationsRes.ok ? await integrationsRes.json() : []
        const resources = resourcesRes.ok ? await resourcesRes.json() : []

        setStats({
          agents: agents.length,
          integrations: integrations.length,
          resources: resources.length,
          activeJobs: 0, // TODO: Get from jobs API
        })
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [params.orgSlug])

  const statCards = [
    {
      title: "Agents",
      value: stats?.agents ?? 0,
      icon: Bot,
      href: `/${params.orgSlug}/agents`,
      description: "AI agents configured",
    },
    {
      title: "Integrations",
      value: stats?.integrations ?? 0,
      icon: Plug,
      href: `/${params.orgSlug}/integrations`,
      description: "Connected services",
    },
    {
      title: "Resources",
      value: stats?.resources ?? 0,
      icon: FolderCog,
      href: `/${params.orgSlug}/resources`,
      description: "Resource templates",
    },
    {
      title: "Active Jobs",
      value: stats?.activeJobs ?? 0,
      icon: Play,
      href: `/${params.orgSlug}/jobs`,
      description: "Currently running",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your organisation
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{card.value}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest jobs and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No recent activity
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href={`/${params.orgSlug}/agents/new`}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
            >
              <Bot className="h-4 w-4" />
              <span>Create new agent</span>
            </Link>
            <Link
              href={`/${params.orgSlug}/integrations/new`}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
            >
              <Plug className="h-4 w-4" />
              <span>Add integration</span>
            </Link>
            <Link
              href={`/${params.orgSlug}/resources/new`}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
            >
              <FolderCog className="h-4 w-4" />
              <span>Add resource</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
