"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { authClient } from "@/lib/client"
import { SidebarProvider } from "@/components/ui/sidebar"

interface Organisation {
  id: string
  name: string
  slug: string
}

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface AppContextValue {
  orgs: Organisation[]
  currentOrg: Organisation | null
  setCurrentOrg: (org: Organisation) => void
  user: User | null
  isLoading: boolean
  refreshOrgs: () => Promise<void>
}

const AppContext = React.createContext<AppContextValue | null>(null)

export function useApp() {
  const context = React.useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}

interface AppProviderProps {
  children: React.ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [orgs, setOrgs] = React.useState<Organisation[]>([])
  const [currentOrg, setCurrentOrgState] = React.useState<Organisation | null>(null)
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchOrgs = React.useCallback(async () => {
    try {
      const response = await fetch("/api/orgs")
      if (response.ok) {
        const data = await response.json()
        setOrgs(data)
        return data
      }
    } catch (error) {
      console.error("Failed to fetch organisations:", error)
    }
    return []
  }, [])

  const refreshOrgs = React.useCallback(async () => {
    await fetchOrgs()
  }, [fetchOrgs])

  // Fetch user session on mount
  React.useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await authClient.getSession()
        if (session?.data?.user) {
          setUser({
            id: session.data.user.id,
            name: session.data.user.name ?? null,
            email: session.data.user.email,
            image: session.data.user.image ?? null,
          })
          const orgsData = await fetchOrgs()
          
          // Try to get org from URL
          const pathParts = pathname.split("/").filter(Boolean)
          if (pathParts.length > 0) {
            const orgFromPath = orgsData.find((o: Organisation) => o.slug === pathParts[0])
            if (orgFromPath) {
              setCurrentOrgState(orgFromPath)
            } else if (orgsData.length > 0) {
              setCurrentOrgState(orgsData[0])
            }
          } else if (orgsData.length > 0) {
            setCurrentOrgState(orgsData[0])
          }
        }
      } catch (error) {
        console.error("Failed to fetch session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()
  }, [fetchOrgs, pathname])

  const setCurrentOrg = React.useCallback((org: Organisation) => {
    setCurrentOrgState(org)
    // Navigate to the new org's dashboard
    router.push(`/${org.slug}`)
  }, [router])

  const value = React.useMemo(
    () => ({
      orgs,
      currentOrg,
      setCurrentOrg,
      user,
      isLoading,
      refreshOrgs,
    }),
    [orgs, currentOrg, setCurrentOrg, user, isLoading, refreshOrgs]
  )

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppProvider>{children}</AppProvider>
    </SidebarProvider>
  )
}
