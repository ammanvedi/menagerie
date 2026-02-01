"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Bot,
  Plug,
  FolderCog,
  Settings,
  Home,
  Play,
  LogOut,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { OrgSwitcher, type Organisation } from "@/components/org-switcher"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  orgs: Organisation[]
  currentOrg: Organisation | null
  onOrgChange: (org: Organisation) => void
  onCreateOrg: () => void
  user: {
    name: string | null
    email: string
    image: string | null
  } | null
  onSignOut: () => void
}

export function AppSidebar({
  orgs,
  currentOrg,
  onOrgChange,
  onCreateOrg,
  user,
  onSignOut,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname()
  const orgSlug = currentOrg?.slug

  const navItems: NavItem[] = orgSlug
    ? [
        {
          title: "Overview",
          url: `/${orgSlug}`,
          icon: Home,
        },
        {
          title: "Agents",
          url: `/${orgSlug}/agents`,
          icon: Bot,
        },
        {
          title: "Resources",
          url: `/${orgSlug}/resources`,
          icon: FolderCog,
        },
        {
          title: "Integrations",
          url: `/${orgSlug}/integrations`,
          icon: Plug,
        },
        {
          title: "Jobs",
          url: `/${orgSlug}/jobs`,
          icon: Play,
        },
        {
          title: "Settings",
          url: `/${orgSlug}/settings`,
          icon: Settings,
        },
      ]
    : []

  const isActive = (url: string) => {
    if (url === `/${orgSlug}`) {
      return pathname === url
    }
    return pathname.startsWith(url)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrgSwitcher
          orgs={orgs}
          currentOrg={currentOrg}
          onOrgChange={onOrgChange}
          onCreateOrg={onCreateOrg}
        />
      </SidebarHeader>
      <SidebarContent>
        {orgSlug && (
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
                      <AvatarFallback className="rounded-lg">
                        {user.name?.slice(0, 2).toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={onSignOut}>
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
