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
import { Plug, ArrowLeft } from "lucide-react"
import Link from "next/link"

// Integration definitions from YAML config
const INTEGRATION_TEMPLATES = [
  {
    slug: "github",
    name: "GitHub",
    description: "Connect to GitHub for repository access and Git operations",
    fields: [
      { key: "accessToken", label: "Access Token", type: "password", required: true },
    ],
  },
  {
    slug: "anthropic",
    name: "Anthropic",
    description: "Connect to Anthropic API for Claude models",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", required: true },
    ],
  },
  {
    slug: "openai",
    name: "OpenAI",
    description: "Connect to OpenAI API for GPT models",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", required: true },
    ],
  },
  {
    slug: "vercel",
    name: "Vercel",
    description: "Vercel platform access for sandbox creation and deployment",
    fields: [
      { key: "token", label: "Access Token", type: "password", required: true },
      { key: "teamId", label: "Team ID", type: "text", required: true },
      { key: "projectId", label: "Project ID", type: "text", required: true },
    ],
  },
]

export default function NewIntegrationPage() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>("")
  const [name, setName] = React.useState("")
  const [config, setConfig] = React.useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const template = INTEGRATION_TEMPLATES.find((t) => t.slug === selectedTemplate)

  const handleTemplateChange = (slug: string) => {
    setSelectedTemplate(slug)
    const tmpl = INTEGRATION_TEMPLATES.find((t) => t.slug === slug)
    if (tmpl) {
      setName(tmpl.name)
      setConfig({})
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/orgs/${params.orgSlug}/integrations`, {
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
        throw new Error(data.error || "Failed to create integration")
      }

      router.push(`/${params.orgSlug}/integrations`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${params.orgSlug}/integrations`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Plug className="h-8 w-8" />
            Add Integration
          </h1>
          <p className="text-muted-foreground">
            Connect a new external service
          </p>
        </div>
      </div>

      <Card className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Integration Details</CardTitle>
            <CardDescription>
              Choose an integration type and configure its settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="type">Integration Type</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select integration type" />
                </SelectTrigger>
                <SelectContent>
                  {INTEGRATION_TEMPLATES.map((tmpl) => (
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
                    />
                  </div>
                ))}
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href={`/${params.orgSlug}/integrations`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={!template || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Integration"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
