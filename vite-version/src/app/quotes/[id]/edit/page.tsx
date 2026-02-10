import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import type { Quote, QuoteObjective, QuotePackage } from '@/lib/quotes-api'
import { toast } from 'sonner'
import { Loader2, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'

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
    objectives: [] as QuoteObjective[],
    packages: [] as QuotePackage[],
    enablePaymentPlans: true,
    oneTimeDiscount: 0,
    payment2Discount: 0,
    payment3Discount: 0,
    payment4Discount: 0,
    projectDurationDays: null as number | null,
    discountAmount: 0,
    taxRate: 22,
  })

  const [editingObjective, setEditingObjective] = useState({ title: '', description: '' })
  const [editingPackage, setEditingPackage] = useState({
    name: '',
    description: '',
    features: [] as string[],
    price: 0,
    isRecommended: false,
  })
  const [currentFeature, setCurrentFeature] = useState('')

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

        // Ensure objectives and packages are always arrays
        const objectives = Array.isArray(response.data.objectives) ? response.data.objectives : []
        const packages = Array.isArray(response.data.packages) ? response.data.packages : []

        setFormData({
          title: response.data.title,
          description: response.data.description || '',
          status: response.data.status,
          validUntil: response.data.validUntil.split('T')[0], // Format for input date
          objectives,
          packages,
          enablePaymentPlans: response.data.enablePaymentPlans !== undefined ? response.data.enablePaymentPlans : true,
          oneTimeDiscount: response.data.oneTimeDiscount || 0,
          payment2Discount: response.data.payment2Discount || 0,
          payment3Discount: response.data.payment3Discount || 0,
          payment4Discount: response.data.payment4Discount || 0,
          projectDurationDays: response.data.projectDurationDays || null,
          discountAmount: response.data.discountAmount || 0,
          taxRate: response.data.taxRate ?? 0,
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

  // Objective management
  const addObjective = () => {
    if (!editingObjective.title) {
      toast.error('Inserisci un titolo per l\'obiettivo')
      return
    }

    if (formData.objectives.length >= 3) {
      toast.error('Puoi aggiungere massimo 3 obiettivi')
      return
    }

    setFormData({
      ...formData,
      objectives: [...formData.objectives, { ...editingObjective }],
    })

    setEditingObjective({ title: '', description: '' })
    toast.success('Obiettivo aggiunto')
  }

  const removeObjective = (index: number) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((_, i) => i !== index),
    })
    toast.success('Obiettivo rimosso')
  }

  // Package management
  const addFeature = () => {
    if (currentFeature.trim()) {
      setEditingPackage({
        ...editingPackage,
        features: [...editingPackage.features, currentFeature.trim()],
      })
      setCurrentFeature('')
    }
  }

  const removeFeature = (index: number) => {
    setEditingPackage({
      ...editingPackage,
      features: editingPackage.features.filter((_, i) => i !== index),
    })
  }

  const addPackage = () => {
    if (!editingPackage.name) {
      toast.error('Inserisci un nome per il pacchetto')
      return
    }

    if (editingPackage.price <= 0) {
      toast.error('Inserisci un prezzo valido')
      return
    }

    setFormData({
      ...formData,
      packages: [...formData.packages, { ...editingPackage }],
    })

    setEditingPackage({
      name: '',
      description: '',
      features: [],
      price: 0,
      isRecommended: false,
    })
    toast.success('Pacchetto aggiunto')
  }

  const removePackage = (index: number) => {
    setFormData({
      ...formData,
      packages: formData.packages.filter((_, i) => i !== index),
    })
    toast.success('Pacchetto rimosso')
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
        objectives: formData.objectives,
        packages: formData.packages,
        enablePaymentPlans: formData.enablePaymentPlans,
        oneTimeDiscount: formData.oneTimeDiscount,
        payment2Discount: formData.payment2Discount,
        payment3Discount: formData.payment3Discount,
        payment4Discount: formData.payment4Discount,
        projectDurationDays: formData.projectDurationDays || undefined,
        discountAmount: formData.discountAmount,
        taxRate: formData.taxRate,
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
            <CardTitle>Modifica Preventivo</CardTitle>
            <CardDescription>
              Modifica tutte le informazioni del preventivo, inclusi obiettivi e pacchetti.
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

            {/* Objectives Section */}
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <Label className="text-base font-semibold">Obiettivi del Progetto</Label>
                <p className="text-sm text-muted-foreground">Aggiungi fino a 3 obiettivi principali</p>
              </div>

              {formData.objectives.length > 0 && (
                <div className="space-y-2">
                  {formData.objectives.map((obj, index) => (
                    <div key={index} className="flex items-start gap-2 rounded-lg border p-3">
                      <div className="flex-1">
                        <p className="font-medium">{obj.title}</p>
                        {obj.description && (
                          <p className="text-sm text-muted-foreground">{obj.description}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeObjective(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {formData.objectives.length < 3 && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="objTitle">Titolo Obiettivo</Label>
                    <Input
                      id="objTitle"
                      value={editingObjective.title}
                      onChange={(e) => setEditingObjective({ ...editingObjective, title: e.target.value })}
                      placeholder="es. Aumentare il traffico organico"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="objDesc">Descrizione (opzionale)</Label>
                    <Textarea
                      id="objDesc"
                      value={editingObjective.description}
                      onChange={(e) => setEditingObjective({ ...editingObjective, description: e.target.value })}
                      placeholder="Dettagli sull'obiettivo..."
                      rows={2}
                    />
                  </div>
                  <Button type="button" onClick={addObjective} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi Obiettivo
                  </Button>
                </div>
              )}
            </div>

            {/* Packages Section */}
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <Label className="text-base font-semibold">Pacchetti</Label>
                <p className="text-sm text-muted-foreground">Crea i pacchetti offerti al cliente</p>
              </div>

              {formData.packages.length > 0 && (
                <div className="space-y-2">
                  {formData.packages.map((pkg, index) => (
                    <div key={index} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{pkg.name}</p>
                            {pkg.isRecommended && (
                              <Badge variant="secondary">Consigliato</Badge>
                            )}
                          </div>
                          {pkg.description && (
                            <p className="text-sm text-muted-foreground mb-2">{pkg.description}</p>
                          )}
                          <p className="text-lg font-bold text-primary">€{pkg.price.toFixed(2)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePackage(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {pkg.features && pkg.features.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-1">Caratteristiche:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {(() => {
                              try {
                                const features = typeof pkg.features === 'string'
                                  ? JSON.parse(pkg.features)
                                  : pkg.features
                                return Array.isArray(features)
                                  ? features.map((feature: string, fIndex: number) => (
                                      <li key={fIndex}>• {feature}</li>
                                    ))
                                  : null
                              } catch (e) {
                                console.error('Error parsing features:', e)
                                return null
                              }
                            })()}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pkgName">Nome Pacchetto *</Label>
                    <Input
                      id="pkgName"
                      value={editingPackage.name}
                      onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                      placeholder="es. Pacchetto Base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pkgPrice">Prezzo (€) *</Label>
                    <Input
                      id="pkgPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPackage.price}
                      onChange={(e) => setEditingPackage({ ...editingPackage, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pkgDesc">Descrizione (opzionale)</Label>
                  <Textarea
                    id="pkgDesc"
                    value={editingPackage.description}
                    onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                    placeholder="Descrizione del pacchetto..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Caratteristiche Incluse</Label>
                  {editingPackage.features.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {editingPackage.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="flex-1">• {feature}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFeature(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={currentFeature}
                      onChange={(e) => setCurrentFeature(e.target.value)}
                      placeholder="Aggiungi una caratteristica..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addFeature()
                        }
                      }}
                    />
                    <Button type="button" onClick={addFeature} variant="outline" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="pkgRecommended"
                    checked={editingPackage.isRecommended}
                    onCheckedChange={(checked) => setEditingPackage({ ...editingPackage, isRecommended: checked })}
                  />
                  <Label htmlFor="pkgRecommended" className="cursor-pointer">
                    Contrassegna come consigliato
                  </Label>
                </div>

                <Button type="button" onClick={addPackage} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Pacchetto
                </Button>
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="projectDurationDays">Durata Progetto (giorni)</Label>
              <Input
                id="projectDurationDays"
                type="number"
                min="1"
                value={formData.projectDurationDays || ''}
                onChange={(e) => setFormData({ ...formData, projectDurationDays: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="es. 30"
              />
              <p className="text-xs text-muted-foreground">Durata stimata del progetto in giorni (opzionale)</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discountAmount">Sconto Base (€)</Label>
                <Input
                  id="discountAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discountAmount}
                  onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate">IVA (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="enablePaymentPlans">Abilita pagamenti rateali</Label>
                <p className="text-sm text-muted-foreground">
                  Consenti al cliente di scegliere pagamenti a rate con sconti personalizzati
                </p>
              </div>
              <Switch
                id="enablePaymentPlans"
                checked={formData.enablePaymentPlans}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  enablePaymentPlans: checked,
                  // Se disabilitato, azzera tutti gli sconti
                  oneTimeDiscount: checked ? formData.oneTimeDiscount : 0,
                  payment2Discount: checked ? formData.payment2Discount : 0,
                  payment3Discount: checked ? formData.payment3Discount : 0,
                  payment4Discount: checked ? formData.payment4Discount : 0,
                })}
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
