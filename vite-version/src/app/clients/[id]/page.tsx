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

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientAccess | null>(null)
  const [availableQuotes, setAvailableQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showActivationCode, setShowActivationCode] = useState(false)
  const [showDashboardDialog, setShowDashboardDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Dashboard form data
  const [dashboardForm, setDashboardForm] = useState({
    projectName: '',
    projectDescription: '',
    monthlyFee: 0,
    supportHoursIncluded: 0,
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

  const handleActivateDashboard = () => {
    if (!client) return

    // Initialize form with current data or defaults
    setDashboardForm({
      projectName: client.projectName || '',
      projectDescription: client.projectDescription || '',
      monthlyFee: client.monthlyFee || 0,
      supportHoursIncluded: client.supportHoursIncluded || 0,
    })

    // Open dialog
    setShowDashboardDialog(true)
  }

  const handleSaveDashboard = async () => {
    if (!client) return

    try {
      setSaving(true)
      await clientAccessAPI.update(client.id, {
        accessType: 'FULL_CLIENT',
        projectName: dashboardForm.projectName || null,
        projectDescription: dashboardForm.projectDescription || null,
        monthlyFee: dashboardForm.monthlyFee,
        supportHoursIncluded: dashboardForm.supportHoursIncluded,
        supportHoursUsed: 0,
      })
      toast.success('Dashboard attivata con successo')
      setShowDashboardDialog(false)
      loadClientData()
      setActiveTab('dashboard')
    } catch (error: any) {
      console.error('Error activating dashboard:', error)
      toast.error(error.message || "Errore nell'attivazione della dashboard")
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

                        <div className="grid gap-3 md:grid-cols-3 mb-4">
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
                        </div>

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
                <Card>
                  <CardHeader>
                    <CardTitle>Informazioni Progetto</CardTitle>
                    <CardDescription>Gestisci i dettagli del progetto cliente</CardDescription>
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cartelle Drive</CardTitle>
                    <CardDescription>Link alle cartelle del progetto</CardDescription>
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
                            <span className="text-sm font-medium">Cartella Principale</span>
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
                            <span className="text-sm font-medium">Documenti</span>
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
                            <span className="text-sm font-medium">Assets</span>
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
                            <span className="text-sm font-medium">Fatture</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nessuna cartella configurata
                      </p>
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

      {/* Dashboard Activation Dialog */}
      <Dialog open={showDashboardDialog} onOpenChange={setShowDashboardDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attiva Dashboard Completa</DialogTitle>
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
                  Attivazione...
                </>
              ) : (
                <>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Attiva Dashboard
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
