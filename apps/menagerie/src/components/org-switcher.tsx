"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Building2 } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export interface Organisation {
  id: string
  name: string
  slug: string
}

interface OrgSwitcherProps {
  orgs: Organisation[]
  currentOrg: Organisation | null
  onOrgChange: (org: Organisation) => void
  onCreateOrg: () => void
}

export function OrgSwitcher({
  orgs,
  currentOrg,
  onOrgChange,
  onCreateOrg,
}: OrgSwitcherProps) {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentOrg?.name ?? "Select Organisation"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {currentOrg?.slug ?? "Choose an organisation"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organisations
            </DropdownMenuLabel>
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => onOrgChange(org)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                  <Building2 className="size-4 shrink-0" />
                </div>
                <span className="truncate">{org.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateOrg} className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Create Organisation
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
