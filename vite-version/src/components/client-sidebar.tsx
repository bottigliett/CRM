"use client"

import * as React from "react"
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  FolderOpen,
  Calendar,
  CheckSquare,
  Settings,
  LogOut,
  Receipt,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Logo } from "@/components/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { clientAuthAPI } from "@/lib/client-auth-api"

const navItems = [
  {
    title: "Dashboard",
    url: "/client/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Preventivi",
    url: "/client/quotes",
    icon: FileText,
  },
  {
    title: "Fatture",
    url: "/client/invoices",
    icon: Receipt,
  },
  {
    title: "Ticket",
    url: "/client/tickets",
    icon: MessageSquare,
  },
  {
    title: "Documenti",
    url: "/client/documents",
    icon: FolderOpen,
  },
  {
    title: "Agenda",
    url: "/client/calendar",
    icon: Calendar,
  },
  {
    title: "Task",
    url: "/client/tasks",
    icon: CheckSquare,
  },
]

export function ClientSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate()
  const [clientData, setClientData] = React.useState<any>(null)

  React.useEffect(() => {
    const loadClientData = async () => {
      try {
        const response = await clientAuthAPI.getMe()
        setClientData(response.data)
      } catch (error) {
        console.error('Error loading client data:', error)
        // If error, redirect to login
        navigate('/client/login')
      }
    }
    loadClientData()
  }, [navigate])

  const handleLogout = () => {
    clientAuthAPI.logout()
    navigate('/client/login')
  }

  const userName = clientData?.contact?.name || "Cliente"
  const userEmail = clientData?.contact?.email || ""

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/client/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">MismoStudio</span>
                  <span className="truncate text-xs">Portale Cliente</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {userEmail}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuLabel>Il Mio Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/client/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Impostazioni
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
