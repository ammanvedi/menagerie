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
import { Plug, ArrowLeft, Trash2 } from "lucide-react"

interface Integration {
  id: string
  name: string
  slug: string
  config: Record<string, unknown>
}

// Field definitions for each integration type
const INTEGRATION_FIELDS: Record<string, Array<{ key: string; label: string; type: string }>> = {
  github: [
    { key: "accessToken", label: "Access Token", type: "password" },
  ],
  anthropic: [
    { key: "apiKey", label: "API Key", type: "password" },
  ],
  openai: [
    { key: "apiKey", label: "API Key", type: "password" },
  ],
  vercel: [
    { key: "token", label: "Access Token", type: "password" },
    { key: "teamId", label: "Team ID", type: "text" },
    { key: "projectId", label: "Project ID", type: "text" },
  ],
}

export default function IntegrationDetailPage() {
  const params = useParams<{ orgSlug: string; intSlug: string }>()
  const router = useRouter()
  const [integration, setIntegration] = React.useState<Integration | null>(null)
  const [name, setName] = React.useState("")
  const [config, setConfig] = React.useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchIntegration = async () => {
      try {
        const response = await fetch(
          `/api/orgs/${params.orgSlug}/integrations/${params.intSlug}`
        )
        if (response.ok) {
          const data = await response.json()
          setIntegration(data)
          setName(data.name)
          // Mask existing config values
          const maskedConfig: Record<string, string> = {}
          Object.keys(data.config || {}).forEach((key) => {
            maskedConfig[key] = "" // Don't show existing values for security
          })
          setConfig(maskedConfig)
        }
      } catch (error) {
        console.error("Failed to fetch integration:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchIntegration()
  }, [params.orgSlug, params.intSlug])

  const fields = integration ? INTEGRATION_FIELDS[integration.slug] ?? [] : []

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      // Only include non-empty config values
      const updatedConfig: Record<string, string> = {}
      Object.entries(config).forEach(([key, value]) => {
        if (value) {
          updatedConfig[key] = value
        }
      })

      const response = await fetch(
        `/api/orgs/${params.orgSlug}/integrations/${params.intSlug}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            ...(Object.keys(updatedConfig).length > 0 && { config: updatedConfig }),
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update integration")
      }

      setSuccess("Integration updated successfully")
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
        `/api/orgs/${params.orgSlug}/integrations/${params.intSlug}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete integration")
      }

      router.push(`/${params.orgSlug}/integrations`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    )
  }

  if (!integration) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Integration not found</p>
      </div>
    )
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
            {integration.name}
          </h1>
          <p className="text-muted-foreground">
            Configure {integration.slug} integration
          </p>
        </div>
      </div>

      <Card className="max-w-lg">
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Update integration configuration
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
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  value={config[field.key] ?? ""}
                  onChange={(e) =>
                    setConfig({ ...config, [field.key]: e.target.value })
                  }
                  placeholder="Leave empty to keep existing value"
                />
              </div>
            ))}
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
                {isDeleting ? "Deleting..." : "Delete Integration"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  integration &quot;{integration.name}&quot;. Agents using this integration
                  will no longer be able to access the service.
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
