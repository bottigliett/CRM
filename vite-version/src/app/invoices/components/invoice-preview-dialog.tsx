import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Download, X } from "lucide-react"
import { invoicesAPI, type Invoice } from "@/lib/invoices-api"
import { AlertDialogCustom } from "@/components/ui/alert-dialog-custom"

interface InvoicePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
  onDownloadPDF: (invoice: Invoice) => void
}

export function InvoicePreviewDialog({
  open,
  onOpenChange,
  invoice,
  onDownloadPDF,
}: InvoicePreviewDialogProps) {
  const [previewHTML, setPreviewHTML] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (open && invoice) {
      loadPreview()
    } else {
      setPreviewHTML('')
    }
  }, [open, invoice])

  const loadPreview = async () => {
    if (!invoice) return

    try {
      setIsLoading(true)
      const response = await invoicesAPI.getInvoicePDFData(invoice.id)

      if (response.success) {
        const html = getInvoicePreviewHTML(response.data)
        setPreviewHTML(html)
      }
    } catch (error) {
      console.error('Failed to load preview:', error)
      setErrorMessage('Errore durante il caricamento dell\'anteprima.')
      setErrorDialogOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    if (invoice) {
      onDownloadPDF(invoice)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] h-[98vh] overflow-hidden flex flex-col" style={{ maxWidth: '1800px' }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Anteprima Fattura</DialogTitle>
              <DialogDescription>
                {invoice?.invoiceNumber} - {invoice?.clientName}
              </DialogDescription>
            </div>
            <Button
              onClick={handleDownload}
              disabled={isLoading}
              className="ml-4"
            >
              <Download className="mr-2 h-4 w-4" />
              Scarica PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-md bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div
              className="bg-white mx-auto my-8 shadow-lg"
              style={{
                width: '210mm',
                minHeight: '297mm',
              }}
              dangerouslySetInnerHTML={{ __html: previewHTML }}
            />
          )}
        </div>
      </DialogContent>

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
    </Dialog>
  )
}

