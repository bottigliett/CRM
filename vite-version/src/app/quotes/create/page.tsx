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
import { Switch } from "@/components/ui/switch"
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
import { quotesAPI, type CreateQuoteData, type PricingGuide, type QuoteItem, type QuoteObjective } from "@/lib/quotes-api"
import { toast } from "sonner"

type Step = 1 | 2 | 3 | 4 | 5 | 6

interface QuotePackageForm {
  name: string
  description: string
  features: string[]
  price: number
  isRecommended: boolean
}

interface QuoteFormData {
  contactId: number
  title: string
  description: string
  objectives: QuoteObjective[]
  packages: QuotePackageForm[]
  validUntil: string
  items: QuoteItem[]
  discountAmount: number
  taxRate: number
  enablePaymentPlans: boolean
  oneTimeDiscount: number
  payment2Discount: number
  payment3Discount: number
  payment4Discount: number
  enableTemporaryAccess: boolean
  temporaryPassword: string
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
    objectives: [],
    packages: [],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    discountAmount: 0,
    taxRate: 0,
    enablePaymentPlans: true,
    oneTimeDiscount: 5,
    payment2Discount: 3,
    payment3Discount: 2,
    payment4Discount: 0,
    enableTemporaryAccess: false,
    temporaryPassword: '',
  })

  // Objective being edited
  const [editingObjective, setEditingObjective] = useState<QuoteObjective>({
    title: '',
    description: '',
  })

  // Package being edited
  const [editingPackage, setEditingPackage] = useState<QuotePackageForm>({
    name: '',
    description: '',
    features: [],
    price: 0,
    isRecommended: false,
  })

  // Feature being added to package
  const [newFeature, setNewFeature] = useState('')

  // Item being edited
  const [editingItem, setEditingItem] = useState<QuoteItem>({
    itemName: '',
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
    if (!editingItem.itemName || !editingItem.description || editingItem.unitPrice <= 0) {
      toast.error('Inserisci nome, descrizione e prezzo')
      return
    }

    const total = editingItem.quantity * editingItem.unitPrice
    const newItem = { ...editingItem, total }

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    })

    setEditingItem({
      itemName: '',
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

  // Add objective
  const addObjective = () => {
    if (!editingObjective.title || !editingObjective.description) {
      toast.error('Inserisci titolo e descrizione obiettivo')
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
  }

  // Remove objective
  const removeObjective = (index: number) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((_, i) => i !== index),
    })
  }

  // Add feature to editing package
  const addFeatureToPackage = () => {
    if (!newFeature.trim()) {
      toast.error('Inserisci una caratteristica')
      return
    }

    setEditingPackage({
      ...editingPackage,
      features: [...editingPackage.features, newFeature.trim()],
    })
    setNewFeature('')
  }

  // Remove feature from editing package
  const removeFeatureFromPackage = (index: number) => {
    setEditingPackage({
      ...editingPackage,
      features: editingPackage.features.filter((_, i) => i !== index),
    })
  }

  // Add package
  const addPackage = () => {
    if (!editingPackage.name || !editingPackage.description || editingPackage.price <= 0) {
      toast.error('Inserisci nome, descrizione e prezzo del pacchetto')
      return
    }

    if (editingPackage.features.length === 0) {
      toast.error('Aggiungi almeno una caratteristica al pacchetto')
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
  }

  // Remove package
  const removePackage = (index: number) => {
    setFormData({
      ...formData,
      packages: formData.packages.filter((_, i) => i !== index),
    })
  }

  // Use pricing from guide
  const usePricing = (category: string, item: string, price: number) => {
    const selectedContact = contacts.find(c => c.id === formData.contactId)
    const itemLabel = pricingGuide?.[category as keyof PricingGuide]?.[item]?.label || item
    setEditingItem({
      itemName: itemLabel,
      description: `${itemLabel}${selectedContact ? ` - ${selectedContact.name}` : ''}`,
      quantity: 1,
      unitPrice: price,
      total: price,
    })
  }

  // Validate step
  const canProceed = (step: Step): boolean => {
    switch (step) {
      case 1:
        // Step 1: Basic info
        return formData.contactId > 0 && formData.title.length > 0 && formData.validUntil.length > 0
      case 2:
        // Step 2: Objectives (optional but recommended)
        return true
      case 3:
        // Step 3: Price Calculation (optional, helps define package range)
        return true
      case 4:
        // Step 4: Packages (optional)
        return true
      case 5:
        // Step 5: Discounts (always OK)
        return true
      case 6:
        // Step 6: Summary (always OK)
        return true
      default:
        return false
    }
  }

  // Submit quote
  const handleSubmit = async () => {
    if (!canProceed(6)) {
      toast.error('Completa tutti i campi obbligatori')
      return
    }

    // Validate: must have either packages or items
    if (formData.packages.length === 0 && formData.items.length === 0) {
      toast.error('Aggiungi almeno un pacchetto o una voce al preventivo')
      return
    }

    // Validate temporary access
    if (formData.enableTemporaryAccess && !formData.temporaryPassword.trim()) {
      toast.error('Imposta una password temporanea o disabilita l\'accesso momentaneo')
      return
    }

    try {
      setSubmitting(true)
      const data: CreateQuoteData = {
        contactId: formData.contactId,
        title: formData.title,
        description: formData.description,
        objectives: formData.objectives.length > 0 ? formData.objectives : undefined,
        validUntil: formData.validUntil,
        discountAmount: formData.discountAmount,
        taxRate: formData.taxRate,
        enablePaymentPlans: formData.enablePaymentPlans,
        oneTimeDiscount: formData.oneTimeDiscount,
        payment2Discount: formData.payment2Discount,
        payment3Discount: formData.payment3Discount,
        payment4Discount: formData.payment4Discount,
        enableTemporaryAccess: formData.enableTemporaryAccess,
        temporaryPassword: formData.enableTemporaryAccess ? formData.temporaryPassword : undefined,
        items: formData.items.length > 0 ? formData.items : undefined,
        packages: formData.packages.length > 0 ? formData.packages.map((pkg, index) => ({
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          features: pkg.features,
          isRecommended: pkg.isRecommended,
          order: index,
        })) : undefined,
      }

      const response = await quotesAPI.create(data)
      toast.success('Preventivo creato con successo!')
      navigate(`/clients/${formData.contactId}`)
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
            <Button variant="ghost" size="icon" onClick={() => navigate(formData.contactId ? `/clients/${formData.contactId}` : '/dashboard')}>
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
              {[1, 2, 3, 4, 5, 6].map((step) => (
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
                    <span className="text-xs font-medium text-center">
                      {step === 1 && 'Info Base'}
                      {step === 2 && 'Obiettivi'}
                      {step === 3 && 'Pacchetti'}
                      {step === 4 && 'Voci'}
                      {step === 5 && 'Sconti'}
                      {step === 6 && 'Riepilogo'}
                    </span>
                  </div>
                  {step < 6 && (
                    <div className="h-0.5 flex-1 bg-muted mx-2">
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

        {/* Step 2: Project Objectives */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Obiettivi del Progetto</CardTitle>
              <CardDescription>
                Definisci gli obiettivi principali del progetto (opzionale ma consigliato)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Objective Form */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="objectiveTitle">Titolo Obiettivo</Label>
                  <Input
                    id="objectiveTitle"
                    value={editingObjective.title}
                    onChange={(e) => setEditingObjective({ ...editingObjective, title: e.target.value })}
                    placeholder="es. Aumentare la visibilità online"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objectiveDescription">Descrizione Obiettivo</Label>
                  <Textarea
                    id="objectiveDescription"
                    value={editingObjective.description}
                    onChange={(e) => setEditingObjective({ ...editingObjective, description: e.target.value })}
                    placeholder="es. Creare una presenza digitale forte attraverso un sito web moderno e una strategia SEO efficace"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={addObjective}
                  className="w-full"
                  disabled={formData.objectives.length >= 3}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {formData.objectives.length >= 3 ? 'Massimo 3 obiettivi raggiunto' : 'Aggiungi Obiettivo'}
                </Button>
                {formData.objectives.length > 0 && formData.objectives.length < 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {3 - formData.objectives.length} obiettivi rimanenti
                  </p>
                )}
              </div>

              {/* Objectives List */}
              {formData.objectives.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nessun obiettivo aggiunto</p>
                  <p className="text-sm">Gli obiettivi aiutano il cliente a comprendere il valore del progetto (max 3)</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.objectives.map((objective, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">{objective.title}</h4>
                          <p className="text-sm text-muted-foreground">{objective.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeObjective(index)}
                          className="ml-2"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Packages */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Pacchetti Proposti</CardTitle>
              <CardDescription>
                Crea 2-3 pacchetti con diverse opzioni per il cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Price Range Alert */}
              {formData.items.length > 0 && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calculator className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Budget Stimato</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Basato sulle {formData.items.length} voci inserite: <span className="font-bold text-primary">€{totals.subtotal.toFixed(2)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usa questo come riferimento per i prezzi dei pacchetti (Base, Pro, Premium)
                  </p>
                </div>
              )}

              {/* Add Package Form */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="packageName">Nome Pacchetto *</Label>
                    <Input
                      id="packageName"
                      value={editingPackage.name}
                      onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                      placeholder="es. Pacchetto Base / Pro / Premium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packagePrice">Prezzo (€) *</Label>
                    <Input
                      id="packagePrice"
                      type="number"
                      value={editingPackage.price}
                      onChange={(e) => setEditingPackage({ ...editingPackage, price: parseFloat(e.target.value) || 0 })}
                      placeholder="es. 1500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packageDescription">Descrizione *</Label>
                  <Textarea
                    id="packageDescription"
                    value={editingPackage.description}
                    onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                    placeholder="Breve descrizione del pacchetto"
                    rows={2}
                  />
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <Label>Caratteristiche Incluse *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="es. Logo professionale"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addFeatureToPackage()
                        }
                      }}
                    />
                    <Button onClick={addFeatureToPackage} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {editingPackage.features.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {editingPackage.features.map((feature, index) => (
                        <li key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                          <span>• {feature}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeFeatureFromPackage(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isRecommended"
                    checked={editingPackage.isRecommended}
                    onChange={(e) => setEditingPackage({ ...editingPackage, isRecommended: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isRecommended" className="cursor-pointer">Pacchetto consigliato</Label>
                </div>

                <Button onClick={addPackage} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Pacchetto
                </Button>
              </div>

              {/* Packages List */}
              {formData.packages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nessun pacchetto aggiunto</p>
                  <p className="text-sm">Aggiungi almeno 2-3 pacchetti per dare scelta al cliente</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {formData.packages.map((pkg, index) => (
                    <div key={index} className={`p-4 border-2 rounded-lg ${pkg.isRecommended ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{pkg.name}</h4>
                          {pkg.isRecommended && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">Consigliato</span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePackage(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                      <ul className="space-y-1 mb-3">
                        {pkg.features.map((feature, fIndex) => (
                          <li key={fIndex} className="text-sm flex items-start">
                            <Check className="h-4 w-4 text-primary mr-1 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="text-lg font-bold text-primary">{pkg.price.toFixed(2)}€</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Price Calculation */}
        {currentStep === 3 && (
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
                  <CardTitle>Calcola Stima Prezzo</CardTitle>
                  <CardDescription>
                    Aggiungi voci per stimare il prezzo del progetto. Questo ti aiuterà a definire il range dei pacchetti nello step successivo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemName">Nome Voce *</Label>
                    <Input
                      id="itemName"
                      value={editingItem.itemName}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, itemName: e.target.value })
                      }
                      placeholder="es. Sviluppo Sito Web"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemDesc">Descrizione *</Label>
                    <Textarea
                      id="itemDesc"
                      value={editingItem.description}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, description: e.target.value })
                      }
                      placeholder="es. Sviluppo completo della homepage con sezioni hero, servizi e contatti"
                      rows={3}
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
                          <TableHead>Nome</TableHead>
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
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
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

        {/* Step 5: Discounts */}
        {currentStep === 5 && (
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
              )}

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableTemporaryAccess">Abilita Accesso Momentaneo</Label>
                    <p className="text-sm text-muted-foreground">
                      Consenti al cliente di accedere subito al preventivo con una password temporanea
                    </p>
                  </div>
                  <Switch
                    id="enableTemporaryAccess"
                    checked={formData.enableTemporaryAccess}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableTemporaryAccess: checked })}
                  />
                </div>

                {formData.enableTemporaryAccess && (
                  <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                    <div className="space-y-2">
                      <Label htmlFor="temporaryPassword">Password Temporanea *</Label>
                      <Input
                        id="temporaryPassword"
                        type="text"
                        placeholder="Imposta una password temporanea"
                        value={formData.temporaryPassword}
                        onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Il cliente userà questa password per accedere al preventivo. Quando attivi la Dashboard completa, l'accesso momentaneo si disattiverà.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Summary */}
        {currentStep === 6 && (
          <div className="space-y-6">
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
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente
                  </h3>
                  <p className="text-muted-foreground">
                    {contacts.find((c) => c.id === formData.contactId)?.name}
                  </p>
                </div>

                <Separator />

                {/* Quote Info */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Informazioni Preventivo
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Titolo:</dt>
                      <dd className="font-medium">{formData.title}</dd>
                    </div>
                    {formData.description && (
                      <div>
                        <dt className="text-muted-foreground mb-1">Descrizione:</dt>
                        <dd className="text-sm p-3 bg-muted rounded-md">{formData.description}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Valido fino al:
                      </dt>
                      <dd className="font-medium">
                        {new Date(formData.validUntil).toLocaleDateString('it-IT')}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Objectives */}
                {formData.objectives.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3">Obiettivi del Progetto</h3>
                      <div className="space-y-3">
                        {formData.objectives.map((objective, index) => (
                          <div key={index} className="p-4 border rounded-lg bg-muted/50">
                            <h4 className="font-medium mb-1">{objective.title}</h4>
                            <p className="text-sm text-muted-foreground">{objective.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Packages */}
                {formData.packages.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3">Pacchetti Proposti</h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        {formData.packages.map((pkg, index) => (
                          <Card
                            key={index}
                            className={pkg.isRecommended ? 'border-primary shadow-md' : ''}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                                {pkg.isRecommended && (
                                  <Badge className="bg-primary">
                                    <Check className="h-3 w-3 mr-1" />
                                    Consigliato
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="text-sm">
                                {pkg.description}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="text-3xl font-bold text-primary">
                                {pkg.price.toFixed(2)}€
                              </div>
                              {pkg.features.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                                    CARATTERISTICHE INCLUSE:
                                  </p>
                                  <ul className="space-y-2">
                                    {pkg.features.map((feature, fIndex) => (
                                      <li key={fIndex} className="flex items-start gap-2 text-sm">
                                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                        <span>{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Payment Options */}
                <div>
                  <h3 className="font-semibold mb-3">Sconti Modalità di Pagamento</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Pagamento Unico</span>
                        <Badge variant="secondary">{formData.oneTimeDiscount}% sconto</Badge>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">2 Rate</span>
                        <Badge variant="secondary">{formData.payment2Discount}% sconto</Badge>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">3 Rate</span>
                        <Badge variant="secondary">{formData.payment3Discount}% sconto</Badge>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">4 Rate</span>
                        <Badge variant="secondary">{formData.payment4Discount}% sconto</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="bg-muted/50 p-6 rounded-lg">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Riepilogo Economico
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-lg">
                      <span>Subtotale:</span>
                      <span className="font-medium">{totals.subtotal.toFixed(2)}€</span>
                    </div>
                    {formData.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Sconto Base:</span>
                        <span className="text-destructive">-{formData.discountAmount.toFixed(2)}€</span>
                      </div>
                    )}
                    {formData.taxRate > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>IVA ({formData.taxRate}%):</span>
                        <span>+{totals.taxAmount.toFixed(2)}€</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-2xl font-bold">
                      <span>{formData.packages.length > 0 ? 'A PARTIRE DA:' : 'TOTALE:'}</span>
                      <span className="text-primary flex items-center gap-1">
                        <Euro className="h-6 w-6" />
                        {formData.packages.length > 0
                          ? Math.min(...formData.packages.map(p => p.price)).toFixed(2)
                          : totals.total.toFixed(2)}
                      </span>
                    </div>
                    {formData.packages.length > 0 && (
                      <p className="text-xs text-muted-foreground text-right">
                        Il cliente potrà scegliere tra {formData.packages.length} pacchetti proposti
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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

          {currentStep < 6 ? (
            <Button
              onClick={() => setCurrentStep((s) => Math.min(6, s + 1) as Step)}
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
