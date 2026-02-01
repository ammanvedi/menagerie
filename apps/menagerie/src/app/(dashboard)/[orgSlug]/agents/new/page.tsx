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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Bot, ArrowLeft } from "lucide-react"

interface Model {
  slug: string
  name: string
}

interface Resource {
  id: string
  name: string
  slug: string
}

export default function NewAgentPage() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [modelId, setModelId] = React.useState("")
  const [selectedResourceIds, setSelectedResourceIds] = React.useState<string[]>([])
  const [avatarType, setAvatarType] = React.useState("")
  const [resources, setResources] = React.useState<Resource[]>([])
  const [models, setModels] = React.useState<Model[]>([])
  const [isLoadingResources, setIsLoadingResources] = React.useState(true)
  const [isLoadingModels, setIsLoadingModels] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Auto-generate slug from name
  React.useEffect(() => {
    const generated = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    setSlug(generated)
  }, [name])

  // Fetch models from config
  React.useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/config")
        if (response.ok) {
          const data = await response.json()
          setModels(data.models || [])
        }
      } catch (error) {
        console.error("Failed to fetch models:", error)
      } finally {
        setIsLoadingModels(false)
      }
    }

    fetchModels()
  }, [])

  // Fetch resources
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
        setIsLoadingResources(false)
      }
    }

    fetchResources()
  }, [params.orgSlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/orgs/${params.orgSlug}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          modelId,
          resourceIds: selectedResourceIds,
          avatarType: avatarType || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create agent")
      }

      router.push(`/${params.orgSlug}/agents`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleResource = (resourceId: string) => {
    setSelectedResourceIds((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${params.orgSlug}/agents`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Create Agent
          </h1>
          <p className="text-muted-foreground">
            Configure a new AI agent
          </p>
        </div>
      </div>

      <Card className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Agent Details</CardTitle>
            <CardDescription>
              Set up your agent&apos;s identity and capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                placeholder="Code Assistant"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                placeholder="code-assistant"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarType">Avatar (Emoji)</Label>
              <Input
                id="avatarType"
                placeholder="🤖"
                value={avatarType}
                onChange={(e) => setAvatarType(e.target.value)}
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelId">AI Model</Label>
              {isLoadingModels ? (
                <Skeleton className="h-10 w-full" />
              ) : (
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
              )}
            </div>

            <div className="space-y-2">
              <Label>Resources</Label>
              {isLoadingResources ? (
                <Skeleton className="h-20 w-full" />
              ) : resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No resources available.{" "}
                  <Link
                    href={`/${params.orgSlug}/resources/new`}
                    className="text-primary hover:underline"
                  >
                    Create one
                  </Link>
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
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {resource.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href={`/${params.orgSlug}/agents`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={!modelId || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Agent"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
