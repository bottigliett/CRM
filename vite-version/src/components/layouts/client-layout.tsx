"use client"

import * as React from "react"
import { ClientSidebar } from "@/components/client-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

interface ClientLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  headerAction?: React.ReactNode
}

export function ClientLayout({ children, title, description, headerAction }: ClientLayoutProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <ClientSidebar side="left" collapsible="icon" variant="sidebar" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {title && (
                <div className="px-4 lg:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                      {description && (
                        <p className="text-muted-foreground">{description}</p>
                      )}
                    </div>
                    {headerAction && (
                      <div className="flex-shrink-0">
                        {headerAction}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
