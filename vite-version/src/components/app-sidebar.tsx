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
  Timer,
  UserCheck,
  MessageSquare,
  Megaphone,
  Code,
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
import { useModuleSettingsStore } from "@/store/module-settings-store"
import { ticketsAPI } from "@/lib/tickets-api"

interface NavItem {
  title: string
  url: string
  icon?: any
  items?: NavItem[]
  moduleName?: string // Added to map to backend permission module
  badge?: number
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
      {
        title: "On Duty",
        url: "/on-duty",
        icon: Timer,
        moduleName: "on_duty",
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
      {
        title: "Clienti",
        url: "/clients",
        icon: UserCheck,
        moduleName: "clients",
      },
      {
        title: "Ticket",
        url: "/tickets",
        icon: MessageSquare,
        moduleName: "tickets",
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

// Developer-only navigation group
const developerNavGroup: NavGroup = {
  label: "Developer",
  items: [
    {
      title: "Annunci",
      url: "/developer/announcements",
      icon: Megaphone,
    },
    {
      title: "Sandbox",
      url: "/developer/sandbox",
      icon: Code,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore()
  const { enabledModules, fetchEnabledModules } = useModuleSettingsStore()
  const [unreadTicketCount, setUnreadTicketCount] = React.useState(0)

  // Fetch enabled modules on mount
  React.useEffect(() => {
    if (user) {
      fetchEnabledModules()
    }
  }, [user, fetchEnabledModules])

  // Fetch unread ticket count
  React.useEffect(() => {
    if (!user) return

    const fetchUnreadCount = async () => {
      try {
        const response = await ticketsAPI.getUnreadCount()
        if (response.success) {
          setUnreadTicketCount(response.data.count)
        }
      } catch (error) {
        console.error('Error fetching unread ticket count:', error)
      }
    }

    // Initial fetch
    fetchUnreadCount()

    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [user])

  // Helper: Check if module is globally enabled
  const isModuleGloballyEnabled = (moduleName?: string) => {
    if (!moduleName) return true
    // DEVELOPER always sees all modules
    if (user?.role === 'DEVELOPER') return true
    // If enabledModules not loaded yet, show all (graceful degradation)
    if (enabledModules.length === 0) return true
    return enabledModules.includes(moduleName)
  }

  const userData = {
    name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : "Ospite",
    email: user?.email || "",
    avatar: user?.profileImage || "",
    role: user?.role || "",
  }

  // Filter navigation items based on user role and permissions
  const getFilteredNavGroups = React.useMemo(() => {
    if (!user) return []

    // Helper function to add badge to ticket item
    const addBadgeToItems = (items: NavItem[]) => {
      return items.map(item => {
        if (item.url === '/tickets') {
          return { ...item, badge: unreadTicketCount }
        }
        return item
      })
    }

    // Helper function to filter by global module visibility
    const filterByGlobalVisibility = (items: NavItem[]) => {
      return items.filter(item => isModuleGloballyEnabled(item.moduleName))
    }

    // DEVELOPER has full access plus developer tools
    if (user.role === 'DEVELOPER') {
      const groups = allNavGroups.map(group => ({
        ...group,
        items: addBadgeToItems(group.items),
      }))
      // Add developer section
      groups.push(developerNavGroup)
      return groups
    }

    // SUPER_ADMIN can see everything (but not developer tools), filtered by global visibility
    if (user.role === 'SUPER_ADMIN') {
      return allNavGroups.map(group => ({
        ...group,
        items: addBadgeToItems(filterByGlobalVisibility(group.items)),
      })).filter(group => group.items.length > 0)
    }

    // ADMIN can only see items they have permission for, filtered by global visibility
    if (user.role === 'ADMIN') {
      const userPermissions = user.permissions || []

      return allNavGroups.map(group => {
        const filteredItems = group.items.filter(item => {
          // First check global visibility
          if (!isModuleGloballyEnabled(item.moduleName)) {
            return false
          }

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
          items: addBadgeToItems(filteredItems),
        }
      }).filter(group => group.items.length > 0) // Remove empty groups
    }

    // USER role gets minimal access (dashboard and settings), filtered by global visibility
    return allNavGroups.map(group => {
      if (group.label === 'Overview' || group.label === 'Amministrazione') {
        return {
          ...group,
          items: addBadgeToItems(filterByGlobalVisibility(group.items.filter(item =>
            item.url === '/dashboard' || item.url === '#'
          ))),
        }
      }
      return { ...group, items: [] }
    }).filter(group => group.items.length > 0)
  }, [user, unreadTicketCount, enabledModules])

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
