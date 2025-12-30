"use client"

import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Calendar, User, Tag, Building2, UserCircle2, Clock, CheckCircle2, Pencil, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Task } from "../data/schema"
import { priorities, statuses } from "../data/data"

interface TaskDetailModalProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

export function TaskDetailModal({ task, open, onOpenChange, onEdit, onDelete }: TaskDetailModalProps) {
  if (!task) return null

  const status = statuses.find(s => s.value === task.status)
  const priority = priorities.find(p => p.value === task.priority)
  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'COMPLETED'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {task.category && (
              <div
                className="w-3 h-3 rounded-full mt-1 shrink-0"
                style={{ backgroundColor: task.category.color || '#gray' }}
              />
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">
                #{task.id} {task.title}
              </DialogTitle>
              {task.description && (
                <DialogDescription className="mt-2 text-sm">
                  {task.description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status and Priority */}
          <div className="flex flex-wrap gap-2">
            {status && (
              <Badge variant="outline" className="flex items-center gap-1.5">
                {status.icon && <status.icon className="w-3 h-3" />}
                {status.label}
              </Badge>
            )}
            {priority && (
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-1.5",
                  task.priority === "P1" && "text-red-500 bg-red-50 border-red-200",
                  task.priority === "P2" && "text-orange-500 bg-orange-50 border-orange-200",
                  task.priority === "P3" && "text-blue-500 bg-blue-50 border-blue-200"
                )}
              >
                {priority.icon && <priority.icon className="w-3 h-3" />}
                {priority.label}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Category */}
          {task.category && (
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: task.category.color || '#gray' }}
                />
                <span className="text-sm font-medium">{task.category.name}</span>
              </div>
            </div>
          )}

          {/* Assigned Users */}
          {(task.assignedUser || (task.teamMembers && task.teamMembers.length > 0)) && (
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-2">
                  Responsabil{((task.teamMembers?.length || 0) > 0) ? 'i' : 'e'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {task.assignedUser && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[9px]">
                          {task.assignedUser.firstName?.[0]}{task.assignedUser.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {task.assignedUser.firstName} {task.assignedUser.lastName}
                      </span>
                    </div>
                  )}
                  {task.teamMembers?.map(member => (
                    <div key={member.userId} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[9px]">
                          {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {member.user.firstName} {member.user.lastName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact/Client */}
          {task.contact && (
            <div className="flex items-center gap-3">
              {task.contact.type === 'COMPANY' ? (
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <UserCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">{task.contact.name}</p>
                <p className="text-xs text-muted-foreground">Cliente</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Deadline */}
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className={cn(
                "text-sm font-medium",
                isOverdue && "text-red-500"
              )}>
                {format(new Date(task.deadline), "dd MMMM yyyy", { locale: it })}
              </p>
              <p className="text-xs text-muted-foreground">
                Scadenza {isOverdue && "(Scaduto)"}
              </p>
            </div>
          </div>

          {/* Hours */}
          {(task.estimatedHours !== null && task.estimatedHours !== undefined ||
            task.actualHours !== null && task.actualHours !== undefined) && (
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  {task.actualHours || 0}h / {task.estimatedHours || 0}h
                </p>
                <p className="text-xs text-muted-foreground">Ore effettive / Ore stimate</p>
              </div>
            </div>
          )}

          {/* Completed At */}
          {task.completedAt && (
            <>
              <Separator />
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(task.completedAt), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                  </p>
                  <p className="text-xs text-muted-foreground">Completato</p>
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Creato il {format(new Date(task.createdAt), "dd/MM/yyyy 'alle' HH:mm", { locale: it })}</p>
            <p>Modificato il {format(new Date(task.updatedAt), "dd/MM/yyyy 'alle' HH:mm", { locale: it })}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {onDelete && (
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(task)
                onOpenChange(false)
              }}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Elimina
            </Button>
          )}
          {onEdit && (
            <Button
              variant="default"
              onClick={() => {
                onEdit(task)
                onOpenChange(false)
              }}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              Modifica
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
