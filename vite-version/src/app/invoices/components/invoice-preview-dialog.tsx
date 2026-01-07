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
  return `
    <div style="padding: 2em; font-family: 'Elza', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; position: relative; min-height: 297mm;">
      <!--HEADER-->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2em;">
        <div style="width: 180px;">
          <svg width="180" height="auto" viewBox="0 0 1408 373" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_1_11)">
              <path d="M198.262 186.743C185.744 231.795 176.217 283.383 176.217 283.383H175.244C175.244 283.383 165.23 231.795 152.712 186.743L102.156 7.02199H0V364.935H66.6204V159.698C66.6204 130.637 63.6302 85.5849 63.6302 85.5849H64.6037C64.6037 85.5849 72.601 127.647 80.1114 153.65L140.195 364.935H209.806L271.419 153.65C278.93 127.647 286.927 85.5849 286.927 85.5849H287.9C287.9 85.5849 284.91 130.637 284.91 159.698V364.935H352.504V7.02199H248.818L198.262 186.743Z" fill="black"/>
              <path d="M1235.75 0C1175.87 0 1128.38 25.5851 1098.47 67.2304L1110.09 7.02199H1006.96L920.864 192.722C900.35 237.288 884.286 285.329 884.286 285.329H883.799C883.799 285.329 883.312 233.742 879.279 183.684L865.788 6.95247H766.135L721.837 236.384C710.502 178.887 655.843 163.383 590.405 149.13C537.345 137.589 512.31 129.107 512.31 100.046C512.31 74.5305 537.831 57.9836 576.914 57.9836C615.996 57.9836 642.004 75.9905 646.037 112.074H715.648C710.015 40.0462 657.929 0.486673 577.331 0.486673C496.733 0.486673 440.126 37.0567 440.126 107.624C440.126 182.224 498.68 199.258 562.797 213.788C617.387 226.303 651.462 233.325 651.462 268.365C651.462 301.39 618.916 314.391 581.851 314.391C530.808 314.391 506.26 297.357 501.253 254.321H435.675V7.02199H363.074V364.935H435.675V288.527C451.879 342.687 503.617 372.93 584.911 372.93C638.318 372.93 681.921 355.063 705.356 321.969L697.081 364.935H762.658L802.227 159.698C807.721 130.637 813.771 84.6115 813.771 84.6115H814.744C814.744 84.6115 815.231 127.161 817.248 153.719L834.285 365.005H902.366L1000.98 153.232C1015.02 123.198 1030.53 84.6811 1030.53 84.6811H1031.5C1031.5 84.6811 1019.96 128.76 1013.98 159.768L974.411 365.005H1041.03L1067.04 230.405C1082.83 314.738 1145.06 373.069 1235.82 373.069C1341.45 373.069 1408.07 293.95 1408.07 186.813C1408.07 79.6753 1341.38 0 1235.75 0ZM1236.23 313.417C1170.66 313.417 1137.07 257.867 1137.07 186.743C1137.07 115.62 1170.59 59.5827 1236.23 59.5827C1301.88 59.5827 1333.87 115.133 1333.87 186.743C1333.87 258.354 1301.81 313.417 1236.23 313.417Z" fill="black"/>
            </g>
            <defs>
              <clipPath id="clip0_1_11">
                <rect width="1408" height="373" fill="white"/>
              </clipPath>
            </defs>
          </svg>
        </div>
        <div style="display: flex; gap: 2em;">
          <div style="font-size: 12px; text-transform: uppercase; line-height: 1.4;">
            <p>MISMO | STUDIO GRAFICO & CREATIVO<br>DI STEFANO COSTATO E DAVIDE MARANGONI</p>
            <p>VIA DELL'ARTIGIANATO 23<br>37135 VERONA - IT</p>
          </div>
          <div style="font-size: 12px; text-transform: uppercase; line-height: 1.4;">
            <p>HI@MISMO.STUDIO<br>(+39) 375 620 9885</p>
            <p>PI (S) IT04904900232<br>PI (D) IT05052740239</p>
          </div>
        </div>
      </div>

      <!--META INFO-->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: -1em;">
        <h1 style="font-size: 48px; text-transform: uppercase; font-weight: 500; margin: 0;">Fattura</h1>
        <h2 style="font-size: 48px; text-transform: uppercase; font-weight: 500; margin: 0;">${data.invoiceNumber}</h2>
      </div>
      <h2 style="font-size: 48px; text-transform: uppercase; font-weight: 500; margin-bottom: 0.5em; text-align-last: justify;">${data.invoiceDate}</h2>

      <!--DESTINATARIO-->
      <div style="margin-bottom: 2em;">
        <div style="display: flex; gap: 2em; font-size: 14px; font-weight: 400; text-transform: uppercase; line-height: 1.4;">
          <div style="flex: 1;">
            <h3 style="font-size: 12px; font-weight: 500;">${data.clientName}</h3>
          </div>
          ${data.clientAddress ? `
          <div style="flex: 1;">
            <h3 style="font-size: 12px; font-weight: 500;">${data.clientAddress}</h3>
          </div>
          ` : ''}
          ${data.clientPIva ? `
          <div style="flex: 1;">
            <h3 style="font-size: 12px; font-weight: 500;">P.IVA ${data.clientPIva}</h3>
          </div>
          ` : ''}
        </div>
      </div>

      <!--OGGETTO-->
      <div style="margin-bottom: 0.75em;">
        <div style="font-size: 16px; font-weight: 500; text-transform: uppercase; margin-bottom: 1em;">Oggetto: ${data.subject}</div>
        <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 0.5em 0;"></div>
      </div>

      <!--SERVIZI-->
      <div style="width: 100%; margin-bottom: 1em;">
        ${data.services && data.services.length > 0 ?
          data.services.map((service: any) => `
            <div style="display: flex; align-items: center; font-size: 14px; font-weight: 400; text-transform: uppercase; padding: 0.5em 0;">
              <div style="flex: 6;">${service.description}</div>
              <div style="flex: 1; text-align: center;">${service.quantity}</div>
              <div style="flex: 2; text-align: right;">${service.unitPrice ? service.unitPrice + ' EUR' : ''}</div>
              <div style="flex: 1.5; text-align: right;">IVA 0%</div>
            </div>
          `).join('')
        : `
          <div style="display: flex; align-items: center; font-size: 14px; font-weight: 400; text-transform: uppercase; padding: 0.5em 0;">
            <div style="flex: 6;">${data.description}</div>
            <div style="flex: 1; text-align: center;">${data.quantity}</div>
            <div style="flex: 2; text-align: right;">${data.unitPrice ? data.unitPrice + ' EUR' : ''}</div>
            <div style="flex: 1.5; text-align: right;">IVA ${data.vatPercentage}%</div>
          </div>
        `}
        <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 0.5em 0;"></div>
      </div>

      <!--TOTALI-->
      <div style="display: grid; grid-template-columns: 1fr auto; width: 100%; margin-top: 20px;">
        <div style="text-align: left; font-size: 24px; font-weight: 500; text-transform: uppercase;">
          <div>Subtotale</div>
          <div>IVA</div>
          <div style="padding-top: 1.5em;">Totale da pagare</div>
        </div>
        <div style="text-align: right; font-size: 24px; font-weight: 500; text-transform: uppercase;">
          <div>${data.subtotal} EUR</div>
          <div>${data.vatAmount} EUR</div>
          <div style="padding-top: 1.5em;">${data.total} EUR</div>
        </div>
      </div>

      <!--INFORMAZIONI PAGAMENTO-->
      <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; margin: 0.5em 0;"></div>
      <div style="margin-bottom: 3em;">
        <h3 style="font-size: 36px; font-weight: 500; text-transform: uppercase; margin-bottom: 0.15em;">Informazioni sul pagamento</h3>
        <div>
          <span style="font-size: 14px; font-weight: 500; text-transform: uppercase; width: 120px; display: inline-block;">[Scadenze]</span><span style="font-size: 14px; font-weight: 400; text-transform: uppercase;">${data.dueDate}:</span>&nbsp;<span style="font-size: 14px; font-weight: 400; text-transform: uppercase;">${data.total} EUR</span><br>
          <span style="font-size: 14px; font-weight: 500; text-transform: uppercase; width: 120px; display: inline-block;">[Banca]</span><span style="font-size: 14px; font-weight: 400; text-transform: uppercase;">REVOLUT BANK UAB</span><br>
          <span style="font-size: 14px; font-weight: 500; text-transform: uppercase; width: 120px; display: inline-block;">[IBAN]</span><span style="font-size: 14px; font-weight: 400; text-transform: uppercase;">LT95 3250 0482 6617 5203</span><br>
          <span style="font-size: 14px; font-weight: 500; text-transform: uppercase; width: 120px; display: inline-block;">[Beneficiario]</span><span style="font-size: 14px; font-weight: 400; text-transform: uppercase;">STEFANO COSTATO E DAVIDE MARANGONI</span><br>
          <span style="font-size: 14px; font-weight: 500; text-transform: uppercase; width: 120px; display: inline-block;">[BIC/Swift]</span><span style="font-size: 14px; font-weight: 400; text-transform: uppercase;">REVOLT21</span><br>
          <span style="font-size: 14px; font-weight: 500; text-transform: uppercase; width: 120px; display: inline-block;">[TAX ID]</span><span style="font-size: 14px; font-weight: 400; text-transform: uppercase;">JI3TXCE</span>
        </div>
      </div>

      <!--DISCLAIMER-->
      <div style="position: absolute; bottom: 2em; left: 2em; right: 2em;">
        <h4 style="font-size: 12px; font-weight: 500; text-transform: uppercase;">Note importanti</h4>
        ${data.fiscalNotes ? `
        <p style="font-size: 11px; font-weight: 400; text-transform: uppercase; line-height: 1.4;">${data.fiscalNotes}</p>
        ` : `
        <p style="font-size: 11px; font-weight: 400; text-transform: uppercase; line-height: 1.4;">QUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.</p>
        ${data.isVatZero ? `
        <p style="font-size: 11px; font-weight: 400; text-transform: uppercase; line-height: 1.4;">IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL'ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.</p>
        ` : ''}
        `}
      </div>
    </div>
  `
}
