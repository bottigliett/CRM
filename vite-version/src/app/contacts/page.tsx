"use client"

import React, { useState, useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Search,
  MoreHorizontal,
  Building2,
  User,
  Mail,
  Phone,
  Users,
  UserPlus,
  Briefcase,
  Edit,
  Trash2,
  Loader2,
  LayoutList,
  LayoutGrid
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { contactsAPI, type Contact, type CreateContactData } from "@/lib/contacts-api"
import { userPreferencesAPI } from "@/lib/user-preferences-api"
import { toast } from "sonner"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("")
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalContacts, setTotalContacts] = useState(0)
  const [totalProspects, setTotalProspects] = useState(0)
  const [totalClients, setTotalClients] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [pageLimit, setPageLimit] = useState(50)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [isConfirmCloseDialogOpen, setIsConfirmCloseDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasFormChanges, setHasFormChanges] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CreateContactData>({
    name: "",
    type: "COLLABORATION",
    email: "",
    phone: "",
    mobile: "",
    address: "",
    city: "",
    province: "",
    zipCode: "",
    country: "IT",
    partitaIva: "",
    codiceFiscale: "",
    website: "",
    notes: "",
    status: "active",
    priority: 0,
  })

  // Load contacts (reset mode or specific page)
  const loadContacts = async (page: number = 1) => {
    try {
      setLoading(true)

      // In Kanban mode, load ALL contacts
      const limit = viewMode === 'kanban' ? 10000 : pageLimit

      const response = await contactsAPI.getContacts({
        page,
        limit,
        search: searchQuery,
        type: typeFilter || undefined,
      })

      setContacts(response.data.contacts)
      setCurrentPage(page)
      setTotalPages(response.data.pagination.totalPages)
      setTotalContacts(response.data.pagination.total)
      setTotalProspects(response.data.stats?.totalProspects || 0)
      setTotalClients(response.data.stats?.totalClients || 0)
      setHasMore(response.data.pagination.totalPages > page)
    } catch (error: any) {
      toast.error(error.message || "Errore nel caricamento dei contatti")
    } finally {
      setLoading(false)
    }
  }

  // Load more contacts (append mode)
  const loadMore = async () => {
    if (!hasMore || loadingMore) return

    try {
      setLoadingMore(true)
      const nextPage = currentPage + 1
      const response = await contactsAPI.getContacts({
        page: nextPage,
        limit: pageLimit,
        search: searchQuery,
        type: typeFilter || undefined,
      })

      setContacts(prev => [...prev, ...response.data.contacts])
      setCurrentPage(nextPage)
      setHasMore(nextPage < response.data.pagination.totalPages)
    } catch (error: any) {
      toast.error(error.message || "Errore nel caricamento dei contatti")
    } finally {
      setLoadingMore(false)
    }
  }

  // Handle drag and drop
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    // If dropped in same position, do nothing
    if (source.droppableId === destination.droppableId) return

    // Get the contact being dragged
    const contactId = parseInt(draggableId.replace('contact-', ''))
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return

    // Determine new type based on destination
    let newType: 'COLLABORATION' | 'USEFUL_CONTACT' | 'PROSPECT' | 'CLIENT' = 'COLLABORATION'
    if (destination.droppableId === 'COLLABORATION_USEFUL') {
      // When dropping in COLLABORATION_USEFUL column, keep current type if it's already one of them
      if (contact.type === 'COLLABORATION' || contact.type === 'USEFUL_CONTACT') {
        newType = contact.type as 'COLLABORATION' | 'USEFUL_CONTACT'
      } else {
        newType = 'COLLABORATION' // Default to COLLABORATION for new drops
      }
    } else if (destination.droppableId === 'PROSPECT') {
      newType = 'PROSPECT'
    } else if (destination.droppableId === 'CLIENT') {
      newType = 'CLIENT'
    }

    // Optimistically update UI
    setContacts(prev =>
      prev.map(c =>
        c.id === contactId ? { ...c, type: newType } : c
      )
    )

    try {
      await contactsAPI.updateContact(contactId, { type: newType })
      toast.success(`Contatto spostato in ${newType}`)

      // Reload stats
      loadContacts()
    } catch (error: any) {
      // Revert on error
      setContacts(prev =>
        prev.map(c =>
          c.id === contactId ? { ...c, type: contact.type } : c
        )
      )
      toast.error(error.message || "Errore nell'aggiornamento del contatto")
    }
  }

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        console.log('[Preferences] Loading user preferences...')
        const preferences = await userPreferencesAPI.getUserPreferences('contacts')
        console.log('[Preferences] Loaded from backend:', preferences)

        if (preferences) {
          // Apply saved preferences
          console.log('[Preferences] Applying preferences:', preferences)
          if (preferences.viewMode) setViewMode(preferences.viewMode as 'table' | 'kanban')
          if (preferences.pageLimit) setPageLimit(preferences.pageLimit)
          if (preferences.typeFilter !== undefined) setTypeFilter(preferences.typeFilter)
        } else {
          console.log('[Preferences] No saved preferences found, using defaults')
        }
      } catch (error) {
        console.error('[Preferences] Failed to load preferences:', error)
        // Silently fail - use defaults
      } finally {
        console.log('[Preferences] Setting preferencesLoaded = true')
        setPreferencesLoaded(true)
      }
    }

    loadPreferences()
  }, [])

  // Save user preferences when they change
  useEffect(() => {
    // Don't save until initial preferences are loaded
    if (!preferencesLoaded) {
      console.log('[Preferences] Skipping save - preferences not loaded yet')
      return
    }

    console.log('[Preferences] Scheduling save for:', { viewMode, pageLimit, typeFilter })

    const savePreferences = async () => {
      try {
        console.log('[Preferences] Saving to backend:', { viewMode, pageLimit, typeFilter })
        const result = await userPreferencesAPI.saveUserPreferences('contacts', {
          viewMode,
          pageLimit,
          typeFilter,
        })
        console.log('[Preferences] Saved successfully:', result)
      } catch (error) {
        console.error('[Preferences] Failed to save:', error)
        // Silently fail - not critical
      }
    }

    // Debounce saving to avoid too many requests
    const timer = setTimeout(savePreferences, 1000)
    return () => clearTimeout(timer)
  }, [viewMode, pageLimit, typeFilter, preferencesLoaded])

  // Load contacts on mount and when filters change
  useEffect(() => {
    // Don't load contacts until preferences are loaded
    if (!preferencesLoaded) return

    const timer = setTimeout(() => {
      loadContacts()
    }, searchQuery ? 500 : 0) // Debounce search by 500ms

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, typeFilter, viewMode, pageLimit, preferencesLoaded])

  // Handle create contact
  const handleCreate = async () => {
    console.log('[ContactsPage] handleCreate called with formData:', formData)

    if (!formData.name) {
      console.log('[ContactsPage] Name is empty, showing error')
      toast.error("Il nome è obbligatorio")
      return
    }

    // Validate email
    if (formData.email && !validateEmail(formData.email)) {
      toast.error("Formato email non valido")
      return
    }

    // Validate phone
    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error("Formato telefono non valido (min 9 cifre)")
      return
    }

    // Validate mobile
    if (formData.mobile && !validatePhone(formData.mobile)) {
      toast.error("Formato cellulare non valido (min 9 cifre)")
      return
    }

    // Validate partita IVA
    if (formData.partitaIva && !validatePartitaIva(formData.partitaIva)) {
      toast.error("Formato Partita IVA non valido (11 cifre o IT + 11 cifre)")
      return
    }

    try {
      setSubmitting(true)
      console.log('[ContactsPage] Calling API to create contact...')
      const response = await contactsAPI.createContact(formData)
      console.log('[ContactsPage] Contact created successfully:', response)
      toast.success("Contatto creato con successo!")
      setIsCreateDialogOpen(false)
      resetForm()
      loadContacts()
    } catch (error: any) {
      console.error('[ContactsPage] Error creating contact:', error)
      toast.error(error.message || "Errore nella creazione del contatto")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle edit contact
  const handleEdit = async () => {
    if (!selectedContact || !formData.name) {
      toast.error("Il nome è obbligatorio")
      return
    }

    // Validate email
    if (formData.email && !validateEmail(formData.email)) {
      toast.error("Formato email non valido")
      return
    }

    // Validate phone
    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error("Formato telefono non valido (min 9 cifre)")
      return
    }

    // Validate mobile
    if (formData.mobile && !validatePhone(formData.mobile)) {
      toast.error("Formato cellulare non valido (min 9 cifre)")
      return
    }

    // Validate partita IVA
    if (formData.partitaIva && !validatePartitaIva(formData.partitaIva)) {
      toast.error("Formato Partita IVA non valido (11 cifre o IT + 11 cifre)")
      return
    }

    try {
      setSubmitting(true)
      await contactsAPI.updateContact(selectedContact.id, formData)
      toast.success("Contatto aggiornato con successo!")
      setIsEditDialogOpen(false)
      setSelectedContact(null)
      resetForm()
      loadContacts()
    } catch (error: any) {
      toast.error(error.message || "Errore nell'aggiornamento del contatto")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete contact
  const handleDelete = async () => {
    if (!selectedContact) return

    try {
      setSubmitting(true)
      await contactsAPI.deleteContact(selectedContact.id)
      toast.success("Contatto eliminato con successo!")
      setIsDeleteDialogOpen(false)
      setSelectedContact(null)
      loadContacts()
    } catch (error: any) {
      toast.error(error.message || "Errore nell'eliminazione del contatto")
    } finally {
      setSubmitting(false)
    }
  }

  // Open edit dialog
  const openEditDialog = (contact: Contact) => {
    setSelectedContact(contact)
    setFormData({
      name: contact.name,
      type: contact.type,
      email: contact.email || "",
      phone: contact.phone || "",
      mobile: contact.mobile || "",
      address: contact.address || "",
      city: contact.city || "",
      province: contact.province || "",
      zipCode: contact.zipCode || "",
      country: contact.country || "IT",
      partitaIva: contact.partitaIva || "",
      codiceFiscale: contact.codiceFiscale || "",
      website: contact.website || "",
      notes: contact.notes || "",
      status: contact.status || "active",
      priority: contact.priority || 0,
    })
    setIsEditDialogOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (contact: Contact) => {
    setSelectedContact(contact)
    setIsDeleteDialogOpen(true)
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      type: "COLLABORATION",
      email: "",
      phone: "",
      mobile: "",
      address: "",
      city: "",
      province: "",
      zipCode: "",
      country: "IT",
      partitaIva: "",
      codiceFiscale: "",
      website: "",
      notes: "",
      status: "active",
      priority: 0,
    })
    setHasFormChanges(false)
  }

  // Handle dialog close with confirmation if there are changes
  const handleDialogClose = (open: boolean) => {
    if (!open && hasFormChanges) {
      // User is trying to close the dialog and there are unsaved changes
      setIsConfirmCloseDialogOpen(true)
    } else if (!open) {
      // No changes, close directly
      setIsCreateDialogOpen(false)
      setIsEditDialogOpen(false)
      setSelectedContact(null)
      resetForm()
    }
  }

  // Confirm close dialog
  const confirmCloseDialog = () => {
    setIsConfirmCloseDialogOpen(false)
    setIsCreateDialogOpen(false)
    setIsEditDialogOpen(false)
    setSelectedContact(null)
    resetForm()
  }

  // Open preview dialog
  const openPreviewDialog = (contact: Contact) => {
    setSelectedContact(contact)
    setIsPreviewDialogOpen(true)
  }

  // Update form data and track changes
  const updateFormData = (updates: Partial<CreateContactData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setHasFormChanges(true)
  }

  // Validation functions
  const validateEmail = (email: string): boolean => {
    if (!email) return true // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true // Optional field
    const phoneRegex = /^[\d\s\+\-\(\)]+$/
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 9
  }

  const validatePartitaIva = (piva: string): boolean => {
    if (!piva) return true // Optional field
    const pivaRegex = /^[A-Z]{2}[\d]{11}$/
    return pivaRegex.test(piva) || /^[\d]{11}$/.test(piva)
  }

  // Helper functions
  function getTypeIcon(type: string) {
    return type === "COMPANY" ? Building2 : User
  }

  function getTypeLabel(type: string) {
    const labels: Record<string, string> = {
      COLLABORATION: "Collaborazione",
      USEFUL_CONTACT: "Contatto Utile",
      PROSPECT: "Prospect",
      CLIENT: "Cliente",
      PERSON: "Persona",
    }
    return labels[type] || type
  }

  function getStatusColor(status: string | null) {
    switch (status) {
      case "active":
        return "default"
      case "inactive":
        return "secondary"
      default:
        return "outline"
    }
  }

  // Stats (from backend stats)
  const stats = [
    {
      title: "Totale Contatti",
      value: totalContacts.toString(),
      description: "Contatti totali",
      icon: Users,
    },
    {
      title: "Prospect",
      value: totalProspects.toString(),
      description: "Prospect attivi",
      icon: UserPlus,
    },
    {
      title: "Clienti",
      value: totalClients.toString(),
      description: "Clienti acquisiti",
      icon: Briefcase,
    },
  ]

  return (
    <BaseLayout
      title="Contatti"
      description="Gestione completa dell'anagrafica"
    >
      <div className="px-4 lg:px-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Anagrafica Contatti</CardTitle>
                <CardDescription>
                  Gestisci tutti i tuoi contatti, lead e clienti
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Nuovo Contatto
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="relative md:w-96">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca contatti..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1) // Reset to first page on search
                  }}
                />
              </div>
              <div className="flex gap-2 flex-wrap md:justify-end">
                <Button
                  variant={typeFilter === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("")}
                  className="cursor-pointer"
                >
                  Tutti
                </Button>
                <Button
                  variant={typeFilter === "COLLABORATION" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("COLLABORATION")}
                  className="cursor-pointer"
                >
                  Collaborazioni
                </Button>
                <Button
                  variant={typeFilter === "USEFUL_CONTACT" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("USEFUL_CONTACT")}
                  className="cursor-pointer"
                >
                  Contatti Utili
                </Button>
                <Button
                  variant={typeFilter === "PROSPECT" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("PROSPECT")}
                  className="cursor-pointer"
                >
                  Prospect
                </Button>
                <Button
                  variant={typeFilter === "CLIENT" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("CLIENT")}
                  className="cursor-pointer"
                >
                  Clienti
                </Button>
              </div>

              {/* View Mode Toggle and Page Limit */}
              <div className="flex gap-2 items-center">
                {viewMode === 'table' && (
                  <Select value={pageLimit.toString()} onValueChange={(val) => setPageLimit(parseInt(val))}>
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">Carica 50</SelectItem>
                      <SelectItem value="100">Carica 100</SelectItem>
                      <SelectItem value="500">Carica 500</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="cursor-pointer"
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className="cursor-pointer"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Contacts View */}
            {viewMode === 'table' ? (
              <div className="rounded-md border">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Nessun contatto trovato</p>
                    <p className="text-sm text-muted-foreground">
                      Crea il tuo primo contatto per iniziare
                    </p>
                  </div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contatto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => {
                      const TypeIcon = getTypeIcon(contact.type)
                      const initials = contact.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()

                      return (
                        <TableRow
                          key={contact.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openPreviewDialog(contact)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-muted">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{contact.name}</div>
                                {contact.city && (
                                  <div className="text-sm text-muted-foreground">
                                    {contact.city}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{getTypeLabel(contact.type)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {contact.email ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                {contact.email}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {contact.phone || contact.mobile ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                {contact.phone || contact.mobile}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {contact.tags.map((tagObj) => (
                                <Badge key={tagObj.id} variant="secondary" className="text-xs">
                                  {tagObj.tag}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(contact.status)}>
                              {contact.status || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(contact)}
                                  className="cursor-pointer"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Modifica
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(contact)}
                                  className="text-destructive cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
              </div>
            ) : (
              // Kanban View
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-3 gap-3">
                  {/* COLLABORATION/USEFUL_CONTACT Column */}
                  <div className="flex flex-col">
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Collaborazioni/Contatti Utili</h3>
                        <Badge variant="secondary" className="ml-2">
                          {contacts.filter(c => c.type === 'COLLABORATION' || c.type === 'USEFUL_CONTACT').length}
                        </Badge>
                      </div>
                    </div>
                    <Droppable droppableId="COLLABORATION_USEFUL">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 space-y-2 min-h-[200px] rounded-lg p-2 ${
                            snapshot.isDraggingOver ? 'bg-muted/50' : ''
                          }`}
                        >
                          {contacts
                            .filter(c => c.type === 'COLLABORATION' || c.type === 'USEFUL_CONTACT')
                            .map((contact, index) => (
                              <Draggable
                                key={contact.id}
                                draggableId={`contact-${contact.id}`}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-card border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow ${
                                      snapshot.isDragging ? 'shadow-lg' : ''
                                    }`}
                                    onClick={() => openPreviewDialog(contact)}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                          <AvatarFallback className="text-xs">
                                            {contact.name.substring(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="font-medium text-sm">{contact.name}</p>
                                          {contact.email && (
                                            <p className="text-xs text-muted-foreground">{contact.email}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {contact.tags && contact.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {contact.tags.slice(0, 2).map((tag, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="outline"
                                            className="text-xs"
                                            style={{
                                              borderColor: tag.color,
                                              color: tag.color,
                                            }}
                                          >
                                            {tag.tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>

                  {/* PROSPECT Column */}
                  <div className="flex flex-col">
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Prospect</h3>
                        <Badge variant="secondary" className="ml-2">
                          {contacts.filter(c => c.type === 'PROSPECT').length}
                        </Badge>
                      </div>
                    </div>
                    <Droppable droppableId="PROSPECT">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 space-y-2 min-h-[200px] rounded-lg p-2 ${
                            snapshot.isDraggingOver ? 'bg-muted/50' : ''
                          }`}
                        >
                          {contacts
                            .filter(c => c.type === 'PROSPECT')
                            .map((contact, index) => (
                              <Draggable
                                key={contact.id}
                                draggableId={`contact-${contact.id}`}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-card border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow ${
                                      snapshot.isDragging ? 'shadow-lg' : ''
                                    }`}
                                    onClick={() => openPreviewDialog(contact)}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                          <AvatarFallback className="text-xs">
                                            {contact.name.substring(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="font-medium text-sm">{contact.name}</p>
                                          {contact.email && (
                                            <p className="text-xs text-muted-foreground">{contact.email}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {contact.tags && contact.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {contact.tags.slice(0, 2).map((tag, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="outline"
                                            className="text-xs"
                                            style={{
                                              borderColor: tag.color,
                                              color: tag.color,
                                            }}
                                          >
                                            {tag.tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>

                  {/* CLIENT Column */}
                  <div className="flex flex-col">
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Clienti</h3>
                        <Badge variant="secondary" className="ml-2">
                          {contacts.filter(c => c.type === 'CLIENT').length}
                        </Badge>
                      </div>
                    </div>
                    <Droppable droppableId="CLIENT">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 space-y-2 min-h-[200px] rounded-lg p-2 ${
                            snapshot.isDraggingOver ? 'bg-muted/50' : ''
                          }`}
                        >
                          {contacts
                            .filter(c => c.type === 'CLIENT')
                            .map((contact, index) => (
                              <Draggable
                                key={contact.id}
                                draggableId={`contact-${contact.id}`}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-card border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow ${
                                      snapshot.isDragging ? 'shadow-lg' : ''
                                    }`}
                                    onClick={() => openPreviewDialog(contact)}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                          <AvatarFallback className="text-xs">
                                            {contact.name.substring(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="font-medium text-sm">{contact.name}</p>
                                          {contact.email && (
                                            <p className="text-xs text-muted-foreground">{contact.email}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {contact.tags && contact.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {contact.tags.slice(0, 2).map((tag, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="outline"
                                            className="text-xs"
                                            style={{
                                              borderColor: tag.color,
                                              color: tag.color,
                                            }}
                                          >
                                            {tag.tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              </DragDropContext>
            )}

            {/* Load More and Pagination - Only for table view */}
            {viewMode === 'table' && !loading && contacts.length > 0 && (
              <div className="space-y-4">
                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center">
                    <Button
                      onClick={loadMore}
                      disabled={loadingMore}
                      variant="outline"
                      className="cursor-pointer"
                    >
                      {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {loadingMore ? 'Caricamento...' : 'Carica altro'}
                    </Button>
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {contacts.length} di {totalContacts} contatti
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                        loadContacts(1)
                      }}
                      className="cursor-pointer"
                    >
                      Prima
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                        loadContacts(currentPage - 1)
                      }}
                      className="cursor-pointer"
                    >
                      Precedente
                    </Button>
                    <div className="flex items-center gap-1 text-sm px-3">
                      <span className="text-muted-foreground">Pagina</span>
                      <span className="font-medium">{currentPage}</span>
                      <span className="text-muted-foreground">di</span>
                      <span className="font-medium">{totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                        loadContacts(currentPage + 1)
                      }}
                      className="cursor-pointer"
                    >
                      Successivo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                        loadContacts(totalPages)
                      }}
                      className="cursor-pointer"
                    >
                      Ultima
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Contact Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? "Nuovo Contatto" : "Modifica Contatto"}
            </DialogTitle>
            <DialogDescription>
              {isCreateDialogOpen
                ? "Inserisci i dati del nuovo contatto"
                : "Modifica i dati del contatto"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="Nome completo o ragione sociale"
              />
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => updateFormData({ type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COLLABORATION">Collaborazione</SelectItem>
                  <SelectItem value="USEFUL_CONTACT">Contatto Utile</SelectItem>
                  <SelectItem value="PROSPECT">Prospect</SelectItem>
                  <SelectItem value="CLIENT">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData({ email: e.target.value })}
                  placeholder="email@esempio.it"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateFormData({ phone: e.target.value })}
                  placeholder="+39 ..."
                />
              </div>
            </div>

            {/* Mobile and Website */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mobile">Cellulare</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => updateFormData({ mobile: e.target.value })}
                  placeholder="+39 ..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="website">Sito Web</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => updateFormData({ website: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid gap-2">
              <Label htmlFor="address">Indirizzo</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => updateFormData({ address: e.target.value })}
                placeholder="Via, numero civico"
              />
            </div>

            {/* City, Province, ZIP */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">Città</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => updateFormData({ city: e.target.value })}
                  placeholder="Città"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => updateFormData({ province: e.target.value })}
                  placeholder="PR"
                  maxLength={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zipCode">CAP</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => updateFormData({ zipCode: e.target.value })}
                  placeholder="00000"
                />
              </div>
            </div>

            {/* Partita IVA and Codice Fiscale */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="partitaIva">Partita IVA</Label>
                <Input
                  id="partitaIva"
                  value={formData.partitaIva}
                  onChange={(e) => updateFormData({ partitaIva: e.target.value })}
                  placeholder="IT..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="codiceFiscale">Codice Fiscale</Label>
                <Input
                  id="codiceFiscale"
                  value={formData.codiceFiscale}
                  onChange={(e) => updateFormData({ codiceFiscale: e.target.value })}
                  placeholder="..."
                />
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateFormData({ notes: e.target.value })}
                placeholder="Note aggiuntive..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setIsEditDialogOpen(false)
                setSelectedContact(null)
                resetForm()
              }}
              className="cursor-pointer"
            >
              Annulla
            </Button>
            <Button
              onClick={isCreateDialogOpen ? handleCreate : handleEdit}
              disabled={submitting}
              className="cursor-pointer"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreateDialogOpen ? "Crea Contatto" : "Salva Modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il contatto <strong>{selectedContact?.name}</strong>?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-white! hover:bg-destructive/90 cursor-pointer"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Close Dialog */}
      <AlertDialog open={isConfirmCloseDialogOpen} onOpenChange={setIsConfirmCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifiche non salvate</AlertDialogTitle>
            <AlertDialogDescription>
              Hai delle modifiche non salvate. Sei sicuro di voler chiudere senza salvare?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Continua a modificare</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCloseDialog}
              className="cursor-pointer"
            >
              Chiudi senza salvare
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Contact Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedContact && (
            <div className="space-y-0">
              {/* Header */}
              <div className="border-b pb-6 mb-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarFallback className="bg-muted text-foreground text-2xl font-bold">
                      {selectedContact.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 pt-2">
                    <h2 className="text-3xl font-bold mb-2">{selectedContact.name}</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 border px-3 py-1 rounded-full">
                        {React.createElement(getTypeIcon(selectedContact.type), { className: "h-4 w-4" })}
                        <span className="text-sm font-medium">{getTypeLabel(selectedContact.type)}</span>
                      </div>
                      <Badge variant="outline">
                        {selectedContact.status || "N/A"}
                      </Badge>
                      {selectedContact.tags.slice(0, 2).map((tagObj) => (
                        <Badge key={tagObj.id} variant="outline">
                          {tagObj.tag}
                        </Badge>
                      ))}
                      {selectedContact.tags.length > 2 && (
                        <Badge variant="outline">
                          +{selectedContact.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6">

              {/* Informazioni di Contatto */}
              <div className="grid gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Informazioni di Contatto</h4>
                  <div className="grid gap-2">
                    {selectedContact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${selectedContact.email}`} className="hover:underline">
                          {selectedContact.email}
                        </a>
                      </div>
                    )}
                    {selectedContact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${selectedContact.phone}`} className="hover:underline">
                          {selectedContact.phone}
                        </a>
                      </div>
                    )}
                    {selectedContact.mobile && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${selectedContact.mobile}`} className="hover:underline">
                          {selectedContact.mobile} (Cellulare)
                        </a>
                      </div>
                    )}
                    {selectedContact.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="h-4 w-4 text-muted-foreground">🌐</span>
                        <a href={selectedContact.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {selectedContact.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Indirizzo */}
                {(selectedContact.address || selectedContact.city) && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Indirizzo</h4>
                    <div className="text-sm text-muted-foreground">
                      {selectedContact.address && <div>{selectedContact.address}</div>}
                      <div>
                        {selectedContact.zipCode && `${selectedContact.zipCode} `}
                        {selectedContact.city}
                        {selectedContact.province && ` (${selectedContact.province})`}
                      </div>
                      {selectedContact.country && <div>{selectedContact.country}</div>}
                    </div>
                  </div>
                )}

                {/* Dati Fiscali */}
                {(selectedContact.partitaIva || selectedContact.codiceFiscale) && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Dati Fiscali</h4>
                    <div className="grid gap-1 text-sm">
                      {selectedContact.partitaIva && (
                        <div>
                          <span className="text-muted-foreground">P.IVA:</span> {selectedContact.partitaIva}
                        </div>
                      )}
                      {selectedContact.codiceFiscale && (
                        <div>
                          <span className="text-muted-foreground">C.F.:</span> {selectedContact.codiceFiscale}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedContact.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedContact.tags.map((tagObj) => (
                        <Badge key={tagObj.id} variant="secondary">
                          {tagObj.tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Note */}
                {selectedContact.notes && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Note</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedContact.notes}</p>
                  </div>
                )}
              </div>

              {/* Azioni */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPreviewDialogOpen(false)
                    setTimeout(() => openEditDialog(selectedContact), 100)
                  }}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Modifica
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsPreviewDialogOpen(false)
                    setTimeout(() => openDeleteDialog(selectedContact), 100)
                  }}
                  className="cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina
                </Button>
              </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
