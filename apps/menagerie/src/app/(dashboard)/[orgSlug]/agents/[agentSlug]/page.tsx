"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Bot, ArrowLeft, Trash2, Play } from "lucide-react"

interface Model {
  slug: string
  name: string
}

interface Agent {
  id: string
  name: string
  slug: string
  modelId: string
  modelConfig: Record<string, unknown>
  resourceIds: string[]
  avatarType: string | null
}

interface Resource {
  id: string
  name: string
  slug: string
}

export default function AgentDetailPage() {
  const params = useParams<{ orgSlug: string; agentSlug: string }>()
  const router = useRouter()
  const [agent, setAgent] = React.useState<Agent | null>(null)
  const [name, setName] = React.useState("")
  const [modelId, setModelId] = React.useState("")
  const [selectedResourceIds, setSelectedResourceIds] = React.useState<string[]>([])
  const [avatarType, setAvatarType] = React.useState("")
  const [resources, setResources] = React.useState<Resource[]>([])
  const [models, setModels] = React.useState<Model[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentRes, resourcesRes, configRes] = await Promise.all([
          fetch(`/api/orgs/${params.orgSlug}/agents/${params.agentSlug}`),
          fetch(`/api/orgs/${params.orgSlug}/resources`),
          fetch("/api/config"),
        ])

        if (agentRes.ok) {
          const agentData = await agentRes.json()
          setAgent(agentData)
          setName(agentData.name)
          setModelId(agentData.modelId)
          setSelectedResourceIds(agentData.resourceIds || [])
          setAvatarType(agentData.avatarType || "")
        }

        if (resourcesRes.ok) {
          const resourcesData = await resourcesRes.json()
          setResources(resourcesData)
        }

        if (configRes.ok) {
          const configData = await configRes.json()
          setModels(configData.models || [])
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.orgSlug, params.agentSlug])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const response = await fetch(
        `/api/orgs/${params.orgSlug}/agents/${params.agentSlug}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            modelId,
            resourceIds: selectedResourceIds,
            avatarType: avatarType || undefined,
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update agent")
      }

      setSuccess("Agent updated successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(
        `/api/orgs/${params.orgSlug}/agents/${params.agentSlug}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete agent")
      }

      router.push(`/${params.orgSlug}/agents`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsDeleting(false)
    }
  }

  const toggleResource = (resourceId: string) => {
    setSelectedResourceIds((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full max-w-lg" />
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${params.orgSlug}/agents`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bot className="h-8 w-8" />
              {agent.name}
            </h1>
            <p className="text-muted-foreground">
              Configure agent settings
            </p>
          </div>
        </div>
        <Link href={`/${params.orgSlug}/agents/${params.agentSlug}/jobs`}>
          <Button>
            <Play className="mr-2 h-4 w-4" />
            Run Agent
          </Button>
        </Link>
      </div>

      <Card className="max-w-lg">
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Update agent configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarType">Avatar (Emoji)</Label>
              <Input
                id="avatarType"
                value={avatarType}
                onChange={(e) => setAvatarType(e.target.value)}
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelId">AI Model</Label>
              <Select value={modelId} onValueChange={setModelId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.slug} value={m.slug}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resources</Label>
              {resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No resources available.
                </p>
              ) : (
                <div className="space-y-2 border rounded-md p-4">
                  {resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={resource.id}
                        checked={selectedResourceIds.includes(resource.id)}
                        onCheckedChange={() => toggleResource(resource.id)}
                      />
                      <label
                        htmlFor={resource.id}
                        className="text-sm font-medium leading-none"
                      >
                        {resource.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="max-w-lg border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete Agent"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  agent &quot;{agent.name}&quot; and all associated job history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
