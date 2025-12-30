"use client"

import { useState, useEffect } from "react"
import { Plus, CalendarIcon, UserCircle, Tag, Search, X } from "lucide-react"
import { z } from "zod"
import { format } from "date-fns"
import { it } from 'date-fns/locale'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

import { priorities, statuses } from "../data/data"
import type { Task, TaskCategory } from "../data/schema"
import { tasksAPI, type CreateTaskData } from "@/lib/tasks-api"
import { usersAPI, type User } from "@/lib/users-api"
import { contactsAPI, type Contact } from "@/lib/contacts-api"
import { toast } from "sonner"

// Extended task schema for the form
const taskFormSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  description: z.string().optional(),
  contactId: z.number().optional(),
  categoryId: z.number({ required_error: "La categoria è obbligatoria" }),
  priority: z.enum(['P1', 'P2', 'P3']),
  status: z.enum(['TODO', 'IN_PROGRESS', 'PENDING', 'COMPLETED']),
  deadline: z.date({ required_error: "La scadenza è obbligatoria" }),
  estimatedHours: z.number().optional(),
  visibleToClient: z.boolean().optional(),
})

type TaskFormData = z.infer<typeof taskFormSchema>

interface AddTaskModalProps {
  onAddTask?: (task: Task) => void
  onTaskAdded?: (task: Task) => void
  trigger?: React.ReactNode
  editTask?: Task | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddTaskModal({ onAddTask, onTaskAdded, trigger, editTask, open: controlledOpen, onOpenChange: controlledOnOpenChange }: AddTaskModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    contactId: undefined as number | undefined,
    categoryId: undefined as number | undefined,
    assignedTo: undefined as number | undefined,
    priority: "P2" as const,
    status: "TODO" as const,
    deadline: new Date(),
    estimatedHours: undefined as number | undefined,
    visibleToClient: true,
    teamMembers: [] as number[],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showCalendar, setShowCalendar] = useState(false)
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [adminUsers, setAdminUsers] = useState<User[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all')
  const [submitting, setSubmitting] = useState(false)
  const [showTeamMembersSelect, setShowTeamMembersSelect] = useState(false)
  const [teamMembersSearchQuery, setTeamMembersSearchQuery] = useState("")

  // Load data when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (!open) return

      try {
        setLoading(true)
        const [categoriesResponse, usersResponse, contactsResponse] = await Promise.all([
          tasksAPI.getTaskCategories(),
          usersAPI.getAdminUsers(),
          contactsAPI.getContacts({ limit: 1000 }),
        ])
        setCategories(categoriesResponse.data)
        setAdminUsers(usersResponse.data.users)
        setContacts(contactsResponse.data.contacts)
      } catch (error) {
        console.error('Errore nel caricamento dati:', error)
        toast.error('Errore nel caricamento dei dati')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [open])

  // Populate form when editing
  useEffect(() => {
    if (editTask && open) {
      // Merge assignedTo + teamMembers into a single teamMembers array
      const teamMemberIds = (editTask as any).teamMembers?.map((tm: any) => tm.userId) || []
      const allResponsibles = editTask.assignedTo
        ? [editTask.assignedTo, ...teamMemberIds.filter((id: number) => id !== editTask.assignedTo)]
        : teamMemberIds

      setFormData({
        title: editTask.title,
        description: editTask.description || "",
        contactId: editTask.contactId || undefined,
        categoryId: editTask.categoryId,
        assignedTo: undefined,
        priority: editTask.priority,
        status: editTask.status,
        deadline: new Date(editTask.deadline),
        estimatedHours: editTask.estimatedHours || undefined,
        visibleToClient: editTask.visibleToClient ?? true,
        teamMembers: allResponsibles,
      })
    }
  }, [editTask, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)

      // Check if at least one responsible is selected
      if (formData.teamMembers.length === 0) {
        toast.error("Seleziona almeno un responsabile")
        setSubmitting(false)
        return
      }

      // Validate form data
      const validatedData = taskFormSchema.parse(formData)

      // Use the first teamMember as the main assignedTo for backend compatibility
      const assignedTo = formData.teamMembers[0]
      const otherTeamMembers = formData.teamMembers.slice(1)

      if (editTask) {
        // Update existing task
        const updateData: CreateTaskData = {
          title: validatedData.title,
          description: validatedData.description,
          contactId: validatedData.contactId,
          categoryId: validatedData.categoryId,
          assignedTo: assignedTo,
          priority: validatedData.priority,
          status: validatedData.status,
          deadline: validatedData.deadline.toISOString(),
          estimatedHours: validatedData.estimatedHours,
          visibleToClient: validatedData.visibleToClient,
          teamMembers: otherTeamMembers,
        }

        const response = await tasksAPI.updateTask(editTask.id, updateData)

        if (response.success) {
          toast.success('Task aggiornato con successo')
          onTaskAdded?.(response.data)
          handleCancel()
        }
      } else {
        // Create new task
        const taskData: CreateTaskData = {
          title: validatedData.title,
          description: validatedData.description,
          contactId: validatedData.contactId,
          categoryId: validatedData.categoryId,
          assignedTo: assignedTo,
          priority: validatedData.priority,
          status: validatedData.status,
          deadline: validatedData.deadline.toISOString(),
          estimatedHours: validatedData.estimatedHours,
          visibleToClient: validatedData.visibleToClient,
          teamMembers: otherTeamMembers,
        }

        const response = await tasksAPI.createTask(taskData)

        if (response.success) {
          toast.success('Task creato con successo')
          onAddTask?.(response.data)
          onTaskAdded?.(response.data)
          handleCancel()
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0] as string] = issue.message
          }
        })
        setErrors(newErrors)
        toast.error('Verifica i campi obbligatori')
      } else {
        console.error(editTask ? 'Errore aggiornamento task:' : 'Errore creazione task:', error)
        toast.error(editTask ? 'Errore nell\'aggiornamento del task' : 'Errore nella creazione del task')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: "",
      description: "",
      contactId: undefined,
      categoryId: undefined,
      assignedTo: undefined,
      priority: "P2",
      status: "TODO",
      deadline: new Date(),
      estimatedHours: undefined,
      visibleToClient: true,
      teamMembers: [],
    })
    setErrors({})
    setClientSearchQuery("")
    setTeamMembersSearchQuery("")
    setOpen(false)
  }

  const selectedCategory = categories.find(c => c.id === formData.categoryId)

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      {(trigger || controlledOpen === undefined) && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="default" size="sm" className="cursor-pointer">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Task
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedCategory && (
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCategory.color }} />
            )}
            {editTask ? `Modifica Task #${editTask.id}` : 'Nuovo Task'}
          </DialogTitle>
          <DialogDescription>
            {editTask ? 'Modifica i dettagli del task' : 'Crea un nuovo task per tracciare il lavoro e il progresso'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-4">
          {/* Titolo */}
          <div className="space-y-2">
            <Label htmlFor="title">Titolo *</Label>
            <Input
              id="title"
              placeholder="Inserisci il titolo del task..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Priorità e Stato */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priorità</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as 'P1' | 'P2' | 'P3' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center">
                        {priority.icon && (
                          <priority.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        )}
                        {priority.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stato</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'TODO' | 'IN_PROGRESS' | 'PENDING' | 'COMPLETED' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center">
                        {status.icon && (
                          <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        )}
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Categoria e Responsabili */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categoria *
              </Label>
              <Select
                value={formData.categoryId?.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: parseInt(value) }))}
                disabled={loading}
              >
                <SelectTrigger className={cn("w-full", errors.categoryId && "border-red-500")}>
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(c => c.isActive)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-red-500">{errors.categoryId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                Responsabili *
              </Label>
              <div className="space-y-2">
                  {formData.teamMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.teamMembers.map(userId => {
                        const user = adminUsers.find(u => u.id === userId)
                        if (!user) return null
                        return (
                          <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                            <Avatar className="w-4 h-4">
                              <AvatarFallback className="text-[8px]">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{user.firstName} {user.lastName}</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                teamMembers: prev.teamMembers.filter(id => id !== userId)
                              }))}
                              className="ml-1 hover:bg-muted rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                  <Popover open={showTeamMembersSelect} onOpenChange={setShowTeamMembersSelect}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start cursor-pointer">
                        <UserCircle className="w-4 h-4 mr-2" />
                        Aggiungi responsabile
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Cerca utente..."
                          value={teamMembersSearchQuery}
                          onChange={(e) => setTeamMembersSearchQuery(e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {adminUsers
                          .filter(user => {
                            if (formData.teamMembers.includes(user.id)) return false
                            const searchLower = teamMembersSearchQuery.toLowerCase()
                            return (
                              user.firstName?.toLowerCase().includes(searchLower) ||
                              user.lastName?.toLowerCase().includes(searchLower) ||
                              user.email?.toLowerCase().includes(searchLower)
                            )
                          })
                          .map(user => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  teamMembers: [...prev.teamMembers, user.id]
                                }))
                                setTeamMembersSearchQuery("")
                                setShowTeamMembersSelect(false)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer"
                            >
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-[10px]">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 text-left">
                                <div className="text-sm font-medium">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.email}
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

          {/* Cliente - Full width */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              Cliente
            </Label>
            <div className="space-y-2">
              {formData.contactId ? (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                  <div className="flex-1">
                    <div className="font-medium">
                      {contacts.find(c => c.id === formData.contactId)?.name || 'Cliente selezionato'}
                    </div>
                    {contacts.find(c => c.id === formData.contactId)?.email && (
                      <div className="text-sm text-muted-foreground">
                        {contacts.find(c => c.id === formData.contactId)?.email}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormData(prev => ({ ...prev, contactId: undefined }))}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowClientSearch(true)}
                  className="w-full justify-start cursor-pointer"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Cerca nell'Anagrafica
                </Button>
              )}
            </div>
          </div>

          {/* Ore Stimate e Scadenza */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Ore Stimate</Label>
              <Input
                id="estimatedHours"
                type="number"
                step="0.5"
                min="0"
                placeholder="Es. 8"
                value={formData.estimatedHours || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Scadenza *
              </Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", errors.deadline && "border-red-500")}>
                    {format(formData.deadline, "dd/MM/yyyy", { locale: it })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.deadline}
                    onSelect={(date) => {
                      if (date) {
                        setFormData(prev => ({ ...prev, deadline: date }))
                        setShowCalendar(false)
                      }
                    }}
                    initialFocus
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
              {errors.deadline && (
                <p className="text-sm text-red-500">{errors.deadline}</p>
              )}
            </div>
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              placeholder="Fornisci dettagli aggiuntivi sul task..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting} className="cursor-pointer">
              Annulla
            </Button>
            <Button type="submit" disabled={submitting || loading} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-2" />
              {submitting ? (editTask ? 'Aggiornamento...' : 'Creazione...') : (editTask ? 'Aggiorna Task' : 'Crea Task')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Client Search Dialog */}
    <Dialog open={showClientSearch} onOpenChange={setShowClientSearch}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Seleziona Cliente dall'Anagrafica</DialogTitle>
          <DialogDescription>
            Cerca e seleziona un cliente esistente dall'elenco
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, email o P.IVA..."
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="CLIENT">Clienti</SelectItem>
                <SelectItem value="PROSPECT">Prospect</SelectItem>
                <SelectItem value="COLLABORATION">Collaborazioni</SelectItem>
                <SelectItem value="USEFUL_CONTACT">Contatti Utili</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results List */}
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              {contacts
                .filter(contact => clientTypeFilter === 'all' || contact.type === clientTypeFilter)
                .filter(contact => {
                  if (!clientSearchQuery) return true
                  const query = clientSearchQuery.toLowerCase()
                  return (
                    contact.name.toLowerCase().includes(query) ||
                    contact.email?.toLowerCase().includes(query) ||
                    contact.partitaIva?.toLowerCase().includes(query) ||
                    contact.phone?.includes(query) ||
                    contact.mobile?.includes(query)
                  )
                })
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(contact => (
                  <div
                    key={contact.id}
                    className={cn(
                      "p-4 hover:bg-muted cursor-pointer transition-colors",
                      formData.contactId === contact.id && "bg-muted"
                    )}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, contactId: contact.id }))
                      setShowClientSearch(false)
                      setClientSearchQuery("")
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{contact.name}</h4>
                          {formData.contactId === contact.id && (
                            <Badge variant="default" className="text-xs">Selezionato</Badge>
                          )}
                        </div>
                        <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                          {contact.email && <div>Email: {contact.email}</div>}
                          {contact.partitaIva && <div>P.IVA: {contact.partitaIva}</div>}
                          {contact.address && <div>Indirizzo: {contact.address}</div>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contact.type === 'CLIENT' && 'Cliente'}
                        {contact.type === 'PROSPECT' && 'Prospect'}
                        {contact.type === 'COLLABORATION' && 'Collaborazione'}
                        {contact.type === 'USEFUL_CONTACT' && 'Contatto Utile'}
                      </div>
                    </div>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nessun contatto trovato
                  </div>
                )}
                {contacts.length > 0 && contacts
                  .filter(contact => clientTypeFilter === 'all' || contact.type === clientTypeFilter)
                  .filter(contact => {
                    if (!clientSearchQuery) return true
                    const query = clientSearchQuery.toLowerCase()
                    return (
                      contact.name.toLowerCase().includes(query) ||
                      contact.email?.toLowerCase().includes(query) ||
                      contact.partitaIva?.toLowerCase().includes(query) ||
                      contact.phone?.includes(query) ||
                      contact.mobile?.includes(query)
                    )
                  }).length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      Nessun risultato trovato
                    </div>
                  )}
              </div>

              {/* Results Count */}
              {contacts.length > 0 && (
                <div className="text-sm text-muted-foreground text-center p-2 border-t">
                  {contacts.filter(contact => clientTypeFilter === 'all' || contact.type === clientTypeFilter)
                    .filter(contact => {
                      if (!clientSearchQuery) return true
                      const query = clientSearchQuery.toLowerCase()
                      return (
                        contact.name.toLowerCase().includes(query) ||
                        contact.email?.toLowerCase().includes(query) ||
                        contact.partitaIva?.toLowerCase().includes(query) ||
                        contact.phone?.includes(query) ||
                        contact.mobile?.includes(query)
                      )
                    }).length} {contacts.filter(contact => clientTypeFilter === 'all' || contact.type === clientTypeFilter)
                    .filter(contact => {
                      if (!clientSearchQuery) return true
                      const query = clientSearchQuery.toLowerCase()
                      return (
                        contact.name.toLowerCase().includes(query) ||
                        contact.email?.toLowerCase().includes(query) ||
                        contact.partitaIva?.toLowerCase().includes(query) ||
                        contact.phone?.includes(query) ||
                        contact.mobile?.includes(query)
                      )
                    }).length === 1 ? 'contatto trovato' : 'contatti trovati'}
                </div>
              )}
            </div>
          </div>


        <div className="flex justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowClientSearch(false)
              setClientSearchQuery("")
            }}
            className="cursor-pointer"
          >
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
