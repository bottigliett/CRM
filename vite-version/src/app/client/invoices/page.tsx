import * as React from "react"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Receipt, Download, Euro, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { clientInvoicesAPI, type Invoice } from "@/lib/client-invoices-api"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const response = await clientInvoicesAPI.getInvoices({ limit: 100 })
      setInvoices(response.data || [])
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast.error('Errore nel caricamento delle fatture')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'ISSUED':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'DRAFT':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'OVERDUE':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'DRAFT': 'Bozza',
      'ISSUED': 'Emessa',
      'PAID': 'Pagata',
      'CANCELLED': 'Annullata',
      'OVERDUE': 'Scaduta'
    }
    return statusMap[status] || status
  }

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') return false
    return new Date(invoice.dueDate) < new Date()
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      if (invoice.pdfPath) {
        window.open(invoice.pdfPath, '_blank')
        return
      }

      const response = await clientInvoicesAPI.getInvoicePDFData(invoice.id)
      if (response.success) {
        await generateInvoicePDF(invoice.id, response.data)
        toast.success('PDF generato con successo')
      } else {
        toast.error('Errore durante la generazione del PDF')
      }
    } catch (error) {
      console.error('Failed to download PDF:', error)
      toast.error('Errore durante il download del PDF')
    }
  }

  // Calculate summary statistics
  const paidInvoices = invoices.filter(i => i.status === 'PAID')
  const pendingInvoices = invoices.filter(i => i.status === 'ISSUED' && !isOverdue(i))
  const overdueInvoices = invoices.filter(i => isOverdue(i))

  const totalPaid = paidInvoices.reduce((sum, i) => sum + i.total, 0)
  const totalPending = pendingInvoices.reduce((sum, i) => sum + i.total, 0)
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + i.total, 0)
  const totalAmount = invoices.reduce((sum, i) => sum + i.total, 0)

  const paidPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0

  return (
    <ClientLayout
      title="Le Tue Fatture"
      description="Visualizza e scarica le tue fatture"
    >
      <div className="px-4 lg:px-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Caricamento...</p>
          </div>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessuna Fattura</h3>
                <p className="text-sm text-muted-foreground">
                  Non ci sono fatture disponibili al momento
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Side - Summary */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Riepilogo Fatture
                </CardTitle>
                <CardDescription>Panoramica dei tuoi pagamenti</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Pagate</span>
                    </div>
                    <p className="text-2xl font-bold">{paidInvoices.length}</p>
                    <p className="text-sm text-muted-foreground">€{totalPaid.toFixed(2)}</p>
                  </div>

                  <div className="p-4 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">In Attesa</span>
                    </div>
                    <p className="text-2xl font-bold">{pendingInvoices.length}</p>
                    <p className="text-sm text-muted-foreground">€{totalPending.toFixed(2)}</p>
                  </div>

                  {overdueInvoices.length > 0 && (
                    <div className="p-4 bg-red-500/10 rounded-lg col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Scadute</span>
                      </div>
                      <p className="text-2xl font-bold">{overdueInvoices.length}</p>
                      <p className="text-sm text-muted-foreground">€{totalOverdue.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Euro className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Totale Fatturato</span>
                    </div>
                    <span className="text-2xl font-bold">€{totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pagato</span>
                      <span className="font-medium">{paidPercentage.toFixed(0)}%</span>
                    </div>
                    <Progress value={paidPercentage} className="h-2" />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="border-t pt-6">
                  <p className="text-sm text-muted-foreground mb-3">Statistiche</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Totale fatture</span>
                      <span className="font-medium">{invoices.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Media per fattura</span>
                      <span className="font-medium">
                        €{invoices.length > 0 ? (totalAmount / invoices.length).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Side - Invoices List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Elenco Fatture</h3>
                <span className="text-sm text-muted-foreground">{invoices.length} fatture</span>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                {invoices.map((invoice) => (
                  <Card key={invoice.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{invoice.invoiceNumber}</span>
                            {isOverdue(invoice) && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                Scaduta
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{invoice.subject}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>Emessa: {format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: it })}</span>
                            <span>Scadenza: {format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: it })}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold">€{invoice.total.toFixed(2)}</p>
                          <Badge variant="outline" className={`${getStatusColor(invoice.status)} mt-1`}>
                            {translateStatus(invoice.status)}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        {invoice.paymentMethod && (
                          <span className="text-xs text-muted-foreground">
                            Pagamento: {invoice.paymentMethod}
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(invoice)}
                          className="ml-auto"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  )
}
