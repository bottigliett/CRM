import { useState, useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProtectedData } from "@/components/protected-data"
import { usePinProtection } from "@/contexts/pin-protection-context"
import { PinUnlockDialog } from "@/components/pin-unlock-dialog"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Plus,
  MoreHorizontal,
  Loader2,
  Filter,
  Pencil,
  Trash2,
  Copy,
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Eye,
  Lock,
  Landmark,
} from "lucide-react"
import { invoicesAPI, type Invoice, type GetInvoicesParams } from "@/lib/invoices-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { InvoiceDialog } from "./components/invoice-dialog"
import { InvoicePreviewDialog } from "./components/invoice-preview-dialog"
import { TaxReserveDialog } from "./components/tax-reserve-dialog"
import { AlertDialogCustom } from "@/components/ui/alert-dialog-custom"
import { PaymentEntitySettings } from "@/components/payment-entity-settings"
import { generateInvoicePDF } from "@/lib/pdf-generator"

export default function InvoicesPage() {
  const { isProtectionEnabled, isUnlocked } = usePinProtection()
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isTaxReserveOpen, setIsTaxReserveOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)
  const [taxReserveInvoice, setTaxReserveInvoice] = useState<Invoice | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const shouldProtectData = isProtectionEnabled && !isUnlocked

  // Filtri
  const currentYear = new Date().getFullYear()
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue'>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'this-month' | 'this-quarter' | 'this-year' | 'last-month' | 'last-quarter' | 'last-year'>('this-year')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [searchTerm, setSearchTerm] = useState('')

  const [stats, setStats] = useState({
    totalIssued: 0,
    totalCollected: 0,
    totalPending: 0,
    overdueCount: 0,
    overdueAmount: 0,
  })

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  })

  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load invoices with debounce for search
  useEffect(() => {
    // Debounce search input
    const timeoutId = setTimeout(() => {
      async function loadInvoices() {
        try {
          setIsLoadingInvoices(true)
          setIsLoadingStats(true)

          const params: GetInvoicesParams = {
            page: pagination.page,
            limit: pagination.limit,
            status: selectedStatus,
            period: selectedPeriod,
            year: (selectedPeriod === 'this-year' || selectedPeriod === 'all') ? selectedYear : undefined,
            search: searchTerm || undefined,
            includeStats: true,
            currentYear: selectedPeriod === 'all' ? false : undefined,
          }

          console.log('Loading invoices with params:', params)
          const response = await invoicesAPI.getInvoices(params)
          console.log('Invoices response:', response)

          if (response.success) {
            setInvoices(response.data.invoices || [])
            if (response.data.pagination) {
              setPagination(response.data.pagination)
            }

            // Update stats if included
            if (response.data.statistics) {
              setStats(response.data.statistics)
            }
          } else {
            console.error('API returned error:', response)
            setInvoices([])
          }
        } catch (error) {
          console.error('Failed to load invoices:', error)
          setInvoices([])
        } finally {
          setIsLoadingInvoices(false)
          setIsLoadingStats(false)
        }
      }

      loadInvoices()
    }, searchTerm ? 500 : 0) // 500ms delay for search, instant for other filters

    return () => clearTimeout(timeoutId)
  }, [pagination.page, pagination.limit, selectedStatus, selectedPeriod, selectedYear, searchTerm, refreshTrigger])

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleInvoiceCreated = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    setRefreshTrigger(prev => prev + 1)
  }

  const handleNewInvoice = () => {
    setSelectedInvoice(null)
    setIsDialogOpen(true)
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsDialogOpen(true)
  }

  const handlePreviewInvoice = (invoice: Invoice) => {
    setPreviewInvoice(invoice)
    setIsPreviewOpen(true)
  }

  const handleDeleteInvoice = (id: number) => {
    setInvoiceToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteInvoice = async () => {
    if (invoiceToDelete) {
      try {
        await invoicesAPI.deleteInvoice(invoiceToDelete)
        handleInvoiceCreated()
      } catch (error) {
        console.error('Failed to delete invoice:', error)
        setErrorMessage('Errore durante l\'eliminazione della fattura.')
        setErrorDialogOpen(true)
      }
    }
  }

  const handleDuplicateInvoice = async (id: number) => {
    try {
      await invoicesAPI.duplicateInvoice(id)
      handleInvoiceCreated()
    } catch (error) {
      console.error('Failed to duplicate invoice:', error)
      setErrorMessage('Errore durante la duplicazione della fattura.')
      setErrorDialogOpen(true)
    }
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      // Fetch formatted PDF data from backend
      const response = await invoicesAPI.getInvoicePDFData(invoice.id);

      if (response.success) {
        // Generate PDF using the existing template
        await generateInvoicePDF(invoice.id, response.data);
      } else {
        setErrorMessage('Errore durante la generazione del PDF.')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
      setErrorMessage('Errore durante il download del PDF.')
      setErrorDialogOpen(true)
    }
  }

  const handleReserveTaxes = (invoice: Invoice) => {
    setTaxReserveInvoice(invoice)
    setIsTaxReserveOpen(true)
  }

  const getStatusBadge = (status: Invoice['status'], isOverdue?: boolean) => {
    if (isOverdue && status === 'ISSUED') {
      return <Badge variant="destructive">Scaduta</Badge>
    }

    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">Bozza</Badge>
      case 'ISSUED':
        return <Badge variant="outline">Emessa</Badge>
      case 'PAID':
        return <Badge className="bg-green-600">Pagata</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Annullata</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const pageContent = shouldProtectData ? (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <ProtectedData onUnlock={() => setPinDialogOpen(true)} />
      </Card>
    </div>
  ) : (
    <div className="h-[calc(100vh-4rem)] flex flex-col px-4 lg:px-6 space-y-4 overflow-y-auto">
        {/* Header con filtri e azioni */}
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />

              <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="draft">Bozze</SelectItem>
                  <SelectItem value="issued">Emesse</SelectItem>
                  <SelectItem value="paid">Pagate</SelectItem>
                  <SelectItem value="overdue">Scadute</SelectItem>
                  <SelectItem value="cancelled">Annullate</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutto il periodo</SelectItem>
                  <SelectItem value="this-month">Questo mese</SelectItem>
                  <SelectItem value="this-quarter">Questo trimestre</SelectItem>
                  <SelectItem value="this-year">Anno</SelectItem>
                  <SelectItem value="last-month">Mese scorso</SelectItem>
                  <SelectItem value="last-quarter">Trimestre scorso</SelectItem>
                </SelectContent>
              </Select>

              {(selectedPeriod === 'this-year' || selectedPeriod === 'all') && (
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Input
                placeholder="Cerca cliente o numero..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-60"
              />

              <Select
                value={pagination.limit.toString()}
                onValueChange={(v) => setPagination({ ...pagination, limit: parseInt(v), page: 1 })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per pagina</SelectItem>
                  <SelectItem value="20">20 per pagina</SelectItem>
                  <SelectItem value="50">50 per pagina</SelectItem>
                  <SelectItem value="100">100 per pagina</SelectItem>
                </SelectContent>
              </Select>

              <PaymentEntitySettings />
            </div>

            <Button onClick={handleNewInvoice} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nuova Fattura
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Emesso</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Caricamento...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    € {(stats.totalIssued || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fatture emesse
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Incassato</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Caricamento...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    € {(stats.totalCollected || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fatture pagate
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Caricamento...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600">
                    € {(stats.totalPending || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Da incassare
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scadute</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Caricamento...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">
                    {stats.overdueCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    € {(stats.overdueAmount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card className="pb-6 flex-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Elenco Fatture</CardTitle>
                <CardDescription>Gestisci e monitora le tue fatture</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingInvoices ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !invoices || invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nessuna fattura trovata</p>
                <Button onClick={handleNewInvoice} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Crea la tua prima fattura
                </Button>
              </div>
            ) : (
              <>
                <div className="relative rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Numero</TableHead>
                        <TableHead className="min-w-[200px]">Cliente</TableHead>
                        <TableHead className="w-[110px] text-right">Importo</TableHead>
                        <TableHead className="w-[90px]">Data</TableHead>
                        <TableHead className="w-[90px]">Stato</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-xs font-medium">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{invoice.clientName}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[280px]">{invoice.subject}</div>
                          </TableCell>
                          <TableCell className="font-semibold text-right tabular-nums">
                            € {invoice.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(invoice.issueDate), 'dd/MM/yy', { locale: it })}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(invoice.status, invoice.isOverdue)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePreviewInvoice(invoice)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Anteprima
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Modifica
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateInvoice(invoice.id)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplica
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Scarica PDF
                                </DropdownMenuItem>
                                {invoice.status === 'PAID' && !invoice.taxReserved && (
                                  <DropdownMenuItem
                                    className="text-orange-600"
                                    onClick={() => handleReserveTaxes(invoice)}
                                  >
                                    <Landmark className="mr-2 h-4 w-4" />
                                    Accantona Tasse
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteInvoice(invoice.id)}
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
                </div>

                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} di {pagination.total} fatture
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      Precedente
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={pagination.page === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      Successivo
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
  )

  return (
    <BaseLayout
      title="Fatture"
      description="Gestisci le tue fatture"
    >
      {pageContent}

      {/* Invoice Dialog */}
      <InvoiceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleInvoiceCreated}
        onInvoicePaid={handleReserveTaxes}
        invoice={selectedInvoice}
      />

      {/* Invoice Preview Dialog */}
      <InvoicePreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        invoice={previewInvoice}
        onDownloadPDF={handleDownloadPDF}
      />

      {/* Tax Reserve Dialog */}
      <TaxReserveDialog
        open={isTaxReserveOpen}
        onOpenChange={setIsTaxReserveOpen}
        onSuccess={handleInvoiceCreated}
        invoice={taxReserveInvoice}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialogCustom
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Elimina Fattura"
        description="Sei sicuro di voler eliminare questa fattura? Verranno eliminate anche tutte le transazioni associate. Questa azione è irreversibile."
        confirmText="Elimina"
        cancelText="Annulla"
        onConfirm={confirmDeleteInvoice}
        variant="destructive"
      />

      {/* Error Dialog */}
      <AlertDialogCustom
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        title="Errore"
        description={errorMessage}
        confirmText="OK"
        cancelText=""
        onConfirm={() => setErrorDialogOpen(false)}
      />

      {/* Pin Unlock Dialog */}
      <PinUnlockDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
      />
    </BaseLayout>
  )
}
