"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Bot, ArrowLeft, Play, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"

interface Agent {
  id: string
  name: string
  slug: string
}

interface Job {
  id: string
  prompt: string
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"
  output: string | null
  createdAt: string
  updatedAt: string
}

const statusConfig = {
  PENDING: { label: "Pending", icon: Clock, variant: "secondary" as const },
  RUNNING: { label: "Running", icon: Loader2, variant: "default" as const },
  COMPLETED: { label: "Completed", icon: CheckCircle, variant: "default" as const },
  FAILED: { label: "Failed", icon: XCircle, variant: "destructive" as const },
  CANCELLED: { label: "Cancelled", icon: XCircle, variant: "secondary" as const },
}

export default function AgentJobsPage() {
  const params = useParams<{ orgSlug: string; agentSlug: string }>()
  const router = useRouter()
  const [agent, setAgent] = React.useState<Agent | null>(null)
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [prompt, setPrompt] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      const [agentRes, jobsRes] = await Promise.all([
        fetch(`/api/orgs/${params.orgSlug}/agents/${params.agentSlug}`),
        fetch(`/api/orgs/${params.orgSlug}/agents/${params.agentSlug}/jobs`),
      ])

      if (agentRes.ok) {
        const agentData = await agentRes.json()
        setAgent(agentData)
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobs(jobsData)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [params.orgSlug, params.agentSlug])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll for job updates
  React.useEffect(() => {
    const hasRunningJobs = jobs.some(
      (job) => job.status === "RUNNING" || job.status === "PENDING"
    )

    if (!hasRunningJobs) return

    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [jobs, fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `/api/orgs/${params.orgSlug}/agents/${params.agentSlug}/jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to start job")
      }

      const job = await response.json()
      setPrompt("")
      setJobs((prev) => [job, ...prev])
      
      // Navigate to the job detail page
      router.push(`/${params.orgSlug}/jobs/${job.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full max-w-lg" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Agent not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${params.orgSlug}/agents/${params.agentSlug}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Run {agent.name}
          </h1>
          <p className="text-muted-foreground">
            Start a new job or view history
          </p>
        </div>
      </div>

      <Card className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>New Job</CardTitle>
            <CardDescription>
              Start a new task for this agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="prompt">Task Description</Label>
              <Textarea
                id="prompt"
                placeholder="Describe what you want the agent to do..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting || !prompt.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Job
                </>
              )}
            </Button>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
          <CardDescription>
            Previous jobs run by this agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No jobs yet. Start your first job above.
            </p>
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
                    <div className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <StatusIcon
                        className={`h-5 w-5 mt-0.5 ${
                          job.status === "RUNNING" ? "animate-spin" : ""
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{job.prompt}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={statusConfig[job.status].variant}>
                            {statusConfig[job.status].label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(job.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
