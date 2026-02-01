"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DashboardProviders, useApp } from "@/components/providers"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { authClient } from "@/lib/client"

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { orgs, currentOrg, setCurrentOrg, user, isLoading } = useApp()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push("/login")
  }

  const handleCreateOrg = () => {
    router.push("/orgs/new")
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-background">
        <div className="w-64 border-r border-border bg-sidebar p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <>
      <AppSidebar
        orgs={orgs}
        currentOrg={currentOrg}
        onOrgChange={setCurrentOrg}
        onCreateOrg={handleCreateOrg}
        user={user}
        onSignOut={handleSignOut}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardProviders>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProviders>
  )
}
