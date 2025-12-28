"use client"

import { useState } from "react"
import { CalendarIcon, Clock, MapPin, User, X, Pencil, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { it } from 'date-fns/locale'
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { type CalendarEvent } from "../types"

interface EventPreviewProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
  onDelete?: () => void
}

export function EventPreview({ event, open, onOpenChange, onEdit, onDelete }: EventPreviewProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  if (!event) return null

  const handleEdit = () => {
    onEdit?.()
    onOpenChange(false)
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = () => {
    onDelete?.()
    setShowDeleteDialog(false)
    onOpenChange(false)
    toast.success("Evento eliminato", {
      description: `L'evento "${event.title}" è stato rimosso`
    })
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div
                className="w-1 h-full rounded-full mt-1"
                style={{ backgroundColor: event.color, minHeight: '24px' }}
              />
              <div className="flex-1">
                <DialogTitle className="text-xl">{event.title}</DialogTitle>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Data e Ora */}
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">
                {format(event.date, 'EEEE d MMMM yyyy', { locale: it })}
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {event.time} • {event.duration}
              </div>
            </div>
          </div>

          {/* Responsabile */}
          {event.assignedTo && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Responsabile</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ID Utente: {event.assignedTo}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Cliente */}
          {event.contactName && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Cliente</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {event.contactName}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Location */}
          {event.location && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Luogo</div>
                  <div className="text-sm text-muted-foreground mt-1">{event.location}</div>
                </div>
              </div>
            </>
          )}

          {/* Partecipanti */}
          {event.attendees && event.attendees.length > 0 && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium mb-2">Partecipanti</div>
                  <div className="flex flex-wrap gap-2">
                    {event.attendees.map((attendee, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {attendee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{attendee}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <Separator className="mt-6" />
        <div className="flex gap-2 justify-end mt-4">
          <Button
            variant="outline"
            onClick={handleEdit}
            className="cursor-pointer"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Modifica
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteClick}
            className="cursor-pointer"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Elimina
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare l'evento <strong>{event.title}</strong>?
            Questa azione non può essere annullata.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
          >
            Elimina
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  )
}
