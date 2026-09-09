import { useState, useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { ProtectedData } from "@/components/protected-data"
import { PinUnlockDialog } from "@/components/pin-unlock-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  FileCheck,
  Square,
  CheckSquare,
  RotateCcw,
} from "lucide-react"
import { invoicesAPI, type Invoice, type GetInvoicesParams } from "@/lib/personal-invoices-api"
import { ColumnToggle, type ColumnDef as ToggleColumnDef } from "@/components/ui/column-toggle"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { InvoiceDialog } from "./components/invoice-dialog"
import { InvoicePreviewDialog } from "./components/invoice-preview-dialog"
import { TaxReserveDialog } from "./components/tax-reserve-dialog"
import { AlertDialogCustom } from "@/components/ui/alert-dialog-custom"
import { PaymentEntitySettings } from "@/components/payment-entity-settings"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { CalendarCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { RecurringInvoicesTab } from "./components/recurring-invoices-tab"
import { ComparisonChart } from "./comparison-chart"

export default function InvoicesPage() {
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
  const [isRecurringOpen, setIsRecurringOpen] = useState(false)

  const shouldProtectData = false

  // Filtri — persisted in localStorage
  const currentYear = new Date().getFullYear()
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue'>(() =>
    (localStorage.getItem('inv_status') as any) || 'all'
  )
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'this-month' | 'this-quarter' | 'this-year' | 'last-month' | 'last-quarter' | 'last-year'>(() =>
    (localStorage.getItem('inv_period') as any) || 'this-year'
  )
  const [selectedYear, setSelectedYear] = useState(() => localStorage.getItem('inv_year') || '2026')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [sortBy, setSortBy] = useState<'issueDate' | 'invoiceNumber' | 'total' | 'clientName'>(() =>
    (localStorage.getItem('inv_sortBy') as any) || 'issueDate'
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() =>
    (localStorage.getItem('inv_sortOrder') as any) || 'desc'
  )

  // E-invoice dialog state
  const [eInvoiceDialogOpen, setEInvoiceDialogOpen] = useState(false)
  const [eInvoiceTarget, setEInvoiceTarget] = useState<Invoice | null>(null)
  const [eInvoiceNumber, setEInvoiceNumber] = useState('')

  // Persist filters
  useEffect(() => { localStorage.setItem('inv_status', selectedStatus) }, [selectedStatus])
  useEffect(() => { localStorage.setItem('inv_period', selectedPeriod) }, [selectedPeriod])
  useEffect(() => { localStorage.setItem('inv_year', selectedYear) }, [selectedYear])
  useEffect(() => { localStorage.setItem('inv_sortBy', sortBy) }, [sortBy])
  useEffect(() => { localStorage.setItem('inv_sortOrder', sortOrder) }, [sortOrder])

  // Column config — same pattern as organizations page
  const DEFAULT_COLUMNS: ToggleColumnDef[] = [
    { id: 'invoiceNumber', label: 'Numero' },
    { id: 'clientName', label: 'Cliente' },
    { id: 'paymentEntity', label: 'Destinatario' },
    { id: 'fiscal', label: 'Fiscale' },
    { id: 'total', label: 'Importo' },
    { id: 'issueDate', label: 'Data' },
    { id: 'status', label: 'Stato' },
  ]

  const [columns, setColumns] = useState<ToggleColumnDef[]>(() => {
    try {
      const saved = localStorage.getItem('inv_col_order')
      if (saved) {
        const order: string[] = JSON.parse(saved)
        return [
          ...order.map(id => DEFAULT_COLUMNS.find(c => c.id === id)).filter(Boolean) as ToggleColumnDef[],
          ...DEFAULT_COLUMNS.filter(c => !order.includes(c.id)),
        ]
      }
    } catch {}
    return DEFAULT_COLUMNS
  })

  const [visibleColumnsMap, setVisibleColumnsMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('inv_col_vis')
      if (saved) {
        const defaultVis = Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.id, true]))
        return { ...defaultVis, ...JSON.parse(saved) }
      }
    } catch {}
    return Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.id, true]))
  })

  const persistColumnPrefs = (cols: ToggleColumnDef[], vis: Record<string, boolean>) => {
    localStorage.setItem('inv_col_order', JSON.stringify(cols.map(c => c.id)))
    localStorage.setItem('inv_col_vis', JSON.stringify(vis))
  }

  const toggleColumn = (columnId: string) => {
    setVisibleColumnsMap(prev => {
      const next = { ...prev, [columnId]: !prev[columnId] }
      persistColumnPrefs(columns, next)
      return next
    })
  }

  const handleReorder = (newOrder: string[]) => {
    const reordered = [
      ...newOrder.map(id => columns.find(c => c.id === id)).filter(Boolean) as ToggleColumnDef[],
      ...columns.filter(c => !newOrder.includes(c.id)),
    ]
    setColumns(reordered)
    persistColumnPrefs(reordered, visibleColumnsMap)
  }

  const visibleCols = columns.filter(c => visibleColumnsMap[c.id] !== false)

  // Client-side date filter — matches against the formatted dd/MM/yy string
  const filteredInvoices = dateFilter
    ? invoices.filter(inv => {
        const formatted = format(new Date(inv.issueDate), 'dd/MM/yy', { locale: it })
        return formatted.includes(dateFilter)
      })
    : invoices

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
            sortBy,
            sortOrder,
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
  }, [pagination.page, pagination.limit, selectedStatus, selectedPeriod, selectedYear, searchTerm, sortBy, sortOrder, refreshTrigger])

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

  const handleToggleElectronicInvoice = async (invoice: Invoice) => {
    if (invoice.electronicInvoiceNumber) {
      try {
        await invoicesAPI.patchInvoice(invoice.id, { electronicInvoiceNumber: '' })
        setRefreshTrigger(prev => prev + 1)
      } catch (error) {
        console.error('Failed to update:', error)
      }
    } else {
      setEInvoiceTarget(invoice)
      setEInvoiceNumber('')
      setEInvoiceDialogOpen(true)
    }
  }

  const handleSaveElectronicInvoice = async () => {
    if (!eInvoiceTarget || !eInvoiceNumber.trim()) return
    try {
      await invoicesAPI.patchInvoice(eInvoiceTarget.id, { electronicInvoiceNumber: eInvoiceNumber.trim() })
      setRefreshTrigger(prev => prev + 1)
      setEInvoiceDialogOpen(false)
    } catch (error) {
      console.error('Failed to update:', error)
    }
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
        {/* Azioni */}
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button onClick={() => setIsRecurringOpen(true)} variant="outline">
            <CalendarCheck className="mr-2 h-4 w-4" />
            Fatture Ricorrenti
          </Button>
          <Button onClick={handleNewInvoice} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Nuova Fattura
          </Button>
        </div>

        {/* Filtri */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
          <Filter className="h-5 w-5 text-muted-foreground" />

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

          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
            const [field, order] = v.split('-') as [typeof sortBy, typeof sortOrder]
            setSortBy(field)
            setSortOrder(order)
          }}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoiceNumber-asc">N. Fattura (cresc.)</SelectItem>
              <SelectItem value="invoiceNumber-desc">N. Fattura (decresc.)</SelectItem>
              <SelectItem value="issueDate-desc">Data (recenti)</SelectItem>
              <SelectItem value="issueDate-asc">Data (meno recenti)</SelectItem>
              <SelectItem value="total-desc">Importo (decresc.)</SelectItem>
              <SelectItem value="total-asc">Importo (cresc.)</SelectItem>
              <SelectItem value="clientName-asc">Cliente (A-Z)</SelectItem>
              <SelectItem value="clientName-desc">Cliente (Z-A)</SelectItem>
            </SelectContent>
          </Select>

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
          </div>
          <PaymentEntitySettings />
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
              <ColumnToggle
                columns={columns}
                visibleColumns={visibleColumnsMap}
                onToggle={toggleColumn}
                onReorder={handleReorder}
              />
            </div>
          </CardHeader>
          <CardContent>
                <div className="relative rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleCols.map(col => {
                          const styles: Record<string, string> = {
                            invoiceNumber: 'w-[100px]',
                            clientName: 'min-w-[200px]',
                            paymentEntity: 'w-[150px]',
                            fiscal: 'w-[160px]',
                            total: 'w-[110px] text-right',
                            issueDate: 'w-[90px]',
                            status: 'w-[90px]',
                          }
                          return <TableHead key={col.id} className={styles[col.id] ?? ''}>{col.label}</TableHead>
                        })}
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                      <TableRow>
                        {visibleCols.map(col => {
                          if (col.id === 'status') {
                            return (
                              <TableHead key={`filter-${col.id}`} className="p-1">
                                <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stato" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Tutti</SelectItem>
                                    <SelectItem value="draft">Bozze</SelectItem>
                                    <SelectItem value="issued">Emesse</SelectItem>
                                    <SelectItem value="paid">Pagate</SelectItem>
                                    <SelectItem value="overdue">Scadute</SelectItem>
                                    <SelectItem value="cancelled">Annullate</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableHead>
                            )
                          }
                          if (col.id === 'clientName' || col.id === 'invoiceNumber') {
                            return (
                              <TableHead key={`filter-${col.id}`} className="p-1">
                                <Input
                                  className="h-8 text-xs"
                                  placeholder={col.id === 'clientName' ? 'Cliente...' : 'Numero...'}
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                />
                              </TableHead>
                            )
                          }
                          if (col.id === 'issueDate') {
                            return (
                              <TableHead key={`filter-${col.id}`} className="p-1">
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="dd/mm/aa"
                                  value={dateFilter}
                                  onChange={(e) => setDateFilter(e.target.value)}
                                />
                              </TableHead>
                            )
                          }
                          return <TableHead key={`filter-${col.id}`} className="p-1"></TableHead>
                        })}
                        <TableHead className="w-[50px] p-1">
                          {(searchTerm || dateFilter || selectedStatus !== 'all' || selectedPeriod !== 'all') && (
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => { setSearchTerm(''); setDateFilter(''); setSelectedStatus('all'); setSelectedPeriod('all') }}
                              title="Reset filtri"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingInvoices ? (
                        <TableRow>
                          <TableCell colSpan={visibleCols.length + 1} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={visibleCols.length + 1} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-12 w-12 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Nessuna fattura trovata</p>
                              {!searchTerm && !dateFilter && selectedStatus === 'all' && (
                                <Button onClick={handleNewInvoice} variant="outline" size="sm">
                                  <Plus className="mr-2 h-4 w-4" />
                                  Crea la tua prima fattura
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id} className={invoice.isOverdue && invoice.status === 'ISSUED' ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                          {visibleCols.map(col => {
                            switch (col.id) {
                              case 'invoiceNumber':
                                return <TableCell key={col.id} className="font-mono text-xs font-medium">{invoice.invoiceNumber}</TableCell>
                              case 'clientName':
                                return (
                                  <TableCell key={col.id}>
                                    <div className="font-medium text-sm">{invoice.clientName}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[280px]">{invoice.subject}</div>
                                  </TableCell>
                                )
                              case 'paymentEntity':
                                return <TableCell key={col.id} className="text-sm">{invoice.paymentEntity?.name ?? '—'}</TableCell>
                              case 'fiscal':
                                return (
                                  <TableCell key={col.id} className="text-xs">
                                    {invoice.status === 'PAID' ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                          <Landmark className={`h-3.5 w-3.5 shrink-0 ${invoice.taxReserved ? 'text-orange-500' : 'text-muted-foreground/30'}`} />
                                          <span className={invoice.taxReserved ? 'text-orange-600' : 'text-muted-foreground/40'}>Tasse acc.</span>
                                        </div>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleToggleElectronicInvoice(invoice) }}
                                          className="flex items-center gap-1.5 group"
                                          title={invoice.electronicInvoiceNumber ? `N. ${invoice.electronicInvoiceNumber}` : undefined}
                                        >
                                          {invoice.electronicInvoiceNumber ? (
                                            <>
                                              <CheckSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                              <span className="text-blue-600 truncate max-w-[100px]">FE {invoice.electronicInvoiceNumber}</span>
                                            </>
                                          ) : (
                                            <>
                                              <Square className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground" />
                                              <span className="text-muted-foreground/40 group-hover:text-muted-foreground">Fatt. elettronica</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground/30">—</span>
                                    )}
                                  </TableCell>
                                )
                              case 'total':
                                return <TableCell key={col.id} className="font-semibold text-right tabular-nums">€ {invoice.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</TableCell>
                              case 'issueDate':
                                return <TableCell key={col.id} className="text-xs whitespace-nowrap">{format(new Date(invoice.issueDate), 'dd/MM/yy', { locale: it })}</TableCell>
                              case 'status':
                                return <TableCell key={col.id}>{getStatusBadge(invoice.status, invoice.isOverdue)}</TableCell>
                              default:
                                return <TableCell key={col.id}>—</TableCell>
                            }
                          })}
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

                {pagination.totalPages > 1 && (
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
                )}
          </CardContent>
        </Card>
      </div>
  )

  return (
    <BaseLayout
      title="Area personale"
      description="Fatture personali e confronto fatturato"
    >
      <div className="space-y-4">
        <ComparisonChart />
        {pageContent}
      </div>

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

      {/* Electronic Invoice Number Dialog */}
      <Dialog open={eInvoiceDialogOpen} onOpenChange={setEInvoiceDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Fattura Elettronica</DialogTitle>
            <DialogDescription>
              Inserisci il numero della fattura elettronica per {eInvoiceTarget?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              placeholder="Es. FE-001/2026"
              value={eInvoiceNumber}
              onChange={(e) => setEInvoiceNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveElectronicInvoice()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEInvoiceDialogOpen(false)}>Annulla</Button>
              <Button onClick={handleSaveElectronicInvoice} disabled={!eInvoiceNumber.trim()}>Salva</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Recurring Invoices Dialog */}
      <Dialog open={isRecurringOpen} onOpenChange={setIsRecurringOpen}>
        <DialogContent className="!max-w-[95vw] w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Fatture Ricorrenti</DialogTitle>
            <DialogDescription>
              Gestisci i template e genera le fatture mensili
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <RecurringInvoicesTab onInvoicesGenerated={handleInvoiceCreated} />
          </div>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
