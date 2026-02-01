"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
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
import { FolderCog, ArrowLeft } from "lucide-react"
import Link from "next/link"

// Resource templates from YAML config
const RESOURCE_TEMPLATES = [
  {
    slug: "github-repo",
    name: "GitHub Repository",
    description: "Clone and work with a GitHub repository",
    requiredIntegrations: ["github"],
    fields: [
      { key: "owner", label: "Repository Owner", type: "text", required: true },
      { key: "repo", label: "Repository Name", type: "text", required: true },
      { key: "branch", label: "Branch", type: "text", required: false, default: "main" },
    ],
  },
  {
    slug: "empty-workspace",
    name: "Empty Workspace",
    description: "Start with an empty workspace directory",
    requiredIntegrations: [],
    fields: [],
  },
  {
    slug: "claude-code",
    name: "Claude Code",
    description: "Claude Code AI coding assistant with Claude Code Router",
    requiredIntegrations: ["anthropic"],
    fields: [
      { key: "routerPort", label: "Router Port", type: "number", required: false, default: "3456" },
      { key: "timeout", label: "API Timeout", type: "text", required: false, default: "10m" },
    ],
  },
]

export default function NewResourcePage() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>("")
  const [name, setName] = React.useState("")
  const [config, setConfig] = React.useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const template = RESOURCE_TEMPLATES.find((t) => t.slug === selectedTemplate)

  const handleTemplateChange = (slug: string) => {
    setSelectedTemplate(slug)
    const tmpl = RESOURCE_TEMPLATES.find((t) => t.slug === slug)
    if (tmpl) {
      setName(tmpl.name)
      // Set defaults
      const defaults: Record<string, string> = {}
      tmpl.fields.forEach((field) => {
        if (field.default) {
          defaults[field.key] = field.default
        }
      })
      setConfig(defaults)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/orgs/${params.orgSlug}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: selectedTemplate,
          name,
          config,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create resource")
      }

      router.push(`/${params.orgSlug}/resources`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${params.orgSlug}/resources`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderCog className="h-8 w-8" />
            Add Resource
          </h1>
          <p className="text-muted-foreground">
            Configure a new resource for agents
          </p>
        </div>
      </div>

      <Card className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Resource Details</CardTitle>
            <CardDescription>
              Choose a resource template and configure its settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="type">Resource Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resource template" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TEMPLATES.map((tmpl) => (
                    <SelectItem key={tmpl.slug} value={tmpl.slug}>
                      {tmpl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {template && (
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              )}
              {template && template.requiredIntegrations.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Requires: {template.requiredIntegrations.join(", ")}
                </p>
              )}
            </div>

            {template && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {template.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type={field.type}
                      value={config[field.key] ?? ""}
                      onChange={(e) =>
                        setConfig({ ...config, [field.key]: e.target.value })
                      }
                      required={field.required}
                      placeholder={field.default || undefined}
                    />
                  </div>
                ))}
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href={`/${params.orgSlug}/resources`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={!template || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Resource"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
