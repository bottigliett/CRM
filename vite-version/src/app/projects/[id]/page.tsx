"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Edit, CheckCircle, AlertCircle, Clock, Euro, TrendingUp, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { toast } from "sonner"
import { projectsAPI, type ProjectDetail } from "@/lib/projects-api"
import { ProjectFormModal } from "../components/project-form-modal"

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = parseInt(params.id as string)

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completing, setCompleting] = useState(false)

  const loadProject = async () => {
    try {
      setLoading(true)
      const response = await projectsAPI.getProjectById(projectId)
      if (response.success) {
        setProject(response.data)
      }
    } catch (error) {
      console.error("Failed to load project:", error)
      toast.error("Errore nel caricamento del progetto")
      router.push("/projects")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProject()
  }, [projectId])

  const handleCompleteProject = async () => {
    try {
      setCompleting(true)
      await projectsAPI.completeProject(projectId)
      toast.success("Progetto completato con successo")
      setCompleteDialogOpen(false)
      loadProject()
    } catch (error: any) {
      console.error("Failed to complete project:", error)
      toast.error(error.message || "Errore nel completamento del progetto")
    } finally {
      setCompleting(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMMM yyyy", { locale: it })
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: it })
  }

  if (loading || !project) {
    return (
      <BaseLayout>
        <div className="flex h-full items-center justify-center">
          <p>Caricamento...</p>
        </div>
      </BaseLayout>
    )
  }

  const metrics = project.metrics || {
    actualHours: 0,
    estimatedHoursFromTasks: 0,
    hourlyRate: 0,
    isUnderThreshold: false,
  }

  return (
    <BaseLayout>
      <div className="flex h-full flex-col gap-6 p-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/projects")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                <Badge
                  variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}
                >
                  {project.status === 'ACTIVE' ? (
                    <>
                      <div className="mr-1 h-2 w-2 rounded-full bg-green-500" />
                      Attivo
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Completato
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Cliente: {project.contact?.name}
              </p>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Modifica
            </Button>
            {project.status === 'ACTIVE' && (
              <Button onClick={() => setCompleteDialogOpen(true)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Completa Progetto
              </Button>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(project.budget)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ore Lavorate</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHours(metrics.actualHours)}</div>
              {project.estimatedHours && (
                <p className="text-xs text-muted-foreground">
                  su {formatHours(project.estimatedHours)} stimate
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tariffa Oraria</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  {metrics.actualHours > 0
                    ? `${formatCurrency(metrics.hourlyRate)}/h`
                    : "-"}
                </div>
                {metrics.isUnderThreshold && (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              {metrics.isUnderThreshold && (
                <p className="text-xs text-red-500">
                  Sotto soglia €30/h
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ore da Task</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatHours(metrics.estimatedHoursFromTasks)}
              </div>
              <p className="text-xs text-muted-foreground">
                Ore stimate nei task
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Breakdowns */}
        {project.breakdowns && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Breakdown Mensile</CardTitle>
                <CardDescription>Ore lavorate per mese</CardDescription>
              </CardHeader>
              <CardContent>
                {project.breakdowns.monthly.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>
                ) : (
                  <div className="space-y-2">
                    {project.breakdowns.monthly.map((item) => (
                      <div key={item.period} className="flex items-center justify-between text-sm">
                        <span>{item.period}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            {item.events} eventi
                          </span>
                          <span className="font-medium">
                            {formatHours(item.hours)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Breakdown Settimanale</CardTitle>
                <CardDescription>Ore lavorate per settimana</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[300px] overflow-y-auto">
                {project.breakdowns.weekly.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>
                ) : (
                  <div className="space-y-2">
                    {project.breakdowns.weekly.map((item) => (
                      <div key={item.period} className="flex items-center justify-between text-sm">
                        <span>{item.period}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            {item.events} eventi
                          </span>
                          <span className="font-medium">
                            {formatHours(item.hours)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Events and Tasks */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Events */}
          <Card>
            <CardHeader>
              <CardTitle>Eventi Recenti</CardTitle>
              <CardDescription>
                Ultimi 50 eventi per questo cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!project.events || project.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun evento trovato</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {project.events.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 text-sm">
                      {event.category && (
                        <div
                          className="mt-1 h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: event.category.color }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(event.startDateTime)}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatHours(
                          (new Date(event.endDateTime).getTime() -
                            new Date(event.startDateTime).getTime()) /
                            (1000 * 60 * 60)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Task Correlati</CardTitle>
              <CardDescription>
                Ultimi 50 task per questo cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!project.tasks || project.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun task trovato</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {project.tasks.map((task) => (
                    <div key={task.id} className="flex items-start justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Scadenza: {formatDate(task.deadline)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {task.status}
                        </Badge>
                        {task.estimatedHours && (
                          <span className="text-xs text-muted-foreground">
                            {formatHours(task.estimatedHours)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Progetto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data Inizio:</span>
              <span>{formatDate(project.startDate)}</span>
            </div>
            {project.completedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Completamento:</span>
                <span>{formatDate(project.completedAt)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creato da:</span>
              <span>
                {project.creator
                  ? `${project.creator.firstName} ${project.creator.lastName}`
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creato il:</span>
              <span>{formatDateTime(project.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ultima modifica:</span>
              <span>{formatDateTime(project.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <ProjectFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        project={project}
        onSuccess={loadProject}
      />

      {/* Complete Dialog */}
      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Completare il progetto?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione segnerà il progetto come completato. I dati verranno
              preservati e potrai comunque visualizzarli, ma non potrai più
              modificare il progetto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completing}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteProject} disabled={completing}>
              {completing ? "Completamento..." : "Completa Progetto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BaseLayout>
  )
}
