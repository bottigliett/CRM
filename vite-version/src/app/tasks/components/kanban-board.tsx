"use client"

import { useState } from "react"
import { GripVertical, Calendar, User, Tag, Building2, UserCircle2, Plus, Star } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { cn } from "@/lib/utils"
import { type Task } from "../data/schema"
import { priorities } from "../data/data"
import { TaskDetailModal } from "./task-detail-modal"
import { AddTaskModal } from "./add-task-modal"
import { Button } from "@/components/ui/button"
import { tasksAPI } from "@/lib/tasks-api"
import { toast } from "sonner"

interface KanbanBoardProps {
  tasks: Task[]
  onTaskUpdate?: (task: Task) => void
  onAddTask?: (task: Task) => void
  onTaskDeleted?: (taskId: number) => void
  onTaskUpdated?: (task: Task) => void
}

const activeColumns = [
  { id: "TODO", label: "Da Fare", color: "bg-slate-500" },
  { id: "IN_PROGRESS", label: "In Corso", color: "bg-blue-500" },
  { id: "PENDING", label: "In Attesa", color: "bg-yellow-500" },
]

const completedColumn = { id: "COMPLETED", label: "Completato", color: "bg-green-500" }

export function KanbanBoard({ tasks, onTaskUpdate, onAddTask, onTaskDeleted, onTaskUpdated }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const getTasksByStatus = (status: string) => {
    const filtered = tasks.filter(task => task.status === status)
    // Sort by favorite first, then by id
    return filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      return b.id - a.id
    })
  }

  const handleToggleFavorite = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const newFavoriteState = !task.isFavorite
      const response = await tasksAPI.toggleFavorite(task.id, newFavoriteState)
      if (response.success) {
        console.log('Toggle favorite success:', response.data)
        onTaskUpdated?.(response.data)
        toast.success(newFavoriteState ? 'Aggiunto ai preferiti' : 'Rimosso dai preferiti')
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      toast.error('Errore nell\'aggiornamento del preferito')
    }
  }

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (status: string) => {
    if (draggedTask && draggedTask.status !== status) {
      const updatedTask = { ...draggedTask, status: status as Task['status'] }
      onTaskUpdate?.(updatedTask)
    }
    setDraggedTask(null)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setEditModalOpen(true)
  }

  const handleDeleteTask = (task: Task) => {
    setSelectedTask(task)
    setDeleteDialogOpen(true)
  }

  const handleTaskUpdated = (updatedTask: Task) => {
    onTaskUpdated?.(updatedTask)
  }

  const handleConfirmDelete = async () => {
    if (!selectedTask) return

    try {
      const response = await tasksAPI.deleteTask(selectedTask.id)

      if (response.success) {
        onTaskDeleted?.(selectedTask.id)
        toast.success('Task eliminato con successo')
        setDeleteDialogOpen(false)
        setSelectedTask(null)
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast.error('Errore nell\'eliminazione del task')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "P1":
        return "text-red-500 bg-red-50 border-red-200"
      case "P2":
        return "text-orange-500 bg-orange-50 border-orange-200"
      case "P3":
        return "text-blue-500 bg-blue-50 border-blue-200"
      default:
        return "text-gray-500 bg-gray-50 border-gray-200"
    }
  }

  const getPriorityLabel = (priority: string) => {
    const p = priorities.find(pr => pr.value === priority)
    return p?.label || priority
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setDetailModalOpen(true)
  }

  const completedTasks = getTasksByStatus(completedColumn.id)

  return (
    <>
    <div className="flex flex-col gap-6">
      {/* Header with Add Task Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Board Tasks</h2>
        <AddTaskModal
          onAddTask={onAddTask}
          trigger={
            <Button size="sm" className="cursor-pointer">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Task
            </Button>
          }
        />
      </div>

      {/* Active Tasks */}
      <div className="flex gap-3 min-h-[600px] max-h-[calc(100vh-20rem)] overflow-x-auto">
        {activeColumns.map(column => {
          const columnTasks = getTasksByStatus(column.id)

          return (
            <div
              key={column.id}
              className="flex-1 min-w-[280px] flex flex-col"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className={cn("w-3 h-3 rounded-full", column.color)} />
              <h3 className="font-semibold text-sm">{column.label}</h3>
              <Badge variant="secondary" className="ml-auto">
                {columnTasks.length}
              </Badge>
            </div>

            {/* Column Content */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
              {columnTasks.map(task => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  onClick={() => handleTaskClick(task)}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium leading-tight flex-1 flex items-center gap-1.5">
                        {task.isFavorite && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
                        {task.title}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Star
                          className={`w-4 h-4 cursor-pointer transition-colors ${task.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'}`}
                          onClick={(e) => handleToggleFavorite(task, e)}
                        />
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Description */}
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Category */}
                    {task.category && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: task.category.color || '#gray' }}
                          />
                          <span className="text-xs">{task.category.name}</span>
                        </div>
                      </div>
                    )}

                    {/* Deadline */}
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className={cn(
                        new Date(task.deadline) < new Date() && task.status !== "COMPLETED"
                          ? "text-red-500 font-medium"
                          : "text-muted-foreground"
                      )}>
                        {format(new Date(task.deadline), "dd MMM yyyy", { locale: it })}
                      </span>
                    </div>

                    {/* Priority */}
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getPriorityColor(task.priority))}
                    >
                      {getPriorityLabel(task.priority)}
                    </Badge>

                    {/* Assigned User */}
                    {task.assignedUser && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-[10px]">
                            {task.assignedUser.firstName?.[0]}{task.assignedUser.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {task.assignedUser.firstName} {task.assignedUser.lastName}
                        </span>
                      </div>
                    )}

                    {/* Client */}
                    {task.contact && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {task.contact.type === 'COMPANY' ? (
                          <Building2 className="w-3 h-3" />
                        ) : (
                          <UserCircle2 className="w-3 h-3" />
                        )}
                        <span>{task.contact.name}</span>
                      </div>
                    )}

                    {/* Hours */}
                    {(task.estimatedHours !== undefined || task.actualHours !== undefined) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>
                          {task.actualHours ? `${task.actualHours}h` : '0h'} / {task.estimatedHours ? `${task.estimatedHours}h` : '-'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {columnTasks.length === 0 && (
                <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg text-sm text-muted-foreground">
                  Nessun task
                </div>
              )}
            </div>
          </div>
        )
      })}
      </div>

      {/* Completed Tasks Section */}
      {completedTasks.length > 0 && (
        <div className="border-t pt-4">
          <div
            className="flex flex-col"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(completedColumn.id)}
          >
            {/* Completed Header */}
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className={cn("w-3 h-3 rounded-full", completedColumn.color)} />
              <h3 className="font-semibold text-sm">{completedColumn.label}</h3>
              <Badge variant="secondary" className="ml-2">
                {completedTasks.length}
              </Badge>
            </div>

            {/* Completed Tasks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto px-2">
              {completedTasks.map(task => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  onClick={() => handleTaskClick(task)}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium leading-tight flex-1 flex items-center gap-1.5">
                        {task.isFavorite && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
                        {task.title}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Star
                          className={`w-4 h-4 cursor-pointer transition-colors ${task.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'}`}
                          onClick={(e) => handleToggleFavorite(task, e)}
                        />
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Description */}
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Category */}
                    {task.category && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: task.category.color || '#gray' }}
                          />
                          <span className="text-xs">{task.category.name}</span>
                        </div>
                      </div>
                    )}

                    {/* Deadline */}
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {format(new Date(task.deadline), "dd MMM yyyy", { locale: it })}
                      </span>
                    </div>

                    {/* Priority */}
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getPriorityColor(task.priority))}
                    >
                      {getPriorityLabel(task.priority)}
                    </Badge>

                    {/* Assigned User */}
                    {task.assignedUser && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-[10px]">
                            {task.assignedUser.firstName?.[0]}{task.assignedUser.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {task.assignedUser.firstName} {task.assignedUser.lastName}
                        </span>
                      </div>
                    )}

                    {/* Client */}
                    {task.contact && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {task.contact.type === 'COMPANY' ? (
                          <Building2 className="w-3 h-3" />
                        ) : (
                          <UserCircle2 className="w-3 h-3" />
                        )}
                        <span>{task.contact.name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>

    <TaskDetailModal
      task={selectedTask}
      open={detailModalOpen}
      onOpenChange={setDetailModalOpen}
      onEdit={handleEditTask}
      onDelete={handleDeleteTask}
    />

    <AddTaskModal
      open={editModalOpen}
      onOpenChange={setEditModalOpen}
      onTaskAdded={handleTaskUpdated}
      editTask={selectedTask}
    />

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
          <AlertDialogDescription>
            Questa azione non può essere annullata. Il task "{selectedTask?.title}" verrà eliminato permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Elimina
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
