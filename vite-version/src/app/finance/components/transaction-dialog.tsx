import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  transactionsAPI,
  transactionCategoriesAPI,
  paymentMethodsAPI,
  type Transaction,
  type TransactionCategory,
  type PaymentMethod,
  type CreateTransactionData,
} from "@/lib/finance-api"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultType?: 'INCOME' | 'EXPENSE'
  transaction?: Transaction | null
}

export function TransactionDialog({ open, onOpenChange, onSuccess, defaultType = 'INCOME', transaction }: TransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  const [formData, setFormData] = useState<CreateTransactionData>({
    type: defaultType,
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    vendor: '',
    categoryId: undefined,
    paymentMethodId: undefined,
  })

  // Reset form when dialog opens with new type or load transaction data for editing
  useEffect(() => {
    if (open) {
      if (transaction) {
        // Edit mode - load transaction data
        setFormData({
          type: transaction.type,
          amount: transaction.amount,
          date: format(new Date(transaction.date), 'yyyy-MM-dd'),
          description: transaction.description || '',
          vendor: transaction.vendor || '',
          categoryId: transaction.categoryId || undefined,
          paymentMethodId: transaction.paymentMethodId || undefined,
        })
      } else {
        // Create mode - reset form
        setFormData({
          type: defaultType,
          amount: 0,
          date: format(new Date(), 'yyyy-MM-dd'),
          description: '',
          vendor: '',
          categoryId: undefined,
          paymentMethodId: undefined,
        })
      }
    }
  }, [open, defaultType, transaction])

  // Load categories and payment methods
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingData(true)
        const [categoriesRes, paymentMethodsRes] = await Promise.all([
          transactionCategoriesAPI.getCategories(),
          paymentMethodsAPI.getPaymentMethods(),
        ])

        if (categoriesRes.success) {
          setCategories(categoriesRes.data)
        }
        if (paymentMethodsRes.success) {
          setPaymentMethods(paymentMethodsRes.data)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }

    if (open) {
      loadData()
    }
  }, [open])

  const filteredCategories = categories.filter(cat => cat.type === formData.type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.description?.trim()) {
      toast.error("La descrizione è obbligatoria")
      return
    }

    try {
      setIsSubmitting(true)

      if (transaction) {
        // Update existing transaction
        const response = await transactionsAPI.updateTransaction(transaction.id, formData)
        if (response.success) {
          toast.success("Transazione aggiornata con successo")
          onSuccess?.()
          onOpenChange(false)
        }
      } else {
        // Create new transaction
        const response = await transactionsAPI.createTransaction(formData)
        if (response.success) {
          toast.success("Transazione creata con successo")
          onSuccess?.()
          onOpenChange(false)
          // Reset form
          setFormData({
            type: 'INCOME',
            amount: 0,
            date: format(new Date(), 'yyyy-MM-dd'),
            description: '',
            vendor: '',
            categoryId: undefined,
            paymentMethodId: undefined,
          })
        }
      }
    } catch (error) {
      console.error('Failed to save transaction:', error)
      toast.error(transaction ? "Errore nell'aggiornamento della transazione" : "Errore nella creazione della transazione")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Modifica Transazione' : 'Nuova Transazione'}</DialogTitle>
          <DialogDescription>
            {transaction ? 'Modifica i dettagli della transazione' : 'Inserisci i dettagli della transazione'}
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Type */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Tipo
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'INCOME' | 'EXPENSE') => {
                    setFormData({ ...formData, type: value, categoryId: undefined })
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Entrata</SelectItem>
                    <SelectItem value="EXPENSE">Uscita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Importo *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="col-span-3"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              {/* Date */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Data *
                </Label>
                <Input
                  id="date"
                  type="date"
                  required
                  className="col-span-3"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Categoria
                </Label>
                <Select
                  value={formData.categoryId?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentMethod" className="text-right">
                  Metodo
                </Label>
                <Select
                  value={formData.paymentMethodId?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethodId: parseInt(value) })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleziona metodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id.toString()}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor - Only for EXPENSE */}
              {formData.type === 'EXPENSE' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="vendor" className="text-right">
                    Fornitore
                  </Label>
                  <Input
                    id="vendor"
                    type="text"
                    className="col-span-3"
                    placeholder="Nome del fornitore"
                    value={formData.vendor || ''}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  />
                </div>
              )}

              {/* Description */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Descrizione *
                </Label>
                <Textarea
                  id="description"
                  className="col-span-3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                  placeholder="Inserisci una descrizione..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {transaction ? 'Aggiorna Transazione' : 'Crea Transazione'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
