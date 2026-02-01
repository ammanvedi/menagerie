"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Terminal
} from "lucide-react"

interface Job {
  id: string
  prompt: string
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"
  output: string | null
  createdAt: string
  updatedAt: string
  agentId: string
}

interface Agent {
  id: string
  name: string
  slug: string
  organisationId: string
}

const statusConfig = {
  PENDING: { label: "Pending", icon: Clock, variant: "secondary" as const, color: "text-muted-foreground" },
  RUNNING: { label: "Running", icon: Loader2, variant: "default" as const, color: "text-blue-500" },
  COMPLETED: { label: "Completed", icon: CheckCircle, variant: "default" as const, color: "text-green-500" },
  FAILED: { label: "Failed", icon: XCircle, variant: "destructive" as const, color: "text-red-500" },
  CANCELLED: { label: "Cancelled", icon: XCircle, variant: "secondary" as const, color: "text-muted-foreground" },
}

export default function JobDetailPage() {
  const params = useParams<{ orgSlug: string; jobId: string }>()
  const router = useRouter()
  const [job, setJob] = React.useState<Job | null>(null)
  const [agent, setAgent] = React.useState<Agent | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isStopping, setIsStopping] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const terminalRef = React.useRef<HTMLDivElement>(null)

  const fetchJob = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${params.jobId}`)
      if (response.ok) {
        const data = await response.json()
        setJob(data)
        
        // Get agent info if not already fetched
        if (!agent && data.agentId) {
          const agentsRes = await fetch(`/api/orgs/${params.orgSlug}/agents`)
          if (agentsRes.ok) {
            const agents = await agentsRes.json()
            const matchingAgent = agents.find((a: Agent) => a.id === data.agentId)
            if (matchingAgent) {
              setAgent(matchingAgent)
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch job:", error)
    } finally {
      setIsLoading(false)
    }
  }, [params.jobId, params.orgSlug, agent])

  React.useEffect(() => {
    fetchJob()
  }, [fetchJob])

  // Poll for updates when job is running
  React.useEffect(() => {
    if (!job || (job.status !== "RUNNING" && job.status !== "PENDING")) return

    const interval = setInterval(fetchJob, 2000)
    return () => clearInterval(interval)
  }, [job, fetchJob])

  // Auto-scroll terminal
  React.useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [job?.output])

  const handleStop = async () => {
    setIsStopping(true)
    setError(null)

    try {
      const response = await fetch(`/api/jobs/${params.jobId}/stop`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to stop job")
      }

      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsStopping(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Job not found</p>
      </div>
    )
  }

  const StatusIcon = statusConfig[job.status].icon
  const isRunning = job.status === "RUNNING" || job.status === "PENDING"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${params.orgSlug}/jobs`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Play className="h-8 w-8" />
              Job Details
            </h1>
            <p className="text-muted-foreground">
              {agent ? `Running on ${agent.name}` : "Job execution details"}
            </p>
          </div>
        </div>
        {isRunning && (
          <Button
            variant="destructive"
            onClick={handleStop}
            disabled={isStopping}
          >
            {isStopping ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Square className="mr-2 h-4 w-4" />
            )}
            Stop Job
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <StatusIcon
                className={`h-5 w-5 ${statusConfig[job.status].color} ${
                  job.status === "RUNNING" ? "animate-spin" : ""
                }`}
              />
              <Badge variant={statusConfig[job.status].variant}>
                {statusConfig[job.status].label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Started</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {new Date(job.createdAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {new Date(job.updatedAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
          <CardDescription>The task given to the agent</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{job.prompt}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Output
          </CardTitle>
          <CardDescription>
            {isRunning ? "Live output from the agent" : "Job output"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={terminalRef}
            className="bg-zinc-950 rounded-lg p-4 font-mono text-sm text-zinc-100 min-h-[400px] max-h-[600px] overflow-auto"
          >
            {job.output ? (
              <pre className="whitespace-pre-wrap break-words">{job.output}</pre>
            ) : isRunning ? (
              <div className="flex items-center gap-2 text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for output...
              </div>
            ) : (
              <span className="text-zinc-500">No output</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
