import * as React from "react"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckSquare, Clock, Calendar, CheckCircle, Circle, PlayCircle, AlertCircle } from "lucide-react"
import { clientTasksAPI, type Task } from "@/lib/client-tasks-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"

export default function ClientTasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response = await clientTasksAPI.getTasks({
        limit: 100,
        isArchived: false,
      })
      setTasks(response.data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Errore nel caricamento dei task')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'IN_PROGRESS':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'TODO':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'COMPLETED': 'Completato',
      'IN_PROGRESS': 'In Corso',
      'PENDING': 'In Attesa',
      'TODO': 'Da Fare'
    }
    return statusMap[status] || status
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'P2':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'P3':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const translatePriority = (priority: string) => {
    const priorityMap: Record<string, string> = {
      'P1': 'Alta',
      'P2': 'Media',
      'P3': 'Bassa'
    }
    return priorityMap[priority] || priority
  }

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  // Calculate statistics
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED')
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS')
  const todoTasks = tasks.filter(t => t.status === 'TODO')
  const pendingTasks = tasks.filter(t => t.status === 'PENDING')
  const overdueTasks = tasks.filter(t => t.status !== 'COMPLETED' && isOverdue(t.deadline))

  const completionPercentage = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0

  const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)
  const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0)

  return (
    <ClientLayout
      title="I Tuoi Task"
      description="Segui i progressi del tuo progetto"
    >
      <div className="px-4 lg:px-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Caricamento...</p>
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessun Task</h3>
                <p className="text-sm text-muted-foreground">
                  Non ci sono task assegnati al momento
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Side - Summary */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Riepilogo Task
                </CardTitle>
                <CardDescription>Progressi complessivi del progetto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completamento</span>
                    <span className="text-sm font-medium">{completedTasks.length} / {tasks.length} task</span>
                  </div>
                  <Progress value={completionPercentage} className="h-3" />
                  <p className="text-center text-2xl font-bold">{completionPercentage.toFixed(0)}%</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Completati</span>
                    </div>
                    <p className="text-2xl font-bold">{completedTasks.length}</p>
                  </div>

                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <PlayCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">In Corso</span>
                    </div>
                    <p className="text-2xl font-bold">{inProgressTasks.length}</p>
                  </div>

                  <div className="p-3 bg-gray-500/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Circle className="h-4 w-4 text-gray-600" />
                      <span className="text-xs font-medium text-gray-600">Da Fare</span>
                    </div>
                    <p className="text-2xl font-bold">{todoTasks.length}</p>
                  </div>

                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs font-medium text-yellow-600">In Attesa</span>
                    </div>
                    <p className="text-2xl font-bold">{pendingTasks.length}</p>
                  </div>
                </div>

                {/* Overdue Warning */}
                {overdueTasks.length > 0 && (
                  <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-600">
                        {overdueTasks.length} task in ritardo
                      </span>
                    </div>
                  </div>
                )}

                {/* Hours Summary */}
                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Ore di Lavoro</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{totalEstimatedHours}h</p>
                      <p className="text-xs text-muted-foreground">Stimate</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{totalActualHours}h</p>
                      <p className="text-xs text-muted-foreground">Effettive</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Side - Tasks List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Elenco Task</h3>
                <span className="text-sm text-muted-foreground">{tasks.length} task</span>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                {tasks.map((task) => {
                  const overdue = task.status !== 'COMPLETED' && isOverdue(task.deadline)

                  return (
                    <Card key={task.id} className={overdue ? 'border-red-500/30' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium">{task.title}</span>
                              {overdue && (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                  In Ritardo
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {task.description}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="outline" className={getStatusColor(task.status)}>
                              {translateStatus(task.status)}
                            </Badge>
                            <Badge variant="outline" className={`${getPriorityColor(task.priority)} text-xs`}>
                              {translatePriority(task.priority)}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Scadenza: {format(new Date(task.deadline), 'dd/MM/yyyy', { locale: it })}</span>
                          </div>

                          {task.estimatedHours && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Stimate: {task.estimatedHours}h</span>
                            </div>
                          )}

                          {task.actualHours && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Effettive: {task.actualHours}h</span>
                            </div>
                          )}

                          {task.assignedUser && (
                            <span>
                              Assegnato: {task.assignedUser.firstName} {task.assignedUser.lastName}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  )
}
