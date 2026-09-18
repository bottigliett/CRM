"use client"

import {
  Bell,
  Calendar,
  CalendarClock,
  CheckSquare,
  Clock,
  AlertTriangle,
  Info,
  Check,
  CheckCheck,
  Trash2,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { notificationsAPI, type Notification } from "@/lib/notifications-api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"

const notificationTypeInfo: Record<string, { label: string; Icon: any }> = {
  EVENT_REMINDER: { label: "Promemoria", Icon: CalendarClock },
  EVENT_ASSIGNED: { label: "Evento", Icon: Calendar },
  TASK_ASSIGNED: { label: "Task", Icon: CheckSquare },
  TASK_DUE_SOON: { label: "Scadenza", Icon: Clock },
  TASK_OVERDUE: { label: "Ritardo", Icon: AlertTriangle },
  SYSTEM: { label: "Sistema", Icon: Info },
}

type Filter = "all" | "unread"

export function NotificationsButton() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<Filter>("all")
  const navigate = useNavigate()

  const loadNotifications = async (activeFilter: Filter = filter) => {
    try {
      setLoading(true)
      const response = await notificationsAPI.getNotifications(activeFilter === "unread")
      setNotifications(response.data.notifications)
      setUnreadCount(response.data.unreadCount)
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error('Errore nel caricamento delle notifiche:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadNotifications(filter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filter])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await notificationsAPI.getNotifications(false)
        setUnreadCount(response.data.unreadCount)
      } catch (error: any) {
        if (error?.response?.status !== 401) {
          console.error('Errore nel polling delle notifiche:', error)
        }
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsAPI.markAsRead(notificationId)
      await loadNotifications(filter)
    } catch {
      toast.error('Errore nel segnare la notifica come letta')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      await loadNotifications(filter)
      toast.success('Tutte le notifiche segnate come lette')
    } catch {
      toast.error('Errore nel segnare tutte le notifiche come lette')
    }
  }

  const handleDelete = async (notificationId: number) => {
    try {
      await notificationsAPI.deleteNotification(notificationId)
      await loadNotifications(filter)
      toast.success('Notifica eliminata')
    } catch {
      toast.error("Errore nell'eliminazione della notifica")
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id)
    }
    if (notification.link) {
      setOpen(false)
      navigate(notification.link)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative cursor-pointer">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifiche
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="cursor-pointer"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Segna tutte lette
            </Button>
          </div>
          <SheetDescription>
            {unreadCount > 0
              ? `Hai ${unreadCount} notifica${unreadCount === 1 ? '' : 'he'} non letta${unreadCount === 1 ? '' : 'e'}`
              : 'Sei al passo con tutto'}
          </SheetDescription>

          {/* Filter */}
          <div className="flex gap-1 bg-muted rounded-lg p-0.5 mt-2">
            {([
              { key: 'all', label: 'Tutte' },
              { key: 'unread', label: 'Non lette' },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  filter === f.key
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                {f.key === 'unread' && unreadCount > 0 && (
                  <span className="ml-1 text-muted-foreground">({unreadCount})</span>
                )}
              </button>
            ))}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full border p-4 mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">Nessuna notifica</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === 'unread'
                  ? 'Nessuna notifica non letta'
                  : 'Quando ci saranno novità le troverai qui'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => {
                const info = notificationTypeInfo[notification.type] || {
                  label: notification.type,
                  Icon: Info,
                }
                const { Icon } = info
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group p-3 rounded-lg border transition-colors",
                      notification.isRead
                        ? "bg-background hover:bg-muted/40 border-transparent"
                        : "bg-muted/60 hover:bg-muted border",
                      notification.link && "cursor-pointer"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-md flex items-center justify-center shrink-0 border",
                          notification.isRead
                            ? "bg-background text-muted-foreground"
                            : "bg-foreground text-background"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {info.label}
                            </span>
                            {!notification.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkAsRead(notification.id)
                                }}
                                title="Segna come letta"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(notification.id)
                              }}
                              title="Elimina"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <h4
                          className={cn(
                            "text-sm mb-0.5",
                            notification.isRead ? "font-medium" : "font-semibold"
                          )}
                        >
                          {notification.title}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: it,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
