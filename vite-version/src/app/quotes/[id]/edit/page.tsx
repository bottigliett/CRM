import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { quotesAPI } from '@/lib/quotes-api'
import type { Quote } from '@/lib/quotes-api'
import { toast } from 'sonner'
import { Loader2, Save, ArrowLeft } from 'lucide-react'

export default function EditQuotePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [quote, setQuote] = useState<Quote | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'DRAFT',
    validUntil: '',
    enablePaymentPlans: true,
    oneTimeDiscount: 0,
    payment2Discount: 0,
    payment3Discount: 0,
    payment4Discount: 0,
  })

  useEffect(() => {
    if (id) {
      loadQuote(parseInt(id))
    }
  }, [id])

  const loadQuote = async (quoteId: number) => {
    try {
      setLoading(true)
      const response = await quotesAPI.getById(quoteId)
      if (response.success && response.data) {
        setQuote(response.data)
        setFormData({
          title: response.data.title,
          description: response.data.description || '',
          status: response.data.status,
          validUntil: response.data.validUntil.split('T')[0], // Format for input date
          enablePaymentPlans: response.data.enablePaymentPlans !== undefined ? response.data.enablePaymentPlans : true,
          oneTimeDiscount: response.data.oneTimeDiscount,
          payment2Discount: response.data.payment2Discount,
          payment3Discount: response.data.payment3Discount,
          payment4Discount: response.data.payment4Discount,
        })
      }
    } catch (error) {
      console.error('Failed to load quote:', error)
      toast.error('Errore nel caricamento del preventivo')
      navigate('/quotes')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !quote) return

    try {
      setSubmitting(true)
      await quotesAPI.update(parseInt(id), {
        title: formData.title,
        description: formData.description,
        status: formData.status as any,
        validUntil: new Date(formData.validUntil).toISOString(),
        enablePaymentPlans: formData.enablePaymentPlans,
        oneTimeDiscount: formData.oneTimeDiscount,
        payment2Discount: formData.payment2Discount,
        payment3Discount: formData.payment3Discount,
        payment4Discount: formData.payment4Discount,
      })
      toast.success('Preventivo aggiornato con successo')
      navigate('/quotes')
    } catch (error) {
      console.error('Failed to update quote:', error)
      toast.error('Errore nell\'aggiornamento del preventivo')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <BaseLayout title="Modifica Preventivo" description="Caricamento...">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </BaseLayout>
    )
  }

  if (!quote) {
    return (
      <BaseLayout title="Modifica Preventivo" description="Preventivo non trovato">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Preventivo non trovato</p>
          </CardContent>
        </Card>
      </BaseLayout>
    )
  }

  return (
    <BaseLayout
      title="Modifica Preventivo"
      description={`Modifica preventivo ${quote.quoteNumber}`}
      headerAction={
        <Button variant="outline" onClick={() => navigate('/quotes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alla lista
        </Button>
      }
    >
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Generali</CardTitle>
            <CardDescription>
              Modifica i campi principali del preventivo. Per modificare pacchetti e voci, crea un nuovo preventivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quoteNumber">Numero Preventivo</Label>
                <Input
                  id="quoteNumber"
                  value={quote.quoteNumber}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Cliente</Label>
                <Input
                  id="contact"
                  value={quote.contact.name}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Stato</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Bozza</SelectItem>
                    <SelectItem value="SENT">Inviato</SelectItem>
                    <SelectItem value="ACCEPTED">Accettato</SelectItem>
                    <SelectItem value="REJECTED">Rifiutato</SelectItem>
                    <SelectItem value="EXPIRED">Scaduto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil">Valido fino a</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="enablePaymentPlans">Abilita pagamenti rateali</Label>
                <p className="text-sm text-muted-foreground">
                  Consenti al cliente di scegliere pagamenti a rate
                </p>
              </div>
              <Switch
                id="enablePaymentPlans"
                checked={formData.enablePaymentPlans}
                onCheckedChange={(checked) => setFormData({ ...formData, enablePaymentPlans: checked })}
              />
            </div>

            {formData.enablePaymentPlans && (
              <div className="space-y-4">
                <Label>Sconti Modalità di Pagamento (%)</Label>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="oneTimeDiscount" className="text-sm">Pagamento Unico</Label>
                  <Input
                    id="oneTimeDiscount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.oneTimeDiscount}
                    onChange={(e) => setFormData({ ...formData, oneTimeDiscount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment2Discount" className="text-sm">2 Rate</Label>
                  <Input
                    id="payment2Discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.payment2Discount}
                    onChange={(e) => setFormData({ ...formData, payment2Discount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment3Discount" className="text-sm">3 Rate</Label>
                  <Input
                    id="payment3Discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.payment3Discount}
                    onChange={(e) => setFormData({ ...formData, payment3Discount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment4Discount" className="text-sm">4 Rate</Label>
                  <Input
                    id="payment4Discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.payment4Discount}
                    onChange={(e) => setFormData({ ...formData, payment4Discount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/quotes')}
                disabled={submitting}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salva Modifiche
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </BaseLayout>
  )
}
