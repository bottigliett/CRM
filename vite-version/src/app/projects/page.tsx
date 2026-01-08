"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Eye, CheckCircle, AlertCircle } from "lucide-react"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { projectsAPI, type Project } from "@/lib/projects-api"
import { ProjectFormModal } from "./components/project-form-modal"
import { usePinProtection } from "@/contexts/pin-protection-context"
import { PinUnlockDialog } from "@/components/pin-unlock-dialog"
import { ProtectedData } from "@/components/protected-data"

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { isProtectionEnabled, isUnlocked } = usePinProtection()
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Check if data should be protected
  const shouldProtectData = isProtectionEnabled && !isUnlocked

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await projectsAPI.getProjects()
      if (response.success) {
        setProjects(response.data)
      }
    } catch (error) {
      console.error("Failed to load projects:", error)
      toast.error("Errore nel caricamento dei progetti")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleAddProject = () => {
    setSelectedProject(null)
    setFormModalOpen(true)
  }

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setFormModalOpen(true)
  }

  const handleViewProject = (projectId: number) => {
    navigate(`/projects/${projectId}`)
  }

  const handleFormSuccess = () => {
    loadProjects()
    setFormModalOpen(false)
    setSelectedProject(null)
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

  const pageContent = shouldProtectData ? (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <ProtectedData onUnlock={() => setPinDialogOpen(true)} />
      </Card>
    </div>
  ) : (
    <div className="flex h-full flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Progetti</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestisci i progetti e monitora la redditività
          </p>
        </div>
        <Button onClick={handleAddProject}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Progetto
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Progetto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Ore Stimate</TableHead>
              <TableHead>Ore Lavorate</TableHead>
              <TableHead>Tariffa Oraria</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Caricamento...
                </TableCell>
              </TableRow>
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Nessun progetto trovato
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewProject(project.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{project.name}</span>
                      {project.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {project.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{project.contact?.name}</TableCell>
                  <TableCell>{formatCurrency(project.budget)}</TableCell>
                  <TableCell>
                    {project.estimatedHours ? formatHours(project.estimatedHours) : '-'}
                  </TableCell>
                  <TableCell>
                    {project.metrics
                      ? formatHours(project.metrics.actualHours)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {project.metrics && project.metrics.actualHours > 0 ? (
                        <>
                          <span>{formatCurrency(project.metrics.hourlyRate)}/h</span>
                          {project.metrics.isUnderThreshold && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </>
                      ) : (
                        '-'
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewProject(project.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  return (
    <>
      <PinUnlockDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} />
      <BaseLayout>
        {pageContent}
      </BaseLayout>

      {!shouldProtectData && (
        <ProjectFormModal
          open={formModalOpen}
          onOpenChange={setFormModalOpen}
          project={selectedProject}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  )
}
