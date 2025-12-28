"use client"

import { useEffect, useState, useMemo } from "react"
import { LayoutList, LayoutGrid, Filter } from "lucide-react"

import { BaseLayout } from "@/components/layouts/base-layout"
import { createColumns } from "./components/columns"
import { DataTable } from "./components/data-table"
import { KanbanBoard } from "./components/kanban-board"
import { TaskDetailModal } from "./components/task-detail-modal"
import { AddTaskModal } from "./components/add-task-modal"
import { type Task } from "./data/schema"
import { tasksAPI } from "@/lib/tasks-api"
import { usersAPI, type User } from "@/lib/users-api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { useTaskPreferences } from "@/hooks/use-task-preferences"

type ViewMode = "list" | "kanban"

export default function TaskPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [adminUsers, setAdminUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { preferences, setViewMode, setSelectedUserId } = useTaskPreferences()
  const viewMode = preferences.viewMode
  const selectedUserId = preferences.selectedUserId

  const loadTasks = async () => {
    try {
      setLoading(true)
      const [tasksResponse, usersResponse] = await Promise.all([
        tasksAPI.getTasks({ isArchived: false, limit: 1000 }),
        usersAPI.getAdminUsers(),
      ])

      if (tasksResponse.success) {
        setTasks(tasksResponse.data.tasks)
      }

      if (usersResponse.success) {
        setAdminUsers(usersResponse.data.users)
      }
    } catch (error) {
      console.error("Failed to load tasks:", error)
      toast.error("Errore nel caricamento dei task")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  // Filter tasks by selected user and separate active from completed
  const filteredTasks = useMemo(() => {
    if (!selectedUserId) return tasks
    return tasks.filter(task => task.assignedTo === selectedUserId)
  }, [tasks, selectedUserId])

  const activeTasks = useMemo(() => {
    const active = filteredTasks.filter(task => task.status !== 'COMPLETED')
    // Sort by favorite first, then by id
    return active.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      return b.id - a.id
    })
  }, [filteredTasks])

  const completedTasks = useMemo(() => {
    return filteredTasks.filter(task => task.status === 'COMPLETED')
  }, [filteredTasks])

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null
    return adminUsers.find(u => u.id === selectedUserId) || null
  }, [selectedUserId, adminUsers])

  const handleAddTask = (newTask: Task) => {
    setTasks(prev => [newTask, ...prev])
  }

  const handleViewTask = (task: Task) => {
    setSelectedTask(task)
    setDetailModalOpen(true)
  }

  const handleTaskUpdated = (updatedTask: Task) => {
    console.log('handleTaskUpdated called with:', updatedTask)
    setTasks(prev => {
      const newTasks = prev.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
      console.log('Updated tasks:', newTasks.find(t => t.id === updatedTask.id))
      return newTasks
    })
  }

  const columns = createColumns(handleViewTask, handleTaskUpdated)

  const handleTaskUpdate = async (updatedTask: Task) => {
    try {
      // Update task status via API
      const response = await tasksAPI.updateTask(updatedTask.id, {
        status: updatedTask.status,
      })

      if (response.success) {
        // Update local state
        setTasks(prev => prev.map(task =>
          task.id === updatedTask.id ? response.data : task
        ))
        toast.success('Task aggiornato con successo')
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      toast.error('Errore nell\'aggiornamento del task')
      // Reload tasks to ensure consistency
      loadTasks()
    }
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setEditModalOpen(true)
  }

  const handleDeleteTask = (task: Task) => {
    setSelectedTask(task)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedTask) return

    try {
      const response = await tasksAPI.deleteTask(selectedTask.id)

      if (response.success) {
        setTasks(prev => prev.filter(t => t.id !== selectedTask.id))
        toast.success('Task eliminato con successo')
        setDeleteDialogOpen(false)
        setSelectedTask(null)
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast.error('Errore nell\'eliminazione del task')
    }
  }

  if (loading) {
    return (
      <BaseLayout title="Tasks" description="Gestione task e attività">
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Caricamento task...</div>
        </div>
      </BaseLayout>
    )
  }

  return (
    <BaseLayout
      title="Tasks"
      description="Gestione task e attività"
      headerAction={
        <div className="flex items-center gap-2">
          {/* User Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
              >
                <Filter className="w-4 h-4 mr-2" />
                {selectedUser ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[10px]">
                        {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </div>
                ) : (
                  "Tutti i task"
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filtra per responsabile</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={selectedUserId?.toString() || "all"}
                onValueChange={(value) => setSelectedUserId(value === "all" ? null : parseInt(value))}
              >
                <DropdownMenuRadioItem value="all" className="cursor-pointer">
                  Tutti i task
                </DropdownMenuRadioItem>
                {adminUsers.map(user => (
                  <DropdownMenuRadioItem
                    key={user.id}
                    value={user.id.toString()}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[10px]">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      {user.firstName} {user.lastName}
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Buttons */}
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="cursor-pointer"
          >
            <LayoutList className="w-4 h-4 mr-2" />
            Lista
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Kanban
          </Button>
        </div>
      }
    >
      {/* Mobile view placeholder */}
      <div className="md:hidden">
        <div className="flex items-center justify-center h-96 border rounded-lg bg-muted/20">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2">Tasks Dashboard</h3>
            <p className="text-muted-foreground">
              Utilizza uno schermo più grande per visualizzare l'interfaccia completa.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden h-full flex-1 flex-col px-4 md:px-6 md:flex">
        {viewMode === "list" ? (
          <div className="space-y-6">
            {/* Active Tasks */}
            <DataTable data={activeTasks} columns={columns} onAddTask={handleAddTask} />

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold">Task Completati</h3>
                  <span className="text-sm text-muted-foreground">({completedTasks.length})</span>
                </div>
                <DataTable data={completedTasks} columns={columns} />
              </div>
            )}
          </div>
        ) : (
          <KanbanBoard
            tasks={filteredTasks}
            onTaskUpdate={handleTaskUpdate}
            onAddTask={handleAddTask}
            onTaskDeleted={(taskId) => setTasks(prev => prev.filter(t => t.id !== taskId))}
            onTaskUpdated={handleTaskUpdated}
          />
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
    </BaseLayout>
  )
}
