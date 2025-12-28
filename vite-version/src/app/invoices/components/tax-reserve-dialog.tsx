import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { invoicesAPI, type Invoice } from "@/lib/invoices-api"
import { Loader2, Landmark } from "lucide-react"
import { AlertDialogCustom } from "@/components/ui/alert-dialog-custom"

interface TaxReserveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  invoice: Invoice | null
}

export function TaxReserveDialog({
  open,
  onOpenChange,
  onSuccess,
  invoice
}: TaxReserveDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [taxPercentage, setTaxPercentage] = useState(28)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Calculate tax amount
  const taxAmount = invoice ? (invoice.total * (taxPercentage / 100)) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!invoice) return

    try {
      setIsSubmitting(true)

      const response = await invoicesAPI.reserveTaxes(invoice.id, taxPercentage)

      if (response.success) {
        setSuccessMessage(response.message)
        setSuccessDialogOpen(true)
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (error: any) {
      console.error('Failed to reserve taxes:', error)
      setErrorMessage(error.message || 'Errore durante l\'accantonamento delle tasse.')
      setErrorDialogOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!invoice) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-orange-600" />
              Accantona Tasse
            </DialogTitle>
            <DialogDescription>
              Calcola e accantona le tasse per la fattura {invoice.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Invoice Info */}
              <div className="bg-muted p-4 rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fattura:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{invoice.clientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Importo totale:</span>
                  <span className="font-semibold">
                    € {invoice.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Tax Percentage */}
              <div className="space-y-2">
                <Label htmlFor="taxPercentage">
                  Percentuale Tasse (%)
                </Label>
                <Input
                  id="taxPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Il regime forfettario prevede circa il 28% di tasse (15% imposte + ~26% INPS sul reddito imponibile del 78%)
                </p>
              </div>

              {/* Calculated Tax Amount */}
              <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-900 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Importo da accantonare:
                  </span>
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    € {taxAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 rounded-md">
                <p className="text-xs text-amber-900 dark:text-amber-100">
                  Verrà creata automaticamente una transazione di uscita con categoria "Tasse e Imposte" per € {taxAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accantona Tasse
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <AlertDialogCustom
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        title="Successo"
        description={successMessage}
        confirmText="OK"
        cancelText=""
        onConfirm={() => setSuccessDialogOpen(false)}
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
    </>
  )
}
