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
import { FolderCog, ArrowLeft, Trash2 } from "lucide-react"

interface Resource {
  id: string
  name: string
  slug: string
  config: Record<string, unknown>
}

export default function ResourceDetailPage() {
  const params = useParams<{ orgSlug: string; resSlug: string }>()
  const router = useRouter()
  const [resource, setResource] = React.useState<Resource | null>(null)
  const [name, setName] = React.useState("")
  const [config, setConfig] = React.useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchResource = async () => {
      try {
        const response = await fetch(
          `/api/orgs/${params.orgSlug}/resources/${params.resSlug}`
        )
        if (response.ok) {
          const data = await response.json()
          setResource(data)
          setName(data.name)
          // Convert config values to strings for the form
          const stringConfig: Record<string, string> = {}
          Object.entries(data.config || {}).forEach(([key, value]) => {
            stringConfig[key] = String(value)
          })
          setConfig(stringConfig)
        }
      } catch (error) {
        console.error("Failed to fetch resource:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchResource()
  }, [params.orgSlug, params.resSlug])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const response = await fetch(
        `/api/orgs/${params.orgSlug}/resources/${params.resSlug}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, config }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update resource")
      }

      setSuccess("Resource updated successfully")
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
        `/api/orgs/${params.orgSlug}/resources/${params.resSlug}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete resource")
      }

      router.push(`/${params.orgSlug}/resources`)
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

  if (!resource) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Resource not found</p>
      </div>
    )
  }

  const configKeys = Object.keys(config)

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
            {resource.name}
          </h1>
          <p className="text-muted-foreground">
            Configure {resource.slug} resource
          </p>
        </div>
      </div>

      <Card className="max-w-lg">
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Update resource configuration
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

            {configKeys.map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{key}</Label>
                <Input
                  id={key}
                  value={config[key] ?? ""}
                  onChange={(e) =>
                    setConfig({ ...config, [key]: e.target.value })
                  }
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
                {isDeleting ? "Deleting..." : "Delete Resource"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  resource &quot;{resource.name}&quot;. Agents using this resource will
                  need to be reconfigured.
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
