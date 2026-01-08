'use client'

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePinProtection } from "@/contexts/pin-protection-context"
import { PinUnlockDialog } from "@/components/pin-unlock-dialog"
import { ProtectedData } from "@/components/protected-data"
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
import { Plus, MoreVertical, Phone, Mail, Search, User, Building2, Edit, Trash2, LayoutList, LayoutGrid } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { useState, useEffect } from 'react'
import { leadsAPI } from '@/lib/leads-api'
import type { Lead, FunnelStage } from '@/lib/leads-api'
import type { Contact } from '@/lib/contacts-api'
import { userPreferencesAPI } from '@/lib/user-preferences-api'
import { toast } from 'sonner'

interface QuickLeadFormData {
  selectedContactId: string
  serviceType: string
  funnelValue: string
  leadSource: string
  contactDate: string
  name: string
  email: string
  phone: string
}

function LeadCard({ lead, index, onLeadClick, onEditLead, onDeleteLead }: { lead: Lead; index: number; onLeadClick: (lead: Lead) => void; onEditLead: (lead: Lead) => void; onDeleteLead: (lead: Lead) => void }) {
  return (
    <Draggable draggableId={lead.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1,
          }}
        >
          <Card
            className="mb-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
            onClick={() => onLeadClick(lead)}
          >
            <CardHeader className="p-4 pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold">{lead.name}</CardTitle>
                  <CardDescription className="text-xs">
                    <Badge variant="outline" className="text-xs">
                      {lead.type}
                    </Badge>
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onLeadClick(lead); }}>
                      Visualizza dettagli
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditLead(lead); }}>
                      Modifica
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDeleteLead(lead); }}
                    >
                      Elimina
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="space-y-2 text-xs">
                {lead.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                )}
                {(lead.phone || lead.mobile) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{lead.phone || lead.mobile}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm font-semibold">
                  € {(lead.funnelValue || 0).toLocaleString()}
                </div>
                {lead.leadSource && (
                  <Badge variant="secondary" className="text-xs">
                    {lead.leadSource}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  )
}

function KanbanColumn({
  stage,
  leads,
  totalValue,
  onAddLead,
  onLeadClick,
  onEditLead,
  onDeleteLead
}: {
  stage: FunnelStage
  leads: Lead[]
  totalValue: number
  onAddLead: (stageName: string) => void
  onLeadClick: (lead: Lead) => void
  onEditLead: (lead: Lead) => void
  onDeleteLead: (lead: Lead) => void
}) {
  return (
    <div className="flex flex-col min-w-[280px] flex-1">
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {stage.name}
            <Badge variant="secondary" className="font-normal">
              {leads.length}
            </Badge>
          </h3>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onAddLead(stage.name)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          Valore totale: € {totalValue.toLocaleString()}
        </p>
      </div>

      <Droppable droppableId={stage.name}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-lg p-3 border-2 border-dashed min-h-[500px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-muted border-primary' : 'bg-muted/30'
            }`}
          >
            {leads.map((lead, index) => (
              <LeadCard key={lead.id} lead={lead} index={index} onLeadClick={onLeadClick} onEditLead={onEditLead} onDeleteLead={onDeleteLead} />
            ))}
            {provided.placeholder}
            {leads.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Nessuna lead
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}

export default function LeadBoardPage() {
  const { isProtectionEnabled, isUnlocked } = usePinProtection()
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [leads, setLeads] = useState<Record<string, Lead[]>>({})
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [stages, setStages] = useState<FunnelStage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban')
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)

  // Check if data should be protected
  const shouldProtectData = isProtectionEnabled && !isUnlocked
  const [isQuickLeadDialogOpen, setIsQuickLeadDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [isContactPickerOpen, setIsContactPickerOpen] = useState(false)
  const [isConfirmCloseDialogOpen, setIsConfirmCloseDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedStage, setSelectedStage] = useState<string>('daContattare')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactSearchQuery, setContactSearchQuery] = useState('')
  const [contactTypeFilter, setContactTypeFilter] = useState<string>('')
  const [hasFormChanges, setHasFormChanges] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [formData, setFormData] = useState<QuickLeadFormData>({
    selectedContactId: '',
    serviceType: '',
    funnelValue: '',
    leadSource: '',
    contactDate: '',
    name: '',
    email: '',
    phone: '',
  })

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await userPreferencesAPI.getUserPreferences('leads')
        if (preferences?.viewMode) {
          setViewMode(preferences.viewMode as 'table' | 'kanban')
        }
        if (preferences?.typeFilter) {
          setStageFilter(preferences.typeFilter)
        }
      } catch (error) {
        console.error('Failed to load preferences:', error)
      } finally {
        setPreferencesLoaded(true)
      }
    }
    loadPreferences()
  }, [])

  // Save preferences when they change
  useEffect(() => {
    if (!preferencesLoaded) return

    const savePreferences = async () => {
      try {
        await userPreferencesAPI.saveUserPreferences('leads', {
          viewMode,
          typeFilter: stageFilter,
        })
      } catch (error) {
        console.error('Failed to save preferences:', error)
      }
    }

    const timer = setTimeout(savePreferences, 1000)
    return () => clearTimeout(timer)
  }, [viewMode, stageFilter, preferencesLoaded])

  const loadLeads = async () => {
    try {
      setIsLoading(true)
      const response = await leadsAPI.getLeads(selectedYear)
      setLeads(response.data.leads)
      setTotals(response.data.totals)
      setStages(response.data.stages)
    } catch (error: any) {
      console.error('[LeadBoard] Error loading leads:', error)
      toast.error(error.message || 'Errore nel caricamento dei lead')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [selectedYear])

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    // Dropped outside the list
    if (!destination) {
      return
    }

    // Same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    const sourceStage = source.droppableId
    const destStage = destination.droppableId
    const leadId = parseInt(draggableId)

    // Optimistic update
    const newLeads = { ...leads }
    const sourceLeads = Array.from(newLeads[sourceStage] || [])
    const destLeads = sourceStage === destStage
      ? sourceLeads
      : Array.from(newLeads[destStage] || [])

    const [movedLead] = sourceLeads.splice(source.index, 1)

    if (sourceStage === destStage) {
      sourceLeads.splice(destination.index, 0, movedLead)
      newLeads[sourceStage] = sourceLeads
    } else {
      destLeads.splice(destination.index, 0, movedLead)
      newLeads[sourceStage] = sourceLeads
      newLeads[destStage] = destLeads

      // Update totals
      const newTotals = { ...totals }
      newTotals[sourceStage] = (newTotals[sourceStage] || 0) - (movedLead.funnelValue || 0)
      newTotals[destStage] = (newTotals[destStage] || 0) + (movedLead.funnelValue || 0)
      setTotals(newTotals)
    }

    setLeads(newLeads)

    // Update backend
    try {
      await leadsAPI.moveLead(leadId, {
        funnelStage: destStage,
        funnelPosition: destination.index,
      })
      toast.success('Lead spostato con successo')
    } catch (error: any) {
      console.error('[LeadBoard] Error moving lead:', error)
      toast.error(error.message || 'Errore nello spostamento del lead')
      // Revert optimistic update
      loadLeads()
    }
  }

  const handleAddLead = async (stageName: string) => {
    setSelectedStage(stageName)
    setHasFormChanges(false)

    // Carica i contatti per il selettore
    try {
      const { contactsAPI } = await import('@/lib/contacts-api')
      const response = await contactsAPI.getContacts({ limit: 1000 })
      setContacts(response.data.contacts)
    } catch (error: any) {
      console.error('[LeadBoard] Error loading contacts:', error)
      toast.error('Errore nel caricamento dei contatti')
    }

    setIsQuickLeadDialogOpen(true)
  }

  const handleContactSelect = (contact: Contact) => {
    // When selecting a contact from anagrafica, populate fields with contact data
    // These fields will be read-only (disabled) when linkedContactId is set
    updateFormData({
      selectedContactId: contact.id.toString(),
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || contact.mobile || '',
    })
    setIsContactPickerOpen(false)
    setContactSearchQuery('')
    setContactTypeFilter('')
  }

  const getFilteredContacts = () => {
    return contacts.filter(contact => {
      const matchesSearch = contactSearchQuery === '' ||
        contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
        contact.phone?.includes(contactSearchQuery)

      const matchesType = contactTypeFilter === '' || contact.type === contactTypeFilter

      return matchesSearch && matchesType
    })
  }

  const getSelectedContactName = () => {
    if (!formData.selectedContactId) return ''
    const contact = contacts.find(c => c.id.toString() === formData.selectedContactId)
    return contact ? contact.name : ''
  }

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead)
    setIsPreviewDialogOpen(true)
  }

  const handleEditLead = async (lead: Lead) => {
    setSelectedLead(lead)
    setHasFormChanges(false)

    // If the lead is linked to a contact, fetch fresh contact data from anagrafica
    if (lead.linkedContactId) {
      try {
        const { contactsAPI } = await import('@/lib/contacts-api')
        const contactResponse = await contactsAPI.getContactById(lead.linkedContactId)
        const linkedContact = contactResponse.data

        // Populate form with linked contact data (read-only) and lead-specific data
        setFormData({
          selectedContactId: lead.linkedContactId.toString(),
          name: linkedContact.name,
          email: linkedContact.email || '',
          phone: linkedContact.phone || linkedContact.mobile || '',
          serviceType: lead.serviceType || '',
          contactDate: lead.contactDate ? lead.contactDate.split('T')[0] : '',
          funnelValue: lead.funnelValue?.toString() || '',
          leadSource: lead.leadSource || '',
        })
      } catch (error) {
        console.error('[LeadBoard] Error loading linked contact:', error)
        // Fallback to lead data if contact fetch fails
        setFormData({
          selectedContactId: lead.linkedContactId?.toString() || '',
          serviceType: lead.serviceType || '',
          contactDate: lead.contactDate ? lead.contactDate.split('T')[0] : '',
          name: lead.name,
          email: lead.email || '',
          phone: lead.phone || '',
          funnelValue: lead.funnelValue?.toString() || '',
          leadSource: lead.leadSource || '',
        })
      }
    } else {
      // Lead has independent data, not linked to anagrafica
      setFormData({
        selectedContactId: '',
        serviceType: lead.serviceType || '',
        contactDate: lead.contactDate ? lead.contactDate.split('T')[0] : '',
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        funnelValue: lead.funnelValue?.toString() || '',
        leadSource: lead.leadSource || '',
      })
    }

    setIsEditDialogOpen(true)
  }

  const handleUpdateLead = async () => {
    try {
      if (!selectedLead || !formData.name.trim()) {
        toast.error('Il nome è obbligatorio')
        return
      }

      // Update lead using the dedicated lead API endpoint
      await leadsAPI.updateLead(selectedLead.id, {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        funnelValue: formData.funnelValue ? parseFloat(formData.funnelValue) : undefined,
        leadSource: formData.leadSource || undefined,
        serviceType: formData.serviceType || undefined,
        contactDate: formData.contactDate || undefined,
        linkedContactId: formData.selectedContactId ? parseInt(formData.selectedContactId) : undefined,
      })

      toast.success('Lead aggiornato con successo')
      setIsEditDialogOpen(false)
      setSelectedLead(null)
      resetForm()
      loadLeads()
    } catch (error: any) {
      console.error('[LeadBoard] Error updating lead:', error)
      toast.error(error.message || 'Errore nell\'aggiornamento del lead')
    }
  }

  const handleCreateQuickLead = async () => {
    try {
      // Validazione campi obbligatori
      if (!formData.name.trim()) {
        toast.error('Il nome cliente è obbligatorio')
        return
      }
      if (!formData.serviceType.trim()) {
        toast.error('Il tipo di servizio è obbligatorio')
        return
      }
      if (!formData.funnelValue || parseFloat(formData.funnelValue) <= 0) {
        toast.error('Il valore deve essere maggiore di zero')
        return
      }
      if (!formData.leadSource.trim()) {
        toast.error('La fonte è obbligatoria')
        return
      }
      if (!formData.contactDate) {
        toast.error('La data di contatto è obbligatoria')
        return
      }

      await leadsAPI.createQuickLead({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        funnelValue: formData.funnelValue ? parseFloat(formData.funnelValue) : undefined,
        funnelStage: selectedStage,
        leadSource: formData.leadSource || undefined,
        serviceType: formData.serviceType || undefined,
        contactDate: formData.contactDate || undefined,
        linkedContactId: formData.selectedContactId ? parseInt(formData.selectedContactId) : undefined,
      })

      toast.success('Lead creato con successo')
      setIsQuickLeadDialogOpen(false)
      resetForm()
      loadLeads()
    } catch (error: any) {
      console.error('[LeadBoard] Error creating lead:', error)
      toast.error(error.message || 'Errore nella creazione del lead')
    }
  }

  const resetForm = () => {
    setFormData({
      selectedContactId: '',
      serviceType: '',
      funnelValue: '',
      leadSource: '',
      contactDate: '',
      name: '',
      email: '',
      phone: '',
    })
    setHasFormChanges(false)
  }

  const updateFormData = (updates: Partial<QuickLeadFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setHasFormChanges(true)
  }

  const handleDialogClose = (dialogType: 'create' | 'edit', open: boolean) => {
    if (!open && hasFormChanges) {
      setIsConfirmCloseDialogOpen(true)
    } else if (!open) {
      if (dialogType === 'create') {
        setIsQuickLeadDialogOpen(false)
      } else {
        setIsEditDialogOpen(false)
        setSelectedLead(null)
      }
      resetForm()
    }
  }

  const confirmCloseDialog = () => {
    setIsConfirmCloseDialogOpen(false)
    setIsQuickLeadDialogOpen(false)
    setIsEditDialogOpen(false)
    setSelectedLead(null)
    resetForm()
  }

  const openDeleteDialog = (lead: Lead) => {
    setSelectedLead(lead)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteLead = async () => {
    try {
      if (!selectedLead) return

      await leadsAPI.deleteLead(selectedLead.id)
      toast.success('Lead eliminato con successo')
      setIsDeleteDialogOpen(false)
      setSelectedLead(null)
      loadLeads()
    } catch (error: any) {
      console.error('[LeadBoard] Error deleting lead:', error)
      toast.error(error.message || 'Errore nell\'eliminazione del lead')
    }
  }

  const getStageTotal = (stageName: string) => totals[stageName] || 0
  const getStageLeads = (stageName: string) => leads[stageName] || []

  // Calculate overall stats
  const totalPipelineValue = Object.values(totals).reduce((sum, val) => sum + val, 0)
  const totalLeads = Object.values(leads).reduce((sum, stageLeads) => sum + stageLeads.length, 0)
  const closedLeads = getStageLeads('chiusi').length
  const lostLeads = getStageLeads('persi').length
  const finalizedLeads = closedLeads + lostLeads
  const conversionRate = finalizedLeads > 0 ? ((closedLeads / finalizedLeads) * 100).toFixed(1) : '0'

  // Filter leads based on search and stage filter
  const getFilteredLeads = (stageLeads: Lead[]) => {
    return stageLeads.filter(lead => {
      const matchesSearch = searchQuery === '' ||
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone?.includes(searchQuery) ||
        lead.leadSource?.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesSearch
    })
  }

  const pageContent = shouldProtectData ? (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <ProtectedData onUnlock={() => setPinDialogOpen(true)} />
      </Card>
    </div>
  ) : (
    <div className="px-4 lg:px-6 space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        {/* Top Row: Search + Year Filter + View Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca lead..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Year Filter */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
            {/* View Mode Toggle */}
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="h-8"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Stage Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={stageFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStageFilter('')}
          >
            Tutti
          </Button>
          {stages.map((stage) => (
            <Button
              key={stage.id}
              variant={stageFilter === stage.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStageFilter(stage.name)}
            >
              {stage.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Valore Totale Pipeline</CardDescription>
            <CardTitle className="text-3xl">
              € {totalPipelineValue.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Somma di tutti i lead
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tasso di Conversione</CardDescription>
            <CardTitle className="text-3xl">
              {conversionRate}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {closedLeads} vinti su {finalizedLeads} conclusi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Lead Totali</CardDescription>
            <CardTitle className="text-3xl">
              {totalLeads}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In tutte le fasi del funnel
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board / Table View */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {stages
              .filter(stage => stageFilter === '' || stage.name === stageFilter)
              .map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  leads={getFilteredLeads(getStageLeads(stage.name))}
                  totalValue={getStageTotal(stage.name)}
                  onAddLead={handleAddLead}
                  onLeadClick={handleLeadClick}
                  onEditLead={handleEditLead}
                  onDeleteLead={openDeleteDialog}
                />
              ))}
          </div>
        </DragDropContext>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Valore</TableHead>
                <TableHead>Servizio</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(leads)
                .flatMap(([stage, stageLeads]) =>
                  stages.find(s => s.name === stage) && (stageFilter === '' || stage === stageFilter)
                    ? stageLeads.map(lead => ({ ...lead, stage }))
                    : []
                )
                .filter(lead => {
                  const matchesSearch = !searchQuery ||
                    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    lead.phone?.toLowerCase().includes(searchQuery.toLowerCase())
                  return matchesSearch
                })
                .map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleLeadClick(lead)}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{lead.funnelStage || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>€ {(lead.funnelValue || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.serviceType || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.leadSource || '-'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleLeadClick(lead); }}>
                            Visualizza dettagli
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditLead(lead); }}>
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog(lead); }}
                          >
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Quick Lead Creation Dialog */}
      <Dialog open={isQuickLeadDialogOpen} onOpenChange={(open) => handleDialogClose('create', open)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Creazione rapida lead</DialogTitle>
            <DialogDescription>
              Crea velocemente un nuovo lead in {selectedStage}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Selettore contatto dall'anagrafica */}
            <div className="space-y-2">
              <Label>Importa da Anagrafica Clienti (opzionale)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 justify-start"
                  onClick={() => setIsContactPickerOpen(true)}
                >
                  {formData.selectedContactId ? (
                    <span className="truncate">{getSelectedContactName()}</span>
                  ) : (
                    <span className="text-muted-foreground">Seleziona un contatto...</span>
                  )}
                </Button>
                {formData.selectedContactId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      updateFormData({
                        selectedContactId: '',
                        name: '',
                        email: '',
                        phone: '',
                      })
                    }}
                  >
                    ✕
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.selectedContactId
                  ? 'Contatto collegato dall\'anagrafica. I dati (nome, email, telefono) sono sincronizzati automaticamente.'
                  : 'Opzionale: Collega questo lead a un contatto esistente dall\'anagrafica. Se non selezioni nulla, il lead avrà dati indipendenti.'}
              </p>
            </div>

            {/* Tipo di servizio */}
            <div className="space-y-2">
              <Label htmlFor="serviceType">Tipo di Servizio *</Label>
              <Input
                id="serviceType"
                value={formData.serviceType}
                onChange={(e) => updateFormData({ serviceType: e.target.value })}
                placeholder="Es. Consulenza, Sviluppo software, Design..."
              />
            </div>

            {/* Valore e Fonte sulla stessa riga */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="funnelValue">Valore (€) *</Label>
                <Input
                  id="funnelValue"
                  type="number"
                  value={formData.funnelValue}
                  onChange={(e) => updateFormData({ funnelValue: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadSource">Fonte *</Label>
                <Input
                  id="leadSource"
                  value={formData.leadSource}
                  onChange={(e) => updateFormData({ leadSource: e.target.value })}
                  placeholder="Sito web, Referral, LinkedIn..."
                />
              </div>
            </div>

            {/* Data contatto */}
            <div className="space-y-2">
              <Label htmlFor="contactDate">Data Contatto *</Label>
              <Input
                id="contactDate"
                type="date"
                value={formData.contactDate}
                onChange={(e) => updateFormData({ contactDate: e.target.value })}
              />
            </div>

            {/* Divisore */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Informazioni Cliente</h4>
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome Cliente *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="Nome azienda o persona"
                disabled={!!formData.selectedContactId}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData({ email: e.target.value })}
                placeholder="email@esempio.it"
                disabled={!!formData.selectedContactId}
              />
            </div>

            {/* Telefono */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateFormData({ phone: e.target.value })}
                placeholder="+39 333 1234567"
                disabled={!!formData.selectedContactId}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose('create', false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateQuickLead}>Crea Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => handleDialogClose('edit', open)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Lead</DialogTitle>
            <DialogDescription>
              Modifica i dati del lead
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Selettore contatto dall'anagrafica - per cambiare cliente */}
            <div className="space-y-2">
              <Label>Cliente dall'Anagrafica (opzionale)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 justify-start"
                  onClick={() => setIsContactPickerOpen(true)}
                >
                  {formData.selectedContactId ? (
                    <span className="truncate">{getSelectedContactName()}</span>
                  ) : (
                    <span className="text-muted-foreground">Seleziona un contatto...</span>
                  )}
                </Button>
                {formData.selectedContactId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      updateFormData({
                        selectedContactId: '',
                        name: '',
                        email: '',
                        phone: '',
                      })
                    }}
                  >
                    ✕
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.selectedContactId
                  ? 'I dati del cliente sono sincronizzati dall\'anagrafica e non possono essere modificati qui'
                  : 'Clicca per selezionare un contatto dall\'anagrafica'}
              </p>
            </div>

            {/* Tipo di servizio */}
            <div className="space-y-2">
              <Label htmlFor="edit-serviceType">Tipo di Servizio</Label>
              <Input
                id="edit-serviceType"
                value={formData.serviceType}
                onChange={(e) => updateFormData({ serviceType: e.target.value })}
                placeholder="Es. Consulenza, Sviluppo software, Design..."
              />
            </div>

            {/* Valore e Fonte sulla stessa riga */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-funnelValue">Valore (€)</Label>
                <Input
                  id="edit-funnelValue"
                  type="number"
                  value={formData.funnelValue}
                  onChange={(e) => updateFormData({ funnelValue: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-leadSource">Fonte</Label>
                <Input
                  id="edit-leadSource"
                  value={formData.leadSource}
                  onChange={(e) => updateFormData({ leadSource: e.target.value })}
                  placeholder="Sito web, Referral, LinkedIn..."
                />
              </div>
            </div>

            {/* Data contatto */}
            <div className="space-y-2">
              <Label htmlFor="edit-contactDate">Data Contatto</Label>
              <Input
                id="edit-contactDate"
                type="date"
                value={formData.contactDate}
                onChange={(e) => updateFormData({ contactDate: e.target.value })}
              />
            </div>

            {/* Divisore */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Informazioni Cliente</h4>
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Cliente *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="Nome azienda o persona"
                disabled={!!formData.selectedContactId}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData({ email: e.target.value })}
                placeholder="email@esempio.it"
                disabled={!!formData.selectedContactId}
              />
            </div>

            {/* Telefono */}
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefono</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => updateFormData({ phone: e.target.value })}
                placeholder="+39 333 1234567"
                disabled={!!formData.selectedContactId}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose('edit', false)}>
              Annulla
            </Button>
            <Button onClick={handleUpdateLead}>Salva Modifiche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Picker Dialog */}
      <Dialog open={isContactPickerOpen} onOpenChange={setIsContactPickerOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Seleziona Cliente dall'Anagrafica</DialogTitle>
            <DialogDescription>
              Cerca e seleziona un cliente esistente dall'elenco
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Ricerca e Filtri */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome, email o telefono..."
                  className="pl-8"
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={contactTypeFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setContactTypeFilter('')}
                >
                  Tutti
                </Button>
                <Button
                  type="button"
                  variant={contactTypeFilter === 'PROSPECT' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setContactTypeFilter('PROSPECT')}
                >
                  Prospect
                </Button>
                <Button
                  type="button"
                  variant={contactTypeFilter === 'CLIENT' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setContactTypeFilter('CLIENT')}
                >
                  Clienti
                </Button>
                <Button
                  type="button"
                  variant={contactTypeFilter === 'COLLABORATION' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setContactTypeFilter('COLLABORATION')}
                >
                  Collaborazioni
                </Button>
                <Button
                  type="button"
                  variant={contactTypeFilter === 'USEFUL_CONTACT' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setContactTypeFilter('USEFUL_CONTACT')}
                >
                  Contatti Utili
                </Button>
              </div>
            </div>

            {/* Lista Contatti */}
            <div className="flex-1 overflow-y-auto border rounded-lg">
              {getFilteredContacts().length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  Nessun contatto trovato
                </div>
              ) : (
                <div className="divide-y">
                  {getFilteredContacts().map((contact) => {
                    const TypeIcon = contact.type === 'COMPANY' ? Building2 : User
                    return (
                      <div
                        key={contact.id}
                        className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleContactSelect(contact)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold truncate">{contact.name}</h4>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {contact.type}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1 mt-1">
                              {contact.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate">{contact.email}</span>
                                </div>
                              )}
                              {(contact.phone || contact.mobile) && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>{contact.phone || contact.mobile}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsContactPickerOpen(false)}>
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Dettagli Lead</DialogTitle>
            <DialogDescription>Informazioni complete del lead selezionato</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold mb-2">{selectedLead.name}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{selectedLead.type}</Badge>
                  {selectedLead.funnelStage && (
                    <Badge variant="secondary">{selectedLead.funnelStage}</Badge>
                  )}
                  {selectedLead.leadSource && (
                    <Badge variant="outline">Fonte: {selectedLead.leadSource}</Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {/* Contact Info */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Informazioni di Contatto</h4>
                  <div className="grid gap-2 text-sm">
                    {selectedLead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${selectedLead.email}`} className="hover:underline">
                          {selectedLead.email}
                        </a>
                      </div>
                    )}
                    {selectedLead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${selectedLead.phone}`} className="hover:underline">
                          {selectedLead.phone}
                        </a>
                      </div>
                    )}
                    {selectedLead.mobile && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${selectedLead.mobile}`} className="hover:underline">
                          {selectedLead.mobile} (Cellulare)
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Value */}
                {selectedLead.funnelValue && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Valore Stimato</h4>
                    <div className="text-lg font-bold">
                      € {selectedLead.funnelValue.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Address */}
                {(selectedLead.address || selectedLead.city) && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Indirizzo</h4>
                    <div className="text-sm text-muted-foreground">
                      {selectedLead.address && <div>{selectedLead.address}</div>}
                      <div>
                        {selectedLead.zipCode && `${selectedLead.zipCode} `}
                        {selectedLead.city}
                        {selectedLead.province && ` (${selectedLead.province})`}
                      </div>
                      {selectedLead.country && <div>{selectedLead.country}</div>}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedLead.notes && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Note</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedLead.notes}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {selectedLead.tags && selectedLead.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedLead.tags.map((tagObj) => (
                        <Badge key={tagObj.id} variant="secondary">
                          {tagObj.tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPreviewDialogOpen(false)
                    setTimeout(() => handleEditLead(selectedLead), 100)
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
                    setTimeout(() => {
                      setSelectedLead(selectedLead)
                      setIsDeleteDialogOpen(true)
                    }, 100)
                  }}
                  className="cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction onClick={confirmCloseDialog} className="cursor-pointer">
              Chiudi senza salvare
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo lead? Questa azione non può essere annullata.
              {selectedLead && (
                <span className="block mt-2 font-semibold">
                  Lead: {selectedLead.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLead}
              className="bg-destructive text-white! hover:bg-destructive/90 cursor-pointer"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )

  return (
    <>
      <PinUnlockDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} />
      <BaseLayout
        title="Lead Board"
        description="Gestisci il tuo funnel di vendita"
      >
        {pageContent}
      </BaseLayout>
    </>
  )
}
