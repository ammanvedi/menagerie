"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Play, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"

interface Job {
  id: string
  prompt: string
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"
  createdAt: string
  agent: {
    id: string
    name: string
    slug: string
  }
}

interface Agent {
  id: string
  name: string
  slug: string
}

const statusConfig = {
  PENDING: { label: "Pending", icon: Clock, variant: "secondary" as const },
  RUNNING: { label: "Running", icon: Loader2, variant: "default" as const },
  COMPLETED: { label: "Completed", icon: CheckCircle, variant: "default" as const },
  FAILED: { label: "Failed", icon: XCircle, variant: "destructive" as const },
  CANCELLED: { label: "Cancelled", icon: XCircle, variant: "secondary" as const },
}

export default function JobsPage() {
  const params = useParams<{ orgSlug: string }>()
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchJobs = React.useCallback(async () => {
    try {
      // Fetch all agents first, then jobs for each
      const agentsRes = await fetch(`/api/orgs/${params.orgSlug}/agents`)
      if (!agentsRes.ok) return

      const agents: Agent[] = await agentsRes.json()
      
      // Fetch jobs for all agents in parallel
      const jobsPromises = agents.map(async (agent) => {
        const res = await fetch(`/api/orgs/${params.orgSlug}/agents/${agent.slug}/jobs`)
        if (!res.ok) return []
        const agentJobs = await res.json()
        return agentJobs.map((job: Job) => ({ ...job, agent }))
      })

      const allJobs = await Promise.all(jobsPromises)
      const flatJobs = allJobs.flat().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setJobs(flatJobs)
    } catch (error) {
      console.error("Failed to fetch jobs:", error)
    } finally {
      setIsLoading(false)
    }
  }, [params.orgSlug])

  React.useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // Poll for updates
  React.useEffect(() => {
    const hasRunningJobs = jobs.some(
      (job) => job.status === "RUNNING" || job.status === "PENDING"
    )

    if (!hasRunningJobs) return

    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [jobs, fetchJobs])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Play className="h-8 w-8" />
          Jobs
        </h1>
        <p className="text-muted-foreground">
          View all agent jobs across your organisation
        </p>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Play className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No jobs yet</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Start a job by running one of your agents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const StatusIcon = statusConfig[job.status].icon
            return (
              <Link
                key={job.id}
                href={`/${params.orgSlug}/jobs/${job.id}`}
                className="block"
              >
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-start gap-4 py-4">
                    <StatusIcon
                      className={`h-5 w-5 mt-0.5 ${
                        job.status === "RUNNING" ? "animate-spin" : ""
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{job.agent.name}</span>
                        <Badge variant={statusConfig[job.status].variant}>
                          {statusConfig[job.status].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.prompt}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
