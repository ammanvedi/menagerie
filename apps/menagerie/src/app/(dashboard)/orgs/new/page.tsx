"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2 } from "lucide-react"

export default function NewOrgPage() {
  const router = useRouter()
  const { refreshOrgs, setCurrentOrg } = useApp()
  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create organisation")
      }

      const org = await response.json()
      await refreshOrgs()
      setCurrentOrg(org)
      router.push(`/${org.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Organisation
          </CardTitle>
          <CardDescription>
            Create a new organisation to manage your agents and resources.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Organisation Name</Label>
              <Input
                id="name"
                placeholder="My Company"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                placeholder="my-company"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              />
              <p className="text-sm text-muted-foreground">
                This will be used in URLs: menagerie.app/{slug || "your-slug"}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Organisation"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
