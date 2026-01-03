"use client"

import { useEffect, useState } from "react"
import { Search, CheckCircle2, Circle, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { tasksAPI, type Task } from "@/lib/tasks-api"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"

interface TaskSelectorProps {
  selectedTask: Task | null
  onTaskSelect: (task: Task | null) => void
  onTaskStatusChange?: (taskId: number, status: string) => Promise<void>
}

export function TaskSelector({ selectedTask, onTaskSelect, onTaskStatusChange }: TaskSelectorProps) {
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showTaskPicker, setShowTaskPicker] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadTasks()
    }
  }, [user?.id])

  const loadTasks = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const response = await tasksAPI.getTasks({
        status: 'TODO,IN_PROGRESS',
        assignedTo: user.id,
        limit: 100,
      })
      if (response.success) {
        setTasks(response.data.tasks)
      }
    } catch (error) {
      console.error("Errore nel caricamento task:", error)
      toast.error("Errore nel caricamento dei task")
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    const query = searchQuery.toLowerCase()
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.contact?.name?.toLowerCase().includes(query) ||
      task.category?.name?.toLowerCase().includes(query)
    )
  })

  const handleTaskSelect = (task: Task) => {
    onTaskSelect(task)
    setShowTaskPicker(false)
    setSearchQuery("")
  }

  const handleClearTask = () => {
    onTaskSelect(null)
  }

  const handleMarkInProgress = async () => {
    if (!selectedTask) return

    try {
      setUpdatingStatus(true)
      if (onTaskStatusChange) {
        await onTaskStatusChange(selectedTask.id, 'IN_PROGRESS')
      } else {
        await tasksAPI.updateTask(selectedTask.id, { status: 'IN_PROGRESS' })
      }
      toast.success("Task segnato come in corso")
      loadTasks()
      if (selectedTask) {
        const updatedTask = { ...selectedTask, status: 'IN_PROGRESS' as const }
        onTaskSelect(updatedTask)
      }
    } catch (error: any) {
      toast.error(error.message || "Errore durante l'aggiornamento")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleMarkCompleted = async () => {
    if (!selectedTask) return

    try {
      setUpdatingStatus(true)
      if (onTaskStatusChange) {
        await onTaskStatusChange(selectedTask.id, 'COMPLETED')
      } else {
        await tasksAPI.updateTask(selectedTask.id, { status: 'COMPLETED' })
      }
      toast.success("Task completato!")
      onTaskSelect(null)
      loadTasks()
    } catch (error: any) {
      toast.error(error.message || "Errore durante il completamento")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TODO':
        return <Badge variant="outline">Da fare</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500">In corso</Badge>
      case 'PENDING':
        return <Badge variant="secondary">In attesa</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completato</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1':
        return 'text-red-500'
      case 'P2':
        return 'text-yellow-500'
      case 'P3':
        return 'text-gray-500'
      default:
        return ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Task Corrente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Task Selector */}
        {!selectedTask ? (
          <Dialog open={showTaskPicker} onOpenChange={setShowTaskPicker}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Search className="mr-2 h-4 w-4" />
                Seleziona un task...
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-2xl">Seleziona un task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 flex flex-col h-full">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Cerca task per titolo, cliente, categoria..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 h-8 w-8 p-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {loading ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <div className="text-lg">Caricamento task...</div>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <div className="text-lg">
                        {tasks.length === 0 ? "Nessun task assegnato a te" : "Nessun task trovato con questi criteri"}
                      </div>
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-5 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleTaskSelect(task)}
                      >
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <span className={cn("text-base font-bold", getPriorityColor(task.priority))}>
                                  {task.priority}
                                </span>
                                {getStatusBadge(task.status)}
                                {task.isFavorite && (
                                  <Badge variant="secondary" className="gap-1">
                                    ⭐ Preferito
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-xl font-semibold">{task.title}</h3>
                            </div>
                          </div>

                          {/* Description */}
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                            {task.contact && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Cliente</div>
                                <div className="text-sm font-medium">{task.contact.name}</div>
                                {task.contact.email && (
                                  <div className="text-xs text-muted-foreground">{task.contact.email}</div>
                                )}
                              </div>
                            )}

                            {task.category && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Categoria</div>
                                <div className="flex items-center gap-2">
                                  {task.category.icon && <span className="text-base">{task.category.icon}</span>}
                                  <span className="text-sm font-medium">{task.category.name}</span>
                                </div>
                              </div>
                            )}

                            {task.deadline && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Scadenza</div>
                                <div className="text-sm font-medium">
                                  {new Date(task.deadline).toLocaleDateString('it-IT', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>
                            )}

                            {task.estimatedHours !== undefined && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Ore Stimate</div>
                                <div className="text-sm font-medium">{task.estimatedHours}h</div>
                              </div>
                            )}

                            {task.assignedUser && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Assegnato a</div>
                                <div className="text-sm font-medium">
                                  {task.assignedUser.firstName} {task.assignedUser.lastName}
                                </div>
                              </div>
                            )}

                            {task.creator && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Creato da</div>
                                <div className="text-sm font-medium">
                                  {task.creator.firstName} {task.creator.lastName}
                                </div>
                              </div>
                            )}

                            {task.createdAt && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Data creazione</div>
                                <div className="text-sm font-medium">
                                  {new Date(task.createdAt).toLocaleDateString('it-IT', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>
                            )}

                            {task.actualHours !== undefined && task.actualHours > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Ore Effettive</div>
                                <div className="text-sm font-medium">{task.actualHours}h</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          /* Selected Task Card */
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-semibold", getPriorityColor(selectedTask.priority))}>
                    {selectedTask.priority}
                  </span>
                  {getStatusBadge(selectedTask.status)}
                </div>
                <h3 className="font-medium">{selectedTask.title}</h3>
                {selectedTask.contact && (
                  <p className="text-sm text-muted-foreground">
                    Cliente: {selectedTask.contact.name}
                  </p>
                )}
                {selectedTask.estimatedHours && (
                  <p className="text-sm text-muted-foreground">
                    Ore stimate: {selectedTask.estimatedHours}h
                  </p>
                )}
              </div>
              <Button
                onClick={handleClearTask}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Task Actions */}
            <div className="flex gap-2">
              {selectedTask.status !== 'IN_PROGRESS' && (
                <Button
                  onClick={handleMarkInProgress}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={updatingStatus}
                >
                  <Circle className="mr-1 h-3 w-3" />
                  Segna in corso
                </Button>
              )}
              <Button
                onClick={handleMarkCompleted}
                size="sm"
                className="flex-1"
                disabled={updatingStatus}
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Completa
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
