"use client"

import * as React from "react"
import { X, Info, AlertTriangle, Wrench, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { clientAnnouncementsAPI, type ClientSystemAnnouncement } from "@/lib/client-announcements-api"

const DISMISSED_KEY = "client_dismissed_announcements"

const typeConfig = {
  INFO: {
    icon: Info,
    bgClass: "bg-blue-50 dark:bg-blue-950/50",
    borderClass: "border-blue-200 dark:border-blue-800",
    textClass: "text-blue-800 dark:text-blue-200",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  WARNING: {
    icon: AlertTriangle,
    bgClass: "bg-yellow-50 dark:bg-yellow-950/50",
    borderClass: "border-yellow-200 dark:border-yellow-800",
    textClass: "text-yellow-800 dark:text-yellow-200",
    iconClass: "text-yellow-600 dark:text-yellow-400",
  },
  MAINTENANCE: {
    icon: Wrench,
    bgClass: "bg-orange-50 dark:bg-orange-950/50",
    borderClass: "border-orange-200 dark:border-orange-800",
    textClass: "text-orange-800 dark:text-orange-200",
    iconClass: "text-orange-600 dark:text-orange-400",
  },
  CRITICAL: {
    icon: AlertCircle,
    bgClass: "bg-red-50 dark:bg-red-950/50",
    borderClass: "border-red-200 dark:border-red-800",
    textClass: "text-red-800 dark:text-red-200",
    iconClass: "text-red-600 dark:text-red-400",
  },
}

function getDismissedAnnouncements(): number[] {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function dismissAnnouncement(id: number): void {
  const dismissed = getDismissedAnnouncements()
  if (!dismissed.includes(id)) {
    dismissed.push(id)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
  }
}

interface AnnouncementItemProps {
  announcement: ClientSystemAnnouncement
  onDismiss: (id: number) => void
}

function AnnouncementItem({ announcement, onDismiss }: AnnouncementItemProps) {
  const config = typeConfig[announcement.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 px-4 py-3 border-b",
        config.bgClass,
        config.borderClass
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.iconClass)} />
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-sm", config.textClass)}>
          {announcement.title}
        </p>
        <p className={cn("text-sm mt-0.5 opacity-90", config.textClass)}>
          {announcement.message}
        </p>
      </div>
      {announcement.type !== "CRITICAL" && (
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6 shrink-0", config.textClass, "hover:bg-transparent hover:opacity-70")}
          onClick={() => onDismiss(announcement.id)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Chiudi</span>
        </Button>
      )}
    </div>
  )
}

export function ClientAnnouncementBanner() {
  const [announcements, setAnnouncements] = React.useState<ClientSystemAnnouncement[]>([])
  const [dismissed, setDismissed] = React.useState<number[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const data = await clientAnnouncementsAPI.getActive()
        setAnnouncements(data)
        setDismissed(getDismissedAnnouncements())
      } catch (error) {
        console.error("Failed to load announcements:", error)
      } finally {
        setLoading(false)
      }
    }

    loadAnnouncements()

    // Refresh ogni 5 minuti
    const interval = setInterval(loadAnnouncements, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleDismiss = (id: number) => {
    dismissAnnouncement(id)
    setDismissed((prev) => [...prev, id])
  }

  // Filtra annunci non dismessi, ordina per priorità (CRITICAL prima)
  const visibleAnnouncements = announcements
    .filter((a) => !dismissed.includes(a.id))
    .sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, MAINTENANCE: 1, WARNING: 2, INFO: 3 }
      return priorityOrder[a.type] - priorityOrder[b.type] || b.priority - a.priority
    })

  if (loading || visibleAnnouncements.length === 0) {
    return null
  }

  return (
    <div className="w-full">
      {visibleAnnouncements.map((announcement) => (
        <AnnouncementItem
          key={announcement.id}
          announcement={announcement}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  )
}
