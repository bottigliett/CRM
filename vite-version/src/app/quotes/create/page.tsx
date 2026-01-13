"use client"

import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Calculator,
  Check,
  Euro,
  Calendar,
  FileText,
  User,
  Loader2,
} from "lucide-react"
import { contactsAPI, type Contact } from "@/lib/contacts-api"
import { quotesAPI, type CreateQuoteData, type PricingGuide, type QuoteItem } from "@/lib/quotes-api"
import { toast } from "sonner"

type Step = 1 | 2 | 3 | 4

interface QuoteFormData {
  contactId: number
  title: string
  description: string
  validUntil: string
  items: QuoteItem[]
  discountAmount: number
  taxRate: number
  oneTimeDiscount: number
  payment2Discount: number
  payment3Discount: number
  payment4Discount: number
}

export default function CreateQuotePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pricingGuide, setPricingGuide] = useState<PricingGuide | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Get contactId from URL if present
  const urlContactId = searchParams.get('contactId')

  const [formData, setFormData] = useState<QuoteFormData>({
    contactId: urlContactId ? parseInt(urlContactId) : 0,
    title: '',
    description: '',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    discountAmount: 0,
    taxRate: 22,
    oneTimeDiscount: 5,
    payment2Discount: 3,
    payment3Discount: 2,
    payment4Discount: 0,
  })

  // Item being edited
  const [editingItem, setEditingItem] = useState<QuoteItem>({
    description: '',
    quantity: 1,
    unitPrice: 0,
    total: 0,
  })

  // Load data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [contactsRes, pricingRes] = await Promise.all([
        contactsAPI.getAll({ limit: 1000 }),
        quotesAPI.getPricingGuide(),
      ])
      setContacts(contactsRes.data.contacts)
      setPricingGuide(pricingRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const calculateTotals = () => {
    return quotesAPI.calculateTotals(formData.items, formData.discountAmount, formData.taxRate)
  }

  // Add item to quote
  const addItem = () => {
    if (!editingItem.description || editingItem.unitPrice <= 0) {
      toast.error('Inserisci descrizione e prezzo')
      return
    }

    const total = editingItem.quantity * editingItem.unitPrice
    const newItem = { ...editingItem, total }

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    })

    setEditingItem({
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    })
  }

  // Remove item
  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  // Use pricing from guide
  const usePricing = (category: string, item: string, price: number) => {
    const selectedContact = contacts.find(c => c.id === formData.contactId)
    setEditingItem({
      description: `${pricingGuide?.[category as keyof PricingGuide]?.[item]?.label || item}${selectedContact ? ` - ${selectedContact.name}` : ''}`,
      quantity: 1,
      unitPrice: price,
      total: price,
    })
  }

  // Validate step
  const canProceed = (step: Step): boolean => {
    switch (step) {
      case 1:
        return formData.contactId > 0 && formData.title.length > 0 && formData.validUntil.length > 0
      case 2:
        return formData.items.length > 0
      case 3:
        return true
      case 4:
        return true
      default:
        return false
    }
  }

  // Submit quote
  const handleSubmit = async () => {
    if (!canProceed(4)) {
      toast.error('Completa tutti i campi obbligatori')
      return
    }

    try {
      setSubmitting(true)
      const data: CreateQuoteData = {
        contactId: formData.contactId,
        title: formData.title,
        description: formData.description,
        validUntil: formData.validUntil,
        discountAmount: formData.discountAmount,
        taxRate: formData.taxRate,
        oneTimeDiscount: formData.oneTimeDiscount,
        payment2Discount: formData.payment2Discount,
        payment3Discount: formData.payment3Discount,
        payment4Discount: formData.payment4Discount,
        items: formData.items,
      }

      const response = await quotesAPI.create(data)
      toast.success('Preventivo creato con successo!')
      navigate('/quotes')
    } catch (error: any) {
      console.error('Error creating quote:', error)
      toast.error(error.response?.data?.message || 'Errore nella creazione del preventivo')
    } finally {
      setSubmitting(false)
    }
  }

  const totals = calculateTotals()

  if (loading) {
    return (
      <BaseLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </BaseLayout>
    )
  }

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Nuovo Preventivo</h1>
              <p className="text-muted-foreground">
                Crea un preventivo professionale con il wizard guidato
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                        currentStep === step
                          ? 'border-primary bg-primary text-primary-foreground'
                          : currentStep > step
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted bg-muted text-muted-foreground'
                      }`}
                    >
                      {currentStep > step ? <Check className="h-5 w-5" /> : step}
                    </div>
                    <span className="text-sm font-medium">
                      {step === 1 && 'Info Base'}
                      {step === 2 && 'Voci Preventivo'}
                      {step === 3 && 'Sconti'}
                      {step === 4 && 'Riepilogo'}
                    </span>
                  </div>
                  {step < 4 && (
                    <div className="h-0.5 flex-1 bg-muted mx-4">
                      <div
                        className={`h-full ${currentStep > step ? 'bg-primary' : 'bg-muted'}`}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Base</CardTitle>
              <CardDescription>
                Seleziona il cliente e inserisci le informazioni principali del preventivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="contact">Cliente *</Label>
                <Select
                  value={formData.contactId.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, contactId: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {contact.name}
                          {contact.email && (
                            <span className="text-muted-foreground text-sm">
                              ({contact.email})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Titolo Preventivo *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="es. Sviluppo Sito Web E-commerce"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione dettagliata del preventivo..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil">Valido Fino Al *</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Items + Pricing Helper */}
        {currentStep === 2 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pricing Helper */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Helper Tariffario
                </CardTitle>
                <CardDescription>
                  Clicca su un prezzo per aggiungerlo al preventivo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pricingGuide && Object.entries(pricingGuide).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="font-semibold text-sm uppercase text-muted-foreground">
                      {category.replace(/_/g, ' ')}
                    </h3>
                    <div className="space-y-1">
                      {Object.entries(items).map(([key, item]) => (
                        <button
                          key={key}
                          onClick={() => usePricing(category, key, item.min)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <span className="text-sm">{item.label}</span>
                          <Badge variant="outline">
                            da {item.min}€ a {item.max}€
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Items Editor */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aggiungi Voce</CardTitle>
                  <CardDescription>
                    Inserisci i dettagli della voce di preventivo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemDesc">Descrizione *</Label>
                    <Input
                      id="itemDesc"
                      value={editingItem.description}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, description: e.target.value })
                      }
                      placeholder="es. Sviluppo Homepage"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantità</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        step="0.01"
                        value={editingItem.quantity}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            quantity: parseFloat(e.target.value) || 1,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unitPrice">Prezzo Unitario (€) *</Label>
                      <Input
                        id="unitPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingItem.unitPrice}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            unitPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  <Button onClick={addItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi Voce
                  </Button>
                </CardContent>
              </Card>

              {/* Items List */}
              <Card>
                <CardHeader>
                  <CardTitle>Voci Preventivo ({formData.items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {formData.items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nessuna voce aggiunta</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrizione</TableHead>
                          <TableHead className="text-right">Q.tà</TableHead>
                          <TableHead className="text-right">Prezzo</TableHead>
                          <TableHead className="text-right">Totale</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{item.unitPrice.toFixed(2)}€</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.total.toFixed(2)}€
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: Discounts */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Sconti e Tasse</CardTitle>
              <CardDescription>
                Configura gli sconti per le diverse modalità di pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="discountAmount">Sconto Base (€)</Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discountAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || 0 })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 22 })
                    }
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Sconti Modalità Pagamento (%)</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="oneTime">Pagamento Unico</Label>
                    <Input
                      id="oneTime"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.oneTimeDiscount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          oneTimeDiscount: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment2">2 Rate</Label>
                    <Input
                      id="payment2"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.payment2Discount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payment2Discount: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment3">3 Rate</Label>
                    <Input
                      id="payment3"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.payment3Discount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payment3Discount: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment4">4 Rate</Label>
                    <Input
                      id="payment4"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.payment4Discount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          payment4Discount: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Summary */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Riepilogo Preventivo</CardTitle>
              <CardDescription>
                Verifica tutti i dati prima di creare il preventivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Info */}
              <div>
                <h3 className="font-semibold mb-2">Cliente</h3>
                <p className="text-muted-foreground">
                  {contacts.find((c) => c.id === formData.contactId)?.name}
                </p>
              </div>

              <Separator />

              {/* Quote Info */}
              <div>
                <h3 className="font-semibold mb-2">Informazioni Preventivo</h3>
                <dl className="space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Titolo:</dt>
                    <dd className="font-medium">{formData.title}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Valido fino al:</dt>
                    <dd className="font-medium">
                      {new Date(formData.validUntil).toLocaleDateString('it-IT')}
                    </dd>
                  </div>
                </dl>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-2">Voci ({formData.items.length})</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrizione</TableHead>
                      <TableHead className="text-right">Q.tà</TableHead>
                      <TableHead className="text-right">Prezzo</TableHead>
                      <TableHead className="text-right">Totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.unitPrice.toFixed(2)}€</TableCell>
                        <TableCell className="text-right">{item.total.toFixed(2)}€</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span>Subtotale:</span>
                  <span className="font-medium">{totals.subtotal.toFixed(2)}€</span>
                </div>
                {formData.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Sconto:</span>
                    <span>-{formData.discountAmount.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>IVA ({formData.taxRate}%):</span>
                  <span>+{totals.taxAmount.toFixed(2)}€</span>
                </div>
                <Separator />
                <div className="flex justify-between text-2xl font-bold">
                  <span>TOTALE:</span>
                  <span className="text-primary">{totals.total.toFixed(2)}€</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1) as Step)}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep((s) => Math.min(4, s + 1) as Step)}
              disabled={!canProceed(currentStep)}
            >
              Avanti
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crea Preventivo
            </Button>
          )}
        </div>
      </div>
    </BaseLayout>
  )
}
