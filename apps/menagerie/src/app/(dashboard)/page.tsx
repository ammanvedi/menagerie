"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/components/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Plus } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const { orgs, currentOrg, isLoading } = useApp()

  // If user has an org, redirect to it
  useEffect(() => {
    if (!isLoading && currentOrg) {
      router.push(`/${currentOrg.slug}`)
    }
  }, [currentOrg, isLoading, router])

  // If no orgs, show welcome page
  if (!isLoading && orgs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to Menagerie</h1>
          <p className="text-muted-foreground max-w-md">
            Get started by creating your first organisation. Organisations help you
            manage agents, resources, and integrations.
          </p>
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Create Organisation
            </CardTitle>
            <CardDescription>
              Set up your first organisation to start dispatching agents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/orgs/new")} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create Organisation
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  )
}
