import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  User,
  FileText,
  Settings,
  Mail,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  LayoutDashboard,
  FolderOpen,
  Calendar,
  Euro,
  Clock,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react"
import { clientAccessAPI, type ClientAccess } from "@/lib/client-access-api"
import { quotesAPI, type Quote } from "@/lib/quotes-api"
import { toast } from "sonner"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientAccess | null>(null)
  const [availableQuotes, setAvailableQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeleteQuoteDialog, setShowDeleteQuoteDialog] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<number | null>(null)
  const [showActivationCode, setShowActivationCode] = useState(false)
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false)
  const [showDashboardDialog, setShowDashboardDialog] = useState(false)
  const [showFoldersDialog, setShowFoldersDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Dashboard form data
  const [dashboardForm, setDashboardForm] = useState({
    projectName: '',
    projectDescription: '',
    projectObjectives: '',
    monthlyFee: 0,
    projectBudget: 0,
    budgetDisplayType: 'monthly_fee' as 'monthly_fee' | 'project_budget',
    supportHoursIncluded: 0,
    driveFolderLink: '',
    driveFolderLinkTitle: '',
    documentsFolder: '',
    documentsFolderTitle: '',
    assetsFolder: '',
    assetsFolderTitle: '',
    invoiceFolder: '',
    invoiceFolderTitle: '',
  })

  // Folders form data
  const [foldersForm, setFoldersForm] = useState({
    driveFolderLink: '',
    driveFolderLinkTitle: '',
    documentsFolder: '',
    documentsFolderTitle: '',
    assetsFolder: '',
    assetsFolderTitle: '',
    invoiceFolder: '',
    invoiceFolderTitle: '',
  })

  useEffect(() => {
    if (id) {
      loadClientData()
    }
  }, [id])

  const loadClientData = async () => {
    try {
      setLoading(true)
      const response = await clientAccessAPI.getById(parseInt(id!))
      setClient(response.data)

      // Load available quotes for this contact
      if (response.data.contactId) {
        const quotesRes = await quotesAPI.getAll({ contactId: response.data.contactId })
        setAvailableQuotes(quotesRes.data || [])
      }
    } catch (error: any) {
      console.error('Error loading client:', error)
      toast.error(error.message || 'Errore nel caricamento del cliente')
      navigate('/clients')
    } finally {
      setLoading(false)
    }
  }

  const handleResendActivation = async () => {
    if (!client) return

    try {
      await clientAccessAPI.resendActivation(client.id)
      toast.success('Email di attivazione inviata')
    } catch (error: any) {
      console.error('Error resending activation:', error)
      toast.error(error.message || "Errore nell'invio dell'email")
    }
  }

  const handleToggleActivationCode = () => {
    setShowActivationCode(!showActivationCode)
  }

  const handleToggleTemporaryPassword = () => {
    setShowTemporaryPassword(!showTemporaryPassword)
  }

  const handleDisableTemporaryAccess = async () => {
    if (!client) return

    try {
      setSaving(true)
      await clientAccessAPI.update(client.id, { temporaryPassword: null })
      toast.success('Accesso momentaneo disattivato')
      loadClientData()
    } catch (error: any) {
      console.error('Error disabling temporary access:', error)
      toast.error(error.message || "Errore nella disattivazione")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!client) return

    try {
      setSaving(true)
      await clientAccessAPI.update(client.id, { isActive: !client.isActive })
      toast.success(`Cliente ${!client.isActive ? 'attivato' : 'disattivato'}`)
      loadClientData()
    } catch (error: any) {
      console.error('Error updating client:', error)
      toast.error(error.message || "Errore nell'aggiornamento")
    } finally {
      setSaving(false)
    }
  }

  const handlePreviewDashboard = async () => {
    if (!client) return

    try {
      setSaving(true)
      // Genera il token di preview
      const response = await clientAccessAPI.generatePreviewToken(client.id)

      if (response.success && response.data.token) {
        // Apri la dashboard cliente in una nuova finestra con il token
        const previewUrl = `/client/dashboard?preview_token=${response.data.token}`
        window.open(previewUrl, '_blank')
        toast.success('Anteprima aperta in una nuova finestra')
      }
    } catch (error: any) {
      console.error('Error generating preview token:', error)
      toast.error(error.message || "Errore nell'apertura dell'anteprima")
    } finally {
      setSaving(false)
    }
  }

  const handleActivateDashboard = () => {
    if (!client) return

    // Initialize form with current data or defaults
    setDashboardForm({
      projectName: client.projectName || '',
      projectDescription: client.projectDescription || '',
      projectObjectives: (client as any).projectObjectives || '',
      monthlyFee: client.monthlyFee || 0,
      projectBudget: (client as any).projectBudget || 0,
      budgetDisplayType: (client as any).budgetDisplayType || 'monthly_fee',
      supportHoursIncluded: client.supportHoursIncluded || 0,
      driveFolderLink: client.driveFolderLink || '',
      driveFolderLinkTitle: (client as any).driveFolderLinkTitle || '',
      documentsFolder: client.documentsFolder || '',
      documentsFolderTitle: (client as any).documentsFolderTitle || '',
      assetsFolder: client.assetsFolder || '',
      assetsFolderTitle: (client as any).assetsFolderTitle || '',
      invoiceFolder: client.invoiceFolder || '',
      invoiceFolderTitle: (client as any).invoiceFolderTitle || '',
    })

    // Open dialog
    setShowDashboardDialog(true)
  }

  const handleEditFolders = () => {
    if (!client) return

    // Initialize form with current data
    setFoldersForm({
      driveFolderLink: client.driveFolderLink || '',
      driveFolderLinkTitle: (client as any).driveFolderLinkTitle || '',
      documentsFolder: client.documentsFolder || '',
      documentsFolderTitle: (client as any).documentsFolderTitle || '',
      assetsFolder: client.assetsFolder || '',
      assetsFolderTitle: (client as any).assetsFolderTitle || '',
      invoiceFolder: client.invoiceFolder || '',
      invoiceFolderTitle: (client as any).invoiceFolderTitle || '',
    })

    // Open dialog
    setShowFoldersDialog(true)
  }

  const handleSaveFolders = async () => {
    if (!client) return

    try {
      setSaving(true)
      await clientAccessAPI.update(client.id, {
        driveFolderLink: foldersForm.driveFolderLink || null,
        driveFolderLinkTitle: foldersForm.driveFolderLinkTitle || null,
        documentsFolder: foldersForm.documentsFolder || null,
        documentsFolderTitle: foldersForm.documentsFolderTitle || null,
        assetsFolder: foldersForm.assetsFolder || null,
        assetsFolderTitle: foldersForm.assetsFolderTitle || null,
        invoiceFolder: foldersForm.invoiceFolder || null,
        invoiceFolderTitle: foldersForm.invoiceFolderTitle || null,
      })
      toast.success('Cartelle aggiornate con successo')
      setShowFoldersDialog(false)
      loadClientData()
    } catch (error: any) {
      console.error('Error updating folders:', error)
      toast.error(error.message || "Errore nell'aggiornamento delle cartelle")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDashboard = async () => {
    if (!client) return

    const isEditing = client.accessType === 'FULL_CLIENT'

    try {
      setSaving(true)
      const updateData: any = {
        projectName: dashboardForm.projectName || null,
        projectDescription: dashboardForm.projectDescription || null,
        projectObjectives: dashboardForm.projectObjectives || null,
        monthlyFee: dashboardForm.monthlyFee,
        projectBudget: dashboardForm.projectBudget,
        budgetDisplayType: dashboardForm.budgetDisplayType,
        supportHoursIncluded: dashboardForm.supportHoursIncluded,
        driveFolderLink: dashboardForm.driveFolderLink || null,
        driveFolderLinkTitle: dashboardForm.driveFolderLinkTitle || null,
        documentsFolder: dashboardForm.documentsFolder || null,
        documentsFolderTitle: dashboardForm.documentsFolderTitle || null,
        assetsFolder: dashboardForm.assetsFolder || null,
        assetsFolderTitle: dashboardForm.assetsFolderTitle || null,
        invoiceFolder: dashboardForm.invoiceFolder || null,
        invoiceFolderTitle: dashboardForm.invoiceFolderTitle || null,
      }

      // Only set these when activating, not when editing
      if (!isEditing) {
        updateData.accessType = 'FULL_CLIENT'
        updateData.temporaryPassword = null // Disattiva accesso momentaneo quando si attiva dashboard
        updateData.supportHoursUsed = 0
      }

      await clientAccessAPI.update(client.id, updateData)

      if (isEditing) {
        toast.success('Impostazioni dashboard aggiornate')
      } else {
        toast.success('Dashboard attivata con successo. Accesso momentaneo disattivato.')
      }
      setShowDashboardDialog(false)
      loadClientData()
      setActiveTab('dashboard')
    } catch (error: any) {
      console.error('Error saving dashboard:', error)
      toast.error(error.message || "Errore nel salvataggio")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!client) return

    try {
      await clientAccessAPI.delete(client.id)
      toast.success('Cliente eliminato')
      navigate('/clients')
    } catch (error: any) {
      console.error('Error deleting client:', error)
      toast.error(error.message || "Errore nell'eliminazione")
    }
  }

  const handleLinkQuote = async (quoteId: number | null) => {
    if (!client) return

    try {
      setSaving(true)
      await clientAccessAPI.update(client.id, { linkedQuoteId: quoteId })
      toast.success('Preventivo collegato')
      loadClientData()
    } catch (error: any) {
      console.error('Error linking quote:', error)
      toast.error(error.message || 'Errore nel collegamento del preventivo')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeleteQuote = (quoteId: number) => {
    setQuoteToDelete(quoteId)
    setShowDeleteQuoteDialog(true)
  }

  const handleDeleteQuote = async () => {
    if (!quoteToDelete) return

    try {
      setSaving(true)
      await quotesAPI.delete(quoteToDelete)
      toast.success('Preventivo eliminato con successo')
      loadClientData()
    } catch (error: any) {
      console.error('Error deleting quote:', error)
      toast.error(error.message || 'Errore nell\'eliminazione del preventivo')
    } finally {
      setSaving(false)
      setShowDeleteQuoteDialog(false)
      setQuoteToDelete(null)
    }
  }

  if (loading) {
    return (
      <BaseLayout title="Caricamento...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </BaseLayout>
    )
  }

  if (!client) {
    return null
  }

  const getStatusBadge = () => {
    if (!client.isActive) {
      return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Disattivo</Badge>
    }
    if (!client.emailVerified) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">In Attesa Attivazione</Badge>
    }
    return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Attivo</Badge>
  }

  return (
    <BaseLayout
      title={client.contact.name}
      description={`Gestione accesso cliente - ${client.username}`}
      headerAction={
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <Button variant="outline" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla Lista
          </Button>
        </div>
      }
    >
      <div className="px-4 lg:px-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <User className="h-4 w-4 mr-2" />
              Panoramica
            </TabsTrigger>
            <TabsTrigger value="quote">
              <FileText className="h-4 w-4 mr-2" />
              Preventivo
            </TabsTrigger>
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Impostazioni
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Client Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Cliente</CardTitle>
                <CardDescription>Dati contatto e accesso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Nome</Label>
                    <p className="font-medium">{client.contact.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{client.contact.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefono</Label>
                    <p className="font-medium">{client.contact.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Username</Label>
                    <p className="font-medium">{client.username}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tipo Accesso</Label>
                    <div className="mt-1">
                      {client.accessType === 'FULL_CLIENT' ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          Cliente Completo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                          Solo Preventivo
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email Verificata</Label>
                    <div className="mt-1">
                      {client.emailVerified ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verificata
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          <XCircle className="h-3 w-3 mr-1" />
                          Non Verificata
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Activation Actions */}
                {!client.emailVerified && client.activationToken && (
                  <div className="pt-4 space-y-3 border-t">
                    <Label>Azioni Attivazione</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleResendActivation}>
                        <Mail className="h-4 w-4 mr-2" />
                        Reinvia Email
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleToggleActivationCode}>
                        {showActivationCode ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Nascondi Codice
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Scopri Codice
                          </>
                        )}
                      </Button>
                    </div>
                    {showActivationCode && (
                      <div className="p-3 rounded-lg border bg-muted/50">
                        <Label className="text-xs text-muted-foreground">Codice di Attivazione</Label>
                        <p className="font-mono text-lg font-semibold mt-1">{client.activationToken}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Il cliente può inserire questo codice su studiomismo.com
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Temporary Access Section */}
                {client.temporaryPassword && (
                  <div className="pt-4 space-y-3 border-t">
                    <Label>Accesso Momentaneo</Label>
                    <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Attivo
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          Il cliente può accedere con password temporanea
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleToggleTemporaryPassword}>
                          {showTemporaryPassword ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Nascondi Password
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Mostra Password
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDisableTemporaryAccess}
                          disabled={saving}
                        >
                          Disattiva Accesso
                        </Button>
                      </div>

                      {showTemporaryPassword && (
                        <div className="p-3 rounded-lg border bg-muted/50">
                          <Label className="text-xs text-muted-foreground">Password Temporanea</Label>
                          <p className="font-mono text-lg font-semibold mt-1">{client.temporaryPassword}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            <strong>Credenziali:</strong> Username: {client.username} | Password: {client.temporaryPassword}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {client.lastLogin && (
                  <div className="pt-4 border-t">
                    <Label className="text-muted-foreground">Ultimo Accesso</Label>
                    <p className="font-medium">
                      {format(new Date(client.lastLogin), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quote Tab */}
          <TabsContent value="quote" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Preventivi</CardTitle>
                    <CardDescription>
                      Tutti i preventivi associati a questo cliente
                    </CardDescription>
                  </div>
                  <Button onClick={() => navigate(`/quotes/create?contactId=${client.contactId}`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Preventivo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {availableQuotes.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nessun Preventivo</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Inizia creando il primo preventivo per questo cliente
                    </p>
                    <Button onClick={() => navigate(`/quotes/create?contactId=${client.contactId}`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crea Preventivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableQuotes.map((quote) => (
                      <div
                        key={quote.id}
                        className="p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-semibold">{quote.quoteNumber}</p>
                              <Badge
                                variant="outline"
                                className={
                                  quote.status === 'ACCEPTED'
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : quote.status === 'REJECTED'
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                    : quote.status === 'SENT'
                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                    : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                }
                              >
                                {quote.status}
                              </Badge>
                              {client.linkedQuoteId === quote.id && (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                                  Visibile al cliente
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{quote.title}</p>
                          </div>
                        </div>

                        <div className={`grid gap-3 ${quote.status === 'ACCEPTED' ? 'md:grid-cols-4' : 'md:grid-cols-3'} mb-4`}>
                          <div>
                            <Label className="text-xs text-muted-foreground">Totale</Label>
                            <p className="font-semibold text-lg">€{quote.total.toFixed(2)}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Valido fino al</Label>
                            <p className="font-medium text-sm">
                              {format(new Date(quote.validUntil), 'dd MMM yyyy', { locale: it })}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Creato il</Label>
                            <p className="font-medium text-sm">
                              {format(new Date(quote.createdAt), 'dd MMM yyyy', { locale: it })}
                            </p>
                          </div>
                          {quote.status === 'ACCEPTED' && quote.selectedPaymentOption && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Piano Pagamento</Label>
                              <p className="font-medium text-sm">
                                {quote.selectedPaymentOption === 'oneTime'
                                  ? 'Pagamento unico'
                                  : quote.selectedPaymentOption === 'payment2'
                                  ? '2 rate'
                                  : quote.selectedPaymentOption === 'payment3'
                                  ? '3 rate'
                                  : quote.selectedPaymentOption === 'payment4'
                                  ? '4 rate'
                                  : 'Non specificato'}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 justify-between">
                          <div className="flex gap-2">
                            {client.linkedQuoteId === quote.id ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLinkQuote(null)}
                                disabled={saving}
                              >
                                Nascondi al Cliente
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleLinkQuote(quote.id)}
                                disabled={saving}
                              >
                                Mostra al Cliente
                              </Button>
                            )}
                            {quote.status === 'ACCEPTED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/quotes/${quote.id}`)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Gestisci Progetto
                              </Button>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => navigate(`/quotes/${quote.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizza
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/quotes/${quote.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifica
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => confirmDeleteQuote(quote.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {client.accessType === 'FULL_CLIENT' ? (
              <>
                {/* Preview Button */}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={handlePreviewDashboard} disabled={saving}>
                    <Eye className="h-4 w-4 mr-2" />
                    Anteprima Dashboard Cliente
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Informazioni Progetto</CardTitle>
                        <CardDescription>Gestisci i dettagli del progetto cliente</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleActivateDashboard}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifica
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Nome Progetto</Label>
                        <p className="font-medium">{client.projectName || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Budget</Label>
                        <p className="font-medium">
                          {client.projectBudget ? `€${client.projectBudget.toLocaleString()}` : '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Canone Mensile</Label>
                        <p className="font-medium">€{client.monthlyFee}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Ore Supporto</Label>
                        <p className="font-medium">
                          {client.supportHoursUsed}h / {client.supportHoursIncluded}h
                        </p>
                      </div>
                    </div>

                    {client.projectDescription && (
                      <div className="pt-4 border-t">
                        <Label className="text-muted-foreground">Descrizione</Label>
                        <p className="text-sm mt-1">{client.projectDescription}</p>
                      </div>
                    )}
                    {(client as any).projectObjectives && (
                      <div className="pt-4 border-t">
                        <Label className="text-muted-foreground">Obiettivo</Label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{(client as any).projectObjectives}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Cartelle Drive</CardTitle>
                        <CardDescription>Link alle cartelle del progetto</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleEditFolders}>
                        <Settings className="h-4 w-4 mr-2" />
                        Modifica
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(client.driveFolderLink || client.documentsFolder || client.assetsFolder || client.invoiceFolder) ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {client.driveFolderLink && (
                          <a
                            href={client.driveFolderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <FolderOpen className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">{(client as any).driveFolderLinkTitle || 'Cartella Principale'}</span>
                          </a>
                        )}
                        {client.documentsFolder && (
                          <a
                            href={client.documentsFolder}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <FolderOpen className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">{(client as any).documentsFolderTitle || 'Documenti'}</span>
                          </a>
                        )}
                        {client.assetsFolder && (
                          <a
                            href={client.assetsFolder}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <FolderOpen className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">{(client as any).assetsFolderTitle || 'Assets'}</span>
                          </a>
                        )}
                        {client.invoiceFolder && (
                          <a
                            href={client.invoiceFolder}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <FolderOpen className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">{(client as any).invoiceFolderTitle || 'Fatture'}</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Nessuna cartella configurata
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard Non Attiva</CardTitle>
                  <CardDescription>
                    Attiva la dashboard completa per gestire progetti, documenti e task
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8">
                    <LayoutDashboard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Passa alla Dashboard Completa</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                      La dashboard completa include gestione documenti, task, calendario,
                      cartelle Drive e molto altro. Attivala per dare al cliente accesso a tutte le funzionalità.
                    </p>
                    <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20 mb-6 max-w-md mx-auto">
                      <p className="text-sm text-muted-foreground">
                        <strong>Nota:</strong> La dashboard può coesistere con i preventivi.
                        Attivandola non perderai i preventivi esistenti.
                      </p>
                    </div>
                    <Button size="lg" onClick={handleActivateDashboard} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Attivazione...
                        </>
                      ) : (
                        <>
                          <LayoutDashboard className="h-5 w-5 mr-2" />
                          Passa Dashboard
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestione Account</CardTitle>
                <CardDescription>Modifica impostazioni e stato dell'account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Stato Account</p>
                      <p className="text-sm text-muted-foreground">
                        {client.isActive ? 'Account attivo' : 'Account disattivato'}
                      </p>
                    </div>
                    <Button
                      variant={client.isActive ? 'destructive' : 'default'}
                      onClick={handleToggleActive}
                      disabled={saving}
                    >
                      {client.isActive ? 'Disattiva' : 'Attiva'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                    <div>
                      <p className="font-medium text-destructive">Elimina Account</p>
                      <p className="text-sm text-muted-foreground">
                        Questa azione è irreversibile
                      </p>
                    </div>
                    <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Elimina
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informazioni Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Cliente:</span>
                  <span className="font-mono">{client.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data Creazione:</span>
                  <span>{format(new Date(client.createdAt), 'dd MMM yyyy HH:mm', { locale: it })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ultimo Aggiornamento:</span>
                  <span>{format(new Date(client.updatedAt), 'dd MMM yyyy HH:mm', { locale: it })}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente l'accesso cliente per{' '}
              <strong>{client.contact.name}</strong>. Il cliente non potrà più accedere al portale.
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

      {/* Delete Quote Confirmation Dialog */}
      <AlertDialog open={showDeleteQuoteDialog} onOpenChange={setShowDeleteQuoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Preventivo</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo preventivo? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dashboard Activation/Edit Dialog */}
      <Dialog open={showDashboardDialog} onOpenChange={setShowDashboardDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {client?.accessType === 'FULL_CLIENT' ? 'Modifica Impostazioni Dashboard' : 'Attiva Dashboard Completa'}
            </DialogTitle>
            <DialogDescription>
              Configura le informazioni della dashboard per il cliente. Tutti i campi sono opzionali.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Nome Progetto</Label>
              <Input
                id="projectName"
                placeholder="es. Sito Web E-commerce"
                value={dashboardForm.projectName}
                onChange={(e) => setDashboardForm({ ...dashboardForm, projectName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">Descrizione Progetto</Label>
              <Textarea
                id="projectDescription"
                placeholder="Descrizione dettagliata del progetto..."
                value={dashboardForm.projectDescription}
                onChange={(e) => setDashboardForm({ ...dashboardForm, projectDescription: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectObjectives">Obiettivo Progetto</Label>
              <Textarea
                id="projectObjectives"
                placeholder="Obiettivo principale del progetto..."
                value={dashboardForm.projectObjectives}
                onChange={(e) => setDashboardForm({ ...dashboardForm, projectObjectives: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetDisplayType">Tipo Visualizzazione Budget</Label>
              <Select
                value={dashboardForm.budgetDisplayType}
                onValueChange={(value) => setDashboardForm({ ...dashboardForm, budgetDisplayType: value as 'monthly_fee' | 'project_budget' })}
              >
                <SelectTrigger id="budgetDisplayType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_fee">Canone Mensile</SelectItem>
                  <SelectItem value="project_budget">Valore Progetto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyFee">Canone Mensile (€)</Label>
                <Input
                  id="monthlyFee"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={dashboardForm.monthlyFee}
                  onChange={(e) => setDashboardForm({ ...dashboardForm, monthlyFee: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectBudget">Valore Progetto (€)</Label>
                <Input
                  id="projectBudget"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={dashboardForm.projectBudget}
                  onChange={(e) => setDashboardForm({ ...dashboardForm, projectBudget: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supportHoursIncluded">Ore Supporto Incluse</Label>
              <Input
                id="supportHoursIncluded"
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={dashboardForm.supportHoursIncluded}
                onChange={(e) => setDashboardForm({ ...dashboardForm, supportHoursIncluded: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <Label className="text-sm font-semibold mb-3 block">Cartelle Drive (opzionali)</Label>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="driveFolderLink" className="text-sm">Cartella Principale</Label>
                  <Input
                    id="driveFolderLink"
                    placeholder="https://drive.google.com/..."
                    value={dashboardForm.driveFolderLink}
                    onChange={(e) => setDashboardForm({ ...dashboardForm, driveFolderLink: e.target.value })}
                  />
                  <Input
                    placeholder="Titolo link (es. Cartella Principale)"
                    value={dashboardForm.driveFolderLinkTitle}
                    onChange={(e) => setDashboardForm({ ...dashboardForm, driveFolderLinkTitle: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentsFolder" className="text-sm">Cartella Documenti</Label>
                  <Input
                    id="documentsFolder"
                    placeholder="https://drive.google.com/..."
                    value={dashboardForm.documentsFolder}
                    onChange={(e) => setDashboardForm({ ...dashboardForm, documentsFolder: e.target.value })}
                  />
                  <Input
                    placeholder="Titolo link (es. Documenti)"
                    value={dashboardForm.documentsFolderTitle}
                    onChange={(e) => setDashboardForm({ ...dashboardForm, documentsFolderTitle: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assetsFolder" className="text-sm">Cartella Assets</Label>
                  <Input
                    id="assetsFolder"
                    placeholder="https://drive.google.com/..."
                    value={dashboardForm.assetsFolder}
                    onChange={(e) => setDashboardForm({ ...dashboardForm, assetsFolder: e.target.value })}
                  />
                  <Input
                    placeholder="Titolo link (es. Assets)"
                    value={dashboardForm.assetsFolderTitle}
                    onChange={(e) => setDashboardForm({ ...dashboardForm, assetsFolderTitle: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceFolder" className="text-sm">Cartella Fatture</Label>
                  <Input
                    id="invoiceFolder"
                    placeholder="https://drive.google.com/..."
                    value={dashboardForm.invoiceFolder}
                    onChange={(e) => setDashboardForm({ ...dashboardForm, invoiceFolder: e.target.value })}
                  />
                  <Input
                    placeholder="Titolo link (es. Fatture)"
                    value={dashboardForm.invoiceFolderTitle}
                    onChange={(e) => setDashboardForm({ ...dashboardForm, invoiceFolderTitle: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDashboardDialog(false)} disabled={saving}>
              Annulla
            </Button>
            <Button onClick={handleSaveDashboard} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {client?.accessType === 'FULL_CLIENT' ? 'Salvataggio...' : 'Attivazione...'}
                </>
              ) : (
                <>
                  {client?.accessType === 'FULL_CLIENT' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Salva Modifiche
                    </>
                  ) : (
                    <>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Attiva Dashboard
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folders Edit Dialog */}
      <Dialog open={showFoldersDialog} onOpenChange={setShowFoldersDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Cartelle Drive</DialogTitle>
            <DialogDescription>
              Aggiorna i link alle cartelle del progetto e i titoli personalizzati. Lascia vuoto per rimuovere.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDriveFolderLink">Cartella Principale</Label>
              <Input
                id="editDriveFolderLink"
                placeholder="https://drive.google.com/..."
                value={foldersForm.driveFolderLink}
                onChange={(e) => setFoldersForm({ ...foldersForm, driveFolderLink: e.target.value })}
              />
              <Input
                placeholder="Titolo link (es. Cartella Principale)"
                value={foldersForm.driveFolderLinkTitle}
                onChange={(e) => setFoldersForm({ ...foldersForm, driveFolderLinkTitle: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDocumentsFolder">Cartella Documenti</Label>
              <Input
                id="editDocumentsFolder"
                placeholder="https://drive.google.com/..."
                value={foldersForm.documentsFolder}
                onChange={(e) => setFoldersForm({ ...foldersForm, documentsFolder: e.target.value })}
              />
              <Input
                placeholder="Titolo link (es. Documenti)"
                value={foldersForm.documentsFolderTitle}
                onChange={(e) => setFoldersForm({ ...foldersForm, documentsFolderTitle: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editAssetsFolder">Cartella Assets</Label>
              <Input
                id="editAssetsFolder"
                placeholder="https://drive.google.com/..."
                value={foldersForm.assetsFolder}
                onChange={(e) => setFoldersForm({ ...foldersForm, assetsFolder: e.target.value })}
              />
              <Input
                placeholder="Titolo link (es. Assets)"
                value={foldersForm.assetsFolderTitle}
                onChange={(e) => setFoldersForm({ ...foldersForm, assetsFolderTitle: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editInvoiceFolder">Cartella Fatture</Label>
              <Input
                id="editInvoiceFolder"
                placeholder="https://drive.google.com/..."
                value={foldersForm.invoiceFolder}
                onChange={(e) => setFoldersForm({ ...foldersForm, invoiceFolder: e.target.value })}
              />
              <Input
                placeholder="Titolo link (es. Fatture)"
                value={foldersForm.invoiceFolderTitle}
                onChange={(e) => setFoldersForm({ ...foldersForm, invoiceFolderTitle: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFoldersDialog(false)} disabled={saving}>
              Annulla
            </Button>
            <Button onClick={handleSaveFolders} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Salva Cartelle
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
