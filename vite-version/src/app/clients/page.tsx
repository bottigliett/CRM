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
  User,
  Mail,
  FileText,
  Key,
  ArrowUpCircle,
  Trash2,
  Loader2,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Users2,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { clientAccessAPI, type ClientAccess, type CreateClientAccessData, type UpgradeToFullClientData } from "@/lib/client-access-api"
import { contactsAPI, type Contact } from "@/lib/contacts-api"
import { toast } from "sonner"

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientAccess[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalClients, setTotalClients] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientAccess | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CreateClientAccessData>({
    contactId: 0,
    accessType: 'QUOTE_ONLY',
    linkedQuoteId: null,
    projectName: '',
    projectDescription: '',
    projectBudget: 0,
    monthlyFee: 0,
    supportHoursIncluded: 0,
    driveFolderLink: '',
    documentsFolder: '',
    assetsFolder: '',
    invoiceFolder: '',
  })

  // Upgrade form state
  const [upgradeData, setUpgradeData] = useState<UpgradeToFullClientData>({
    projectName: '',
    projectDescription: '',
    projectBudget: 0,
    monthlyFee: 0,
    supportHoursIncluded: 0,
    driveFolderLink: '',
    documentsFolder: '',
    assetsFolder: '',
    invoiceFolder: '',
  })

  // Load clients
  const loadClients = async () => {
    try {
      setLoading(true)
      const response = await clientAccessAPI.getAll({
        search: searchQuery || undefined,
        accessType: typeFilter !== 'all' ? typeFilter : undefined,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        page: currentPage,
        limit: 50,
      })

      setClients(response.data)
      setTotalClients(response.pagination.total)
      setTotalPages(response.pagination.pages)
    } catch (error) {
      console.error('Errore nel caricamento clienti:', error)
      toast.error('Errore nel caricamento dei clienti')
    } finally {
      setLoading(false)
    }
  }

  // Load contacts for dropdown
  const loadContacts = async () => {
    try {
      const response = await contactsAPI.getAll({ limit: 1000 })
      setContacts(response.data)
    } catch (error) {
      console.error('Errore nel caricamento contatti:', error)
    }
  }

  useEffect(() => {
    loadClients()
  }, [searchQuery, typeFilter, statusFilter, currentPage])

  useEffect(() => {
    loadContacts()
  }, [])

  // Reset form
  const resetForm = () => {
    setFormData({
      contactId: 0,
      accessType: 'QUOTE_ONLY',
      linkedQuoteId: null,
      projectName: '',
      projectDescription: '',
      projectBudget: 0,
      monthlyFee: 0,
      supportHoursIncluded: 0,
      driveFolderLink: '',
      documentsFolder: '',
      assetsFolder: '',
      invoiceFolder: '',
    })
  }

  // Handle create
  const handleCreate = async () => {
    if (!formData.contactId) {
      toast.error('Seleziona un contatto')
      return
    }

    try {
      setSubmitting(true)
      const response = await clientAccessAPI.create(formData)
      toast.success(response.message || 'Accesso cliente creato con successo')
      setIsCreateDialogOpen(false)
      resetForm()
      loadClients()
    } catch (error: any) {
      console.error('Errore nella creazione:', error)
      toast.error(error.response?.data?.message || 'Errore nella creazione dell\'accesso')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle update
  const handleUpdate = async () => {
    if (!selectedClient) return

    try {
      setSubmitting(true)
      const response = await clientAccessAPI.update(selectedClient.id, formData)
      toast.success(response.message || 'Accesso cliente aggiornato')
      setIsEditDialogOpen(false)
      setSelectedClient(null)
      resetForm()
      loadClients()
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento:', error)
      toast.error(error.response?.data?.message || 'Errore nell\'aggiornamento')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle upgrade to FULL_CLIENT
  const handleUpgrade = async () => {
    if (!selectedClient) return

    try {
      setSubmitting(true)
      const response = await clientAccessAPI.upgradeToFullClient(selectedClient.id, upgradeData)
      toast.success('Cliente aggiornato a FULL_CLIENT con successo')
      setIsUpgradeDialogOpen(false)
      setSelectedClient(null)
      loadClients()
    } catch (error: any) {
      console.error('Errore nell\'upgrade:', error)
      toast.error(error.response?.data?.message || 'Errore nell\'upgrade del cliente')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!selectedClient) return

    try {
      setSubmitting(true)
      await clientAccessAPI.delete(selectedClient.id)
      toast.success('Accesso cliente eliminato')
      setIsDeleteDialogOpen(false)
      setSelectedClient(null)
      loadClients()
    } catch (error: any) {
      console.error('Errore nell\'eliminazione:', error)
      toast.error(error.response?.data?.message || 'Errore nell\'eliminazione')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle resend activation
  const handleResendActivation = async (client: ClientAccess) => {
    try {
      await clientAccessAPI.resendActivation(client.id)
      toast.success('Email di attivazione reinviata')
    } catch (error: any) {
      console.error('Errore nel reinvio:', error)
      toast.error(error.response?.data?.message || 'Errore nel reinvio dell\'email')
    }
  }

  // Copy activation link
  const copyActivationLink = (client: ClientAccess) => {
    if (!client.activationToken) {
      toast.error('Nessun token di attivazione disponibile')
      return
    }

    const link = clientAccessAPI.getActivationLink(client.activationToken)
    navigator.clipboard.writeText(link)
    toast.success('Link di attivazione copiato negli appunti')
  }

  // Open edit dialog
  const openEditDialog = (client: ClientAccess) => {
    setSelectedClient(client)
    setFormData({
      contactId: client.contactId,
      accessType: client.accessType,
      linkedQuoteId: client.linkedQuoteId,
      projectName: client.projectName || '',
      projectDescription: client.projectDescription || '',
      projectBudget: client.projectBudget || 0,
      monthlyFee: client.monthlyFee,
      supportHoursIncluded: client.supportHoursIncluded,
      driveFolderLink: client.driveFolderLink || '',
      documentsFolder: client.documentsFolder || '',
      assetsFolder: client.assetsFolder || '',
      invoiceFolder: client.invoiceFolder || '',
    })
    setIsEditDialogOpen(true)
  }

  // Open upgrade dialog
  const openUpgradeDialog = (client: ClientAccess) => {
    setSelectedClient(client)
    setUpgradeData({
      projectName: '',
      projectDescription: '',
      projectBudget: 0,
      monthlyFee: 0,
      supportHoursIncluded: 10,
      driveFolderLink: '',
      documentsFolder: '',
      assetsFolder: '',
      invoiceFolder: '',
    })
    setIsUpgradeDialogOpen(true)
  }

  // Get status badge
  const getStatusBadge = (client: ClientAccess) => {
    if (!client.isActive) {
      return <Badge variant="outline" className="text-gray-500"><XCircle className="mr-1 h-3 w-3" />Disattivato</Badge>
    }
    if (!client.emailVerified) {
      return <Badge variant="outline" className="text-yellow-600"><Clock className="mr-1 h-3 w-3" />In Attesa</Badge>
    }
    return <Badge variant="outline" className="text-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Attivo</Badge>
  }

  // Get type badge
  const getTypeBadge = (type: string) => {
    if (type === 'QUOTE_ONLY') {
      return <Badge variant="secondary">Solo Preventivo</Badge>
    }
    return <Badge variant="default">Cliente Completo</Badge>
  }

  return (
    <BaseLayout>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestione Clienti</h1>
            <p className="text-muted-foreground">
              Gestisci gli accessi e i preventivi dei tuoi clienti
            </p>
          </div>
          <Button onClick={() => {
            resetForm()
            setIsCreateDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Accesso
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Clienti</CardTitle>
              <Users2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solo Preventivo</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients.filter(c => c.accessType === 'QUOTE_ONLY').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clienti Completi</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients.filter(c => c.accessType === 'FULL_CLIENT').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, email, username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tipo accesso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              <SelectItem value="QUOTE_ONLY">Solo Preventivo</SelectItem>
              <SelectItem value="FULL_CLIENT">Cliente Completo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="active">Attivi</SelectItem>
              <SelectItem value="inactive">Disattivati</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : clients.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <User className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Nessun cliente trovato</h3>
                <p className="text-sm text-muted-foreground">
                  Inizia creando un nuovo accesso cliente
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Ultimo Accesso</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {client.contact.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{client.contact.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {client.contact.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-sm">
                          {client.username}
                        </code>
                      </TableCell>
                      <TableCell>{getTypeBadge(client.accessType)}</TableCell>
                      <TableCell>{getStatusBadge(client)}</TableCell>
                      <TableCell>
                        {client.lastLogin
                          ? new Date(client.lastLogin).toLocaleDateString('it-IT')
                          : 'Mai'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {!client.emailVerified && client.activationToken && (
                              <>
                                <DropdownMenuItem onClick={() => copyActivationLink(client)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copia Link Attivazione
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResendActivation(client)}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Reinvia Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => openEditDialog(client)}>
                              <User className="mr-2 h-4 w-4" />
                              Modifica
                            </DropdownMenuItem>
                            {client.accessType === 'QUOTE_ONLY' && (
                              <DropdownMenuItem onClick={() => openUpgradeDialog(client)}>
                                <ArrowUpCircle className="mr-2 h-4 w-4" />
                                Upgrade a Full Client
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedClient(client)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Pagina {currentPage} di {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Precedente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Successiva
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          setSelectedClient(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? 'Nuovo Accesso Cliente' : 'Modifica Accesso Cliente'}
            </DialogTitle>
            <DialogDescription>
              Crea un nuovo accesso per un cliente o modifica uno esistente
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="contact">Contatto *</Label>
              <Select
                value={formData.contactId?.toString()}
                onValueChange={(value) => setFormData({ ...formData, contactId: parseInt(value) })}
                disabled={isEditDialogOpen}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona contatto" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id.toString()}>
                      {contact.name} {contact.email && `(${contact.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accessType">Tipo Accesso *</Label>
              <Select
                value={formData.accessType}
                onValueChange={(value: 'QUOTE_ONLY' | 'FULL_CLIENT') =>
                  setFormData({ ...formData, accessType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUOTE_ONLY">Solo Preventivo</SelectItem>
                  <SelectItem value="FULL_CLIENT">Cliente Completo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.accessType === 'FULL_CLIENT' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="projectName">Nome Progetto</Label>
                  <Input
                    id="projectName"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="projectDescription">Descrizione Progetto</Label>
                  <Textarea
                    id="projectDescription"
                    value={formData.projectDescription}
                    onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="monthlyFee">Canone Mensile (€)</Label>
                    <Input
                      id="monthlyFee"
                      type="number"
                      value={formData.monthlyFee}
                      onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="supportHours">Ore Supporto Incluse</Label>
                    <Input
                      id="supportHours"
                      type="number"
                      value={formData.supportHoursIncluded}
                      onChange={(e) => setFormData({ ...formData, supportHoursIncluded: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="driveFolder">Link Cartella Drive</Label>
                  <Input
                    id="driveFolder"
                    value={formData.driveFolderLink}
                    onChange={(e) => setFormData({ ...formData, driveFolderLink: e.target.value })}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false)
              setIsEditDialogOpen(false)
              resetForm()
            }}>
              Annulla
            </Button>
            <Button onClick={isCreateDialogOpen ? handleCreate : handleUpdate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreateDialogOpen ? 'Crea Accesso' : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsUpgradeDialogOpen(false)
          setSelectedClient(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upgrade a Cliente Completo</DialogTitle>
            <DialogDescription>
              Converti {selectedClient?.contact.name} da accesso preventivo a cliente completo
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="upgProjectName">Nome Progetto *</Label>
              <Input
                id="upgProjectName"
                value={upgradeData.projectName}
                onChange={(e) => setUpgradeData({ ...upgradeData, projectName: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="upgProjectDescription">Descrizione Progetto</Label>
              <Textarea
                id="upgProjectDescription"
                value={upgradeData.projectDescription}
                onChange={(e) => setUpgradeData({ ...upgradeData, projectDescription: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="upgMonthlyFee">Canone Mensile (€)</Label>
                <Input
                  id="upgMonthlyFee"
                  type="number"
                  value={upgradeData.monthlyFee}
                  onChange={(e) => setUpgradeData({ ...upgradeData, monthlyFee: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="upgSupportHours">Ore Supporto Incluse</Label>
                <Input
                  id="upgSupportHours"
                  type="number"
                  value={upgradeData.supportHoursIncluded}
                  onChange={(e) => setUpgradeData({ ...upgradeData, supportHoursIncluded: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="upgDriveFolder">Link Cartella Drive</Label>
              <Input
                id="upgDriveFolder"
                value={upgradeData.driveFolderLink}
                onChange={(e) => setUpgradeData({ ...upgradeData, driveFolderLink: e.target.value })}
                placeholder="https://drive.google.com/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleUpgrade} disabled={submitting || !upgradeData.projectName}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upgrade a Full Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà l'accesso di {selectedClient?.contact.name}.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedClient(null)}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BaseLayout>
  )
}