function getInvoicePreviewHTML(data: any): string {
  const paymentBank = data.paymentBank || 'REVOLUT BANK UAB';
  const paymentIban = data.paymentIban || 'LT95 3250 0482 6617 5203';
  const paymentBeneficiary = data.paymentBeneficiary || 'STEFANO COSTATO E DAVIDE MARANGONI';
  const paymentBic = data.paymentBic || 'REVOLT21';
  const paymentSdi = data.paymentSdi || 'JI3TXCE';
  const isImmediate = data.paymentDays === 0;

  return `
    <div style="padding: 10mm; font-family: 'Elza', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.35; color: #000; display: flex; flex-direction: column; min-height: 277mm;">

      <!-- CONTENT -->
      <div style="flex: 1;">
        <!-- HEADER -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 18mm;">
          <div>
            <span style="display: block;">MISMO®STUDIO</span>
            <span style="display: block;">di Stefano Costato e Davide Marangoni</span>
            <span style="display: block;">P.IVA IT04904900232 / IT05052740239</span>
            <span style="display: block;">hi@mismo.studio</span>
            <span style="display: block;">(+39) 375 620 9885</span>
            <span style="display: block;">Via Madonna 14 - 37026</span>
            <span style="display: block;">Pescantina / Verona - IT</span>
          </div>
          <div style="justify-self: end; max-width: 78mm; width: 100%;">
            <div style="display: grid; grid-template-columns: 1fr auto; column-gap: 10mm;">
              <div>Fattura numero</div>
              <div style="text-align: right; white-space: nowrap;">${data.invoiceNumber}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr auto; column-gap: 10mm;">
              <div>Data</div>
              <div style="text-align: right; white-space: nowrap;">${data.invoiceDate}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr auto; column-gap: 10mm;">
              <div>Scadenza</div>
              <div style="text-align: right; white-space: nowrap;">${isImmediate ? 'Immediato' : data.paymentDays + ' giorni'}</div>
            </div>
          </div>
        </div>

        <!-- CLIENTE -->
        <div style="margin-top: 18mm;">
          <h2 style="margin: 0 0 2mm 0; font-size: 12px; font-weight: 500;">Cliente</h2>
          <span style="display: block;">${data.clientName}</span>
          ${data.clientPIva ? `<span style="display: block;">P.IVA ${data.clientPIva}</span>` : ''}
          ${data.clientCF ? `<span style="display: block;">C.F. ${data.clientCF}</span>` : ''}
          ${data.clientAddress ? `<span style="display: block;">${data.clientAddress}</span>` : ''}
        </div>

        <!-- OGGETTO -->
        <div style="margin-top: 18mm;">
          <h2 style="margin: 0 0 2mm 0; font-size: 12px; font-weight: 500;">Oggetto</h2>
          <p style="margin: 0;">${data.subject}</p>
        </div>

        <!-- SERVIZI TABLE -->
        <div style="margin-top: 10mm;">
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <colgroup>
              <col style="width: 58%;">
              <col style="width: 14%;">
              <col style="width: 14%;">
              <col style="width: 14%;">
            </colgroup>
            <thead>
              <tr>
                <th style="border-bottom: 1px solid #000; padding-bottom: 1mm; font-size: 9px; text-align: left; font-weight: 500;">Servizio</th>
                <th style="border-bottom: 1px solid #000; padding-bottom: 1mm; font-size: 9px; text-align: center; font-weight: 500;">Quantità</th>
                <th style="border-bottom: 1px solid #000; padding-bottom: 1mm; font-size: 9px; text-align: center; font-weight: 500;">IVA</th>
                <th style="border-bottom: 1px solid #000; padding-bottom: 1mm; font-size: 9px; text-align: right; font-weight: 500;">Prezzo cad.</th>
              </tr>
            </thead>
            <tbody>
              ${data.services && data.services.length > 0 ?
                data.services.map((service: any) => `
                  <tr>
                    <td style="border-bottom: 1px solid #000; padding: 2mm 0;">${service.description}</td>
                    <td style="border-bottom: 1px solid #000; padding: 2mm 0; text-align: center; white-space: nowrap;">${service.quantity}</td>
                    <td style="border-bottom: 1px solid #000; padding: 2mm 0; text-align: center; white-space: nowrap;">${data.vatPercentage}%</td>
                    <td style="border-bottom: 1px solid #000; padding: 2mm 0; text-align: right; white-space: nowrap;">${service.unitPrice} EUR</td>
                  </tr>
                `).join('')
              : ''}
            </tbody>
          </table>

          <div style="display: grid; grid-template-columns: 1fr auto; margin-top: 10mm;">
            <div>Totale</div>
            <div style="text-align: right;">${data.total} EUR</div>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="margin-top: 20mm;">
        <h2 style="margin: 0 0 2mm 0; font-size: 12px; font-weight: 500;">Informazioni per il pagamento</h2>
        <div style="display: grid; grid-template-columns: 38mm 1fr; column-gap: 6mm; margin-bottom: 12mm;">
          <div>Scadenze</div><div style="white-space: pre-line;">${isImmediate ? 'Immediato' : data.dueDate}: ${data.total} EUR</div>
          <div>Beneficiario</div><div style="white-space: pre-line;">${paymentBeneficiary}</div>
          <div>IBAN</div><div style="white-space: pre-line;">${paymentIban}</div>
          <div>Banca</div><div style="white-space: pre-line;">${paymentBank}</div>
          ${paymentBic ? `<div>BIC</div><div style="white-space: pre-line;">${paymentBic}</div>` : ''}
          ${paymentSdi ? `<div>SDI</div><div style="white-space: pre-line;">${paymentSdi}</div>` : ''}
        </div>

        <h2 style="margin: 0 0 2mm 0; font-size: 12px; font-weight: 500;">Annotazioni</h2>
        <p style="margin: 0; width: 50%; font-size: 9px;">
          ${data.fiscalNotes ? data.fiscalNotes : `${data.isVatZero ? 'IVA 0% - Operazione non soggetta a IVA ai sensi della legge 190/2014.<br><br>' : ''}Questo documento non costituisce fattura fiscale, che sarà emessa al pagamento.`}
        </p>
      </div>
    </div>
  `
}
