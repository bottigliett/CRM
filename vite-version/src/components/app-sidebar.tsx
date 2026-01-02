"use client"

import * as React from "react"
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Users,
  Wallet,
  Briefcase,
  Contact,
  Settings,
  FileText,
  FolderKanban,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Logo } from "@/components/logo"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavPinProtection } from "@/components/nav-pin-protection"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/store/auth-store"

interface NavItem {
  title: string
  url: string
  icon?: any
  items?: NavItem[]
  moduleName?: string // Added to map to backend permission module
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const allNavGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        moduleName: "dashboard",
      },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        title: "Lead Board",
        url: "/lead-board",
        icon: Briefcase,
        moduleName: "lead_board",
      },
      {
        title: "Contatti",
        url: "/contacts",
        icon: Contact,
        moduleName: "contacts",
      },
    ],
  },
  {
    label: "Gestione",
    items: [
      {
        title: "Agenda",
        url: "/calendar",
        icon: Calendar,
        moduleName: "calendar",
      },
      {
        title: "Task Manager",
        url: "/tasks",
        icon: CheckSquare,
        moduleName: "tasks",
      },
      {
        title: "Progetti",
        url: "/projects",
        icon: FolderKanban,
        moduleName: "projects",
      },
      {
        title: "Finance Tracker",
        url: "/finance",
        icon: Wallet,
        moduleName: "finance",
      },
      {
        title: "Fatture",
        url: "/invoices",
        icon: FileText,
        moduleName: "invoices",
      },
    ],
  },
  {
    label: "Amministrazione",
    items: [
      {
        title: "Utenti",
        url: "/users",
        icon: Users,
        // No moduleName - only SUPER_ADMIN can access
      },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore()

  const userData = {
    name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : "Ospite",
    email: user?.email || "",
    avatar: user?.profileImage || "",
    role: user?.role || "",
  }

  // Filter navigation items based on user role and permissions
  const getFilteredNavGroups = React.useMemo(() => {
    if (!user) return []

    // SUPER_ADMIN can see everything
    if (user.role === 'SUPER_ADMIN') {
      return allNavGroups
    }

    // ADMIN can only see items they have permission for
    if (user.role === 'ADMIN') {
      const userPermissions = user.permissions || []

      return allNavGroups.map(group => {
        const filteredItems = group.items.filter(item => {
          // "Utenti" page is SUPER_ADMIN only
          if (item.url === '/users') {
            return false
          }

          // Settings is always visible
          if (item.url === '#' || !item.moduleName) {
            return true
          }

          // Check if user has access permission for this module
          const permission = userPermissions.find(p => p.moduleName === item.moduleName)
          return permission && permission.hasAccess
        })

        return {
          ...group,
          items: filteredItems,
        }
      }).filter(group => group.items.length > 0) // Remove empty groups
    }

    // USER role gets minimal access (dashboard and settings)
    return allNavGroups.map(group => {
      if (group.label === 'Overview' || group.label === 'Amministrazione') {
        return {
          ...group,
          items: group.items.filter(item =>
            item.url === '/dashboard' || item.url === '#'
          ),
        }
      }
      return { ...group, items: [] }
    }).filter(group => group.items.length > 0)
  }, [user])

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">MismoStudio</span>
                  <span className="truncate text-xs">Admin Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {getFilteredNavGroups.map((group) => (
          <NavMain key={group.label} label={group.label} items={group.items} />
        ))}
        <NavPinProtection />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
