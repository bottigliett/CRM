import * as React from "react"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Receipt, Download, ExternalLink } from "lucide-react"
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
      // Try to use existing PDF path first
      if (invoice.pdfPath) {
        window.open(invoice.pdfPath, '_blank')
        return
      }

      // Otherwise generate PDF on the fly
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

  return (
    <ClientLayout
      title="Le Tue Fatture"
      description="Visualizza e scarica le tue fatture"
    >
      <div className="px-4 lg:px-6 space-y-6">
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
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {invoice.invoiceNumber}
                        {isOverdue(invoice) && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                            Scaduta
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">{invoice.subject}</CardDescription>
                    </div>
                    <Badge variant="outline" className={getStatusColor(invoice.status)}>
                      {translateStatus(invoice.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Data Emissione</p>
                        <p className="font-medium">
                          {format(new Date(invoice.issueDate), 'dd MMM yyyy', { locale: it })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Scadenza</p>
                        <p className="font-medium">
                          {format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: it })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Importo</p>
                        <p className="text-lg font-bold">€{invoice.total.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(invoice)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Scarica PDF
                      </Button>
                      {invoice.paymentMethod && (
                        <div className="text-sm text-muted-foreground">
                          Pagamento: {invoice.paymentMethod}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  )
}
