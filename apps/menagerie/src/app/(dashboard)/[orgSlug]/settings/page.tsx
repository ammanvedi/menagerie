"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useApp } from "@/components/providers"
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
import { Settings, Trash2 } from "lucide-react"

interface Organisation {
  id: string
  name: string
  slug: string
}

export default function OrgSettingsPage() {
  const params = useParams<{ orgSlug: string }>()
  const router = useRouter()
  const { refreshOrgs } = useApp()
  const [org, setOrg] = React.useState<Organisation | null>(null)
  const [name, setName] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchOrg = async () => {
      try {
        const response = await fetch(`/api/orgs/${params.orgSlug}`)
        if (response.ok) {
          const data = await response.json()
          setOrg(data)
          setName(data.name)
        }
      } catch (error) {
        console.error("Failed to fetch org:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrg()
  }, [params.orgSlug])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/orgs/${params.orgSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update organisation")
      }

      setSuccess("Organisation updated successfully")
      await refreshOrgs()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/orgs/${params.orgSlug}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete organisation")
      }

      await refreshOrgs()
      router.push("/")
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your organisation settings
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Update your organisation details
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
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
              <Label htmlFor="name">Organisation Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <Input value={org?.slug ?? ""} disabled />
              <p className="text-sm text-muted-foreground">
                The URL slug cannot be changed
              </p>
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
                {isDeleting ? "Deleting..." : "Delete Organisation"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  organisation &quot;{org?.name}&quot; and all associated data including
                  agents, integrations, and resources.
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
