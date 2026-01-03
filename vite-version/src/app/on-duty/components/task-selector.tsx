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

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Seleziona un task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca task..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 w-7 p-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
                  {loading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Caricamento...
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      {tasks.length === 0 ? "Nessun task assegnato a te" : "Nessun task trovato"}
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <Button
                        key={task.id}
                        variant="outline"
                        className="w-full justify-start font-normal h-auto py-3 px-4"
                        onClick={() => handleTaskSelect(task)}
                      >
                        <div className="flex flex-col items-start gap-2 w-full">
                          <div className="flex items-center gap-2 w-full">
                            <span className={cn("text-sm font-semibold", getPriorityColor(task.priority))}>
                              {task.priority}
                            </span>
                            {getStatusBadge(task.status)}
                            <span className="text-base flex-1 text-left font-medium">{task.title}</span>
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {task.contact && (
                              <span>Cliente: {task.contact.name}</span>
                            )}
                            {task.estimatedHours && (
                              <span>~{task.estimatedHours}h stimate</span>
                            )}
                            {task.category && (
                              <span>{task.category.name}</span>
                            )}
                          </div>
                        </div>
                      </Button>
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
