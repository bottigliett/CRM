"use client"

import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { CircleUser, Palette, BellDot } from "lucide-react"

const settingsNav = [
  {
    title: "Account",
    href: "/settings/account",
    icon: CircleUser,
  },
  {
    title: "Aspetto",
    href: "/settings/appearance",
    icon: Palette,
  },
  {
    title: "Notifiche",
    href: "/settings/notifications",
    icon: BellDot,
  },
]

export function SettingsNav() {
  const location = useLocation()

  return (
    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 lg:max-w-45">
      {settingsNav.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-2 py-2 justify-start",
            location.pathname === item.href
              ? "bg-accent text-accent-foreground"
              : "transparent"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
