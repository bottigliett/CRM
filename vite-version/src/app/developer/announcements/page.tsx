"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Pencil, Trash2, Info, AlertTriangle, Wrench, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { announcementsAPI, type SystemAnnouncement } from "@/lib/announcements-api"

const typeConfig = {
  INFO: { label: "Info", icon: Info, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  WARNING: { label: "Avviso", icon: AlertTriangle, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  MAINTENANCE: { label: "Manutenzione", icon: Wrench, color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  CRITICAL: { label: "Critico", icon: AlertCircle, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
}

const roleOptions = [
  { value: "DEVELOPER", label: "Developer" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "USER", label: "Utente" },
  { value: "CLIENT", label: "Cliente" },
]

export default function AnnouncementsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<SystemAnnouncement | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState<SystemAnnouncement | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [type, setType] = useState<"INFO" | "WARNING" | "MAINTENANCE" | "CRITICAL">("INFO")
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  // Role protection - redirect if not DEVELOPER
  useEffect(() => {
    if (user && user.role !== 'DEVELOPER') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const data = await announcementsAPI.getAll()
      console.log("Loaded announcements:", data)
      setAnnouncements(data || [])
    } catch (error) {
      console.error("Error loading announcements:", error)
      toast.error("Errore nel caricamento degli annunci")
      setAnnouncements([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setMessage("")
    setType("INFO")
    setSelectedRoles([])
    setIsActive(true)
  }

  const openCreateDialog = () => {
    setEditingAnnouncement(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (announcement: SystemAnnouncement) => {
    setEditingAnnouncement(announcement)
    setTitle(announcement.title)
    setMessage(announcement.message)
    setType(announcement.type)
    const roles = announcement.targetRoles ? JSON.parse(announcement.targetRoles) : []
    setSelectedRoles(roles)
    setIsActive(announcement.isActive)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Titolo e messaggio sono obbligatori")
      return
    }

    try {
      setSaving(true)
      const dataToSend = {
        title: title.trim(),
        message: message.trim(),
        type,
        targetRoles: selectedRoles.length > 0 ? selectedRoles : null,
      }

      if (editingAnnouncement) {
        await announcementsAPI.update(editingAnnouncement.id, {
          ...dataToSend,
          isActive,
        })
        toast.success("Annuncio aggiornato")
      } else {
        await announcementsAPI.create(dataToSend)
        toast.success("Annuncio creato")
      }

      setDialogOpen(false)
      resetForm()
      loadAnnouncements()
    } catch (error) {
      console.error("Error saving announcement:", error)
      toast.error("Errore nel salvataggio")
    } finally {
      setSaving(false)
    }
  }

  const openDeleteDialog = (announcement: SystemAnnouncement) => {
    setAnnouncementToDelete(announcement)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!announcementToDelete) return

    try {
      await announcementsAPI.delete(announcementToDelete.id)
      toast.success("Annuncio eliminato")
      loadAnnouncements()
    } catch (error) {
      console.error("Error deleting announcement:", error)
      toast.error("Errore nell'eliminazione")
    } finally {
      setDeleteDialogOpen(false)
      setAnnouncementToDelete(null)
    }
  }

  const toggleActive = async (announcement: SystemAnnouncement) => {
    try {
      await announcementsAPI.update(announcement.id, {
        isActive: !announcement.isActive,
      })
      toast.success(announcement.isActive ? "Annuncio disattivato" : "Annuncio attivato")
      loadAnnouncements()
    } catch (error) {
      console.error("Error toggling announcement:", error)
      toast.error("Errore nell'aggiornamento")
    }
  }

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const getRoleLabel = (role: string) => {
    const option = roleOptions.find(r => r.value === role)
    return option?.label || role
  }

  return (
    <BaseLayout
      title="Gestione Annunci"
      description="Crea e gestisci annunci di sistema per gli utenti"
      headerAction={
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Annuncio
        </Button>
      }
    >
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Annunci di Sistema</CardTitle>
            <CardDescription>
              Gli annunci attivi vengono mostrati agli utenti nella dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun annuncio presente
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Attivo</TableHead>
                    <TableHead className="w-[120px]">Tipo</TableHead>
                    <TableHead>Contenuto</TableHead>
                    <TableHead className="w-[200px]">Destinatari</TableHead>
                    <TableHead className="w-[100px] text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => {
                    const config = typeConfig[announcement.type]
                    const Icon = config.icon
                    const targetRoles = announcement.targetRoles
                      ? JSON.parse(announcement.targetRoles)
                      : []

                    return (
                      <TableRow key={announcement.id}>
                        <TableCell>
                          <Switch
                            checked={announcement.isActive}
                            onCheckedChange={() => toggleActive(announcement)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={config.color}>
                            <Icon className="mr-1 h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{announcement.title}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {announcement.message}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {targetRoles.length === 0 ? (
                            <span className="text-muted-foreground text-sm">Tutti gli utenti</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {targetRoles.map((role: string) => (
                                <Badge key={role} variant="outline" className="text-xs">
                                  {getRoleLabel(role)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(announcement)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(announcement)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? "Modifica Annuncio" : "Nuovo Annuncio"}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement
                ? "Modifica i dettagli dell'annuncio"
                : "Crea un nuovo annuncio di sistema"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="es. Manutenzione programmata"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Messaggio *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descrivi il contenuto dell'annuncio..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as typeof type)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destinatari</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Seleziona i ruoli che vedranno l'annuncio. Lascia vuoto per tutti.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {roleOptions.map((role) => (
                  <div key={role.value} className="flex items-center gap-2">
                    <Checkbox
                      id={role.value}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <label htmlFor={role.value} className="text-sm cursor-pointer">
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {editingAnnouncement && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Annuncio attivo</Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio..." : editingAnnouncement ? "Salva" : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo annuncio?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare l'annuncio "{announcementToDelete?.title}". Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BaseLayout>
  )
}
