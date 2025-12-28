"use client"

import { Bell } from "lucide-react"
import { useState, useEffect } from "react"
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
import { Check, CheckCheck, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

const notificationTypeLabels = {
  EVENT_REMINDER: { label: "Promemoria", color: "bg-blue-500" },
  EVENT_ASSIGNED: { label: "Evento", color: "bg-green-500" },
  TASK_ASSIGNED: { label: "Task", color: "bg-purple-500" },
  TASK_DUE_SOON: { label: "Scadenza", color: "bg-orange-500" },
  TASK_OVERDUE: { label: "Ritardo", color: "bg-red-500" },
  SYSTEM: { label: "Sistema", color: "bg-gray-500" },
}

export function NotificationsButton() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const response = await notificationsAPI.getNotifications()
      setNotifications(response.data.notifications)
      setUnreadCount(response.data.unreadCount)
    } catch (error: any) {
      // Ignora errori 401 (non autenticato) silenziosamente
      if (error?.response?.status !== 401) {
        console.error('Errore nel caricamento delle notifiche:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [open])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await notificationsAPI.getNotifications()
        setUnreadCount(response.data.unreadCount)
      } catch (error: any) {
        // Ignora errori 401 (non autenticato) silenziosamente
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
      await loadNotifications()
    } catch (error) {
      toast.error('Errore nel segnare la notifica come letta')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      await loadNotifications()
      toast.success('Tutte le notifiche segnate come lette')
    } catch (error) {
      toast.error('Errore nel segnare tutte le notifiche come lette')
    }
  }

  const handleDelete = async (notificationId: number) => {
    try {
      await notificationsAPI.deleteNotification(notificationId)
      await loadNotifications()
      toast.success('Notifica eliminata')
    } catch (error) {
      toast.error('Errore nell\'eliminazione della notifica')
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
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Notifiche</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="cursor-pointer"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Segna tutte lette
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>
            {unreadCount > 0
              ? `Hai ${unreadCount} notifica${unreadCount > 1 ? 'he' : ''} non letta${unreadCount > 1 ? 'e' : ''}`
              : 'Nessuna notifica non letta'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessuna notifica</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const typeInfo = notificationTypeLabels[notification.type]
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      notification.isRead
                        ? "bg-background hover:bg-muted/50"
                        : "bg-muted hover:bg-muted",
                      notification.link && "cursor-pointer"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("w-2 h-2 rounded-full mt-2", typeInfo.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {typeInfo.label}
                            </Badge>
                            {!notification.isRead && (
                              <Badge variant="default" className="text-xs">
                                Nuova
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkAsRead(notification.id)
                                }}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(notification.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
