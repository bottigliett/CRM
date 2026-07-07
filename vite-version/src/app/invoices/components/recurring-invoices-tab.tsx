import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
  Plus,
  MoreHorizontal,
  Loader2,
  Pencil,
  Trash2,
  CalendarCheck,
  RefreshCw,
  CheckCircle2,
  Clock,
} from "lucide-react"
import {
  recurringInvoicesAPI,
  type RecurringInvoice,
  type GenerationStatus,
} from "@/lib/recurring-invoices-api"
import { RecurringInvoiceDialog } from "./recurring-invoice-dialog"
import { AlertDialogCustom } from "@/components/ui/alert-dialog-custom"

const MESI_ITALIANI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

interface RecurringInvoicesTabProps {
  onInvoicesGenerated?: () => void
}

export function RecurringInvoicesTab({ onInvoicesGenerated }: RecurringInvoicesTabProps) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState((now.getMonth() + 1).toString())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString())
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([])
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringInvoice | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recurringToDelete, setRecurringToDelete] = useState<number | null>(null)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [templatesRes, statusRes] = await Promise.all([
        recurringInvoicesAPI.getAll(),
        recurringInvoicesAPI.getGenerationStatus(parseInt(selectedMonth), parseInt(selectedYear)),
      ])
      if (templatesRes.success) {
        setRecurringInvoices(templatesRes.data)
      }
      if (statusRes.success) {
        setGenerationStatus(statusRes.data)
      }
    } catch (error) {
      console.error('Failed to load recurring invoices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedMonth, selectedYear])

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      const response = await recurringInvoicesAPI.generateMonthly(
        parseInt(selectedMonth),
        parseInt(selectedYear)
      )
      if (response.success) {
        const { generated, skipped } = response.data
        let message = `${generated} fatture generate come BOZZA per ${MESI_ITALIANI[parseInt(selectedMonth) - 1]} ${selectedYear}.`
        if (skipped > 0) {
          message += `\n${skipped} fatture saltate (già generate).`
        }
        setResultMessage(message)
        setResultDialogOpen(true)
        loadData()
        onInvoicesGenerated?.()
      }
    } catch (error: any) {
      console.error('Failed to generate invoices:', error)
      setErrorMessage(error.message || 'Errore durante la generazione delle fatture.')
      setErrorDialogOpen(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleNewRecurring = () => {
    setSelectedRecurring(null)
    setIsDialogOpen(true)
  }

  const handleEditRecurring = (recurring: RecurringInvoice) => {
    setSelectedRecurring(recurring)
    setIsDialogOpen(true)
  }

  const handleDeleteRecurring = (id: number) => {
    setRecurringToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteRecurring = async () => {
    if (recurringToDelete) {
      try {
        await recurringInvoicesAPI.delete(recurringToDelete)
        loadData()
      } catch (error) {
        console.error('Failed to delete recurring invoice:', error)
        setErrorMessage('Errore durante la disattivazione della fattura ricorrente.')
        setErrorDialogOpen(true)
      }
    }
  }

  const getGenerationBadge = (recurringId: number) => {
    const status = generationStatus.find(s => s.recurringInvoiceId === recurringId)
    if (!status) return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Da generare</Badge>
    if (status.generated) {
      return (
        <Badge className="bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {status.invoice?.invoiceNumber || 'Generata'}
        </Badge>
      )
    }
    return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Da generare</Badge>
  }

  // Check if all templates have been generated
  const allGenerated = generationStatus.length > 0 && generationStatus.every(s => s.generated)
  const someGenerated = generationStatus.some(s => s.generated)

  return (
    <div className="space-y-4">
      {/* Header with month selector and generate button */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-muted-foreground" />

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESI_ITALIANI.map((mese, index) => (
                <SelectItem key={index + 1} value={(index + 1).toString()}>
                  {mese}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleNewRecurring} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Nuova Fattura Ricorrente
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || allGenerated || recurringInvoices.length === 0}
            className="bg-primary hover:bg-primary/90"
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Genera fatture del mese
          </Button>
        </div>
      </div>

      {/* Status summary */}
      {recurringInvoices.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {allGenerated ? (
            <span className="text-green-600 font-medium">
              Tutte le {generationStatus.length} fatture di {MESI_ITALIANI[parseInt(selectedMonth) - 1]} {selectedYear} sono state generate
            </span>
          ) : someGenerated ? (
            <span>
              {generationStatus.filter(s => s.generated).length} di {generationStatus.length} fatture generate per {MESI_ITALIANI[parseInt(selectedMonth) - 1]} {selectedYear}
            </span>
          ) : (
            <span>
              {recurringInvoices.length} template attivi - nessuna fattura generata per {MESI_ITALIANI[parseInt(selectedMonth) - 1]} {selectedYear}
            </span>
          )}
        </div>
      )}

      {/* Templates Table */}
      <Card className="pb-6">
        <CardHeader>
          <CardTitle>Template Fatture Ricorrenti</CardTitle>
          <CardDescription>Configura le fatture che vengono generate ogni mese</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : recurringInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <CalendarCheck className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nessun template di fattura ricorrente</p>
              <Button onClick={handleNewRecurring} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Crea il primo template
              </Button>
            </div>
          ) : (
            <div className="relative rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Cliente</TableHead>
                    <TableHead className="min-w-[250px]">Oggetto</TableHead>
                    <TableHead className="w-[110px] text-right">Importo</TableHead>
                    <TableHead className="w-[130px]">Entità</TableHead>
                    <TableHead className="w-[70px] text-center">Giorno</TableHead>
                    <TableHead className="w-[140px]">Stato {MESI_ITALIANI[parseInt(selectedMonth) - 1].substring(0, 3)}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringInvoices.map((recurring) => (
                    <TableRow key={recurring.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{recurring.clientName}</div>
                        {recurring.contact?.email && (
                          <div className="text-xs text-muted-foreground">{recurring.contact.email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm truncate max-w-[250px]">{recurring.subjectTemplate}</div>
                      </TableCell>
                      <TableCell className="font-semibold text-right tabular-nums">
                        {recurring.total.toLocaleString('it-IT', { minimumFractionDigits: 2, style: 'currency', currency: 'EUR' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{recurring.paymentEntity?.name || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {recurring.generationDay}
                      </TableCell>
                      <TableCell>
                        {getGenerationBadge(recurring.id)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditRecurring(recurring)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteRecurring(recurring.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Disattiva
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring Invoice Dialog */}
      <RecurringInvoiceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadData}
        recurringInvoice={selectedRecurring}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialogCustom
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Disattiva Fattura Ricorrente"
        description="Sei sicuro di voler disattivare questo template? Le fatture già generate non verranno eliminate. Potrai riattivarlo in futuro."
        confirmText="Disattiva"
        cancelText="Annulla"
        onConfirm={confirmDeleteRecurring}
        variant="destructive"
      />

      {/* Result Dialog */}
      <AlertDialogCustom
        open={resultDialogOpen}
        onOpenChange={setResultDialogOpen}
        title="Generazione Completata"
        description={resultMessage}
        confirmText="OK"
        cancelText=""
        onConfirm={() => setResultDialogOpen(false)}
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
    </div>
  )
}
