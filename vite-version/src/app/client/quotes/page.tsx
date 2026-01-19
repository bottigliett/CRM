import * as React from "react"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileText,
  Check,
  X,
  Calendar,
  Euro,
  Package,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { clientAuthAPI } from "@/lib/client-auth-api"
import { clientQuotesAPI, type Quote } from "@/lib/client-quotes-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"

export default function ClientQuotesPage() {
  const [clientData, setClientData] = React.useState<any>(null)
  const [quote, setQuote] = React.useState<Quote | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectedPackageId, setSelectedPackageId] = React.useState<number | null>(null)
  const [selectedPaymentOption, setSelectedPaymentOption] = React.useState<string>("oneTime")
  const [submitting, setSubmitting] = React.useState(false)
  const [showRejectDialog, setShowRejectDialog] = React.useState(false)
  const [rejectionCategory, setRejectionCategory] = React.useState<string>("")
  const [rejectionDetails, setRejectionDetails] = React.useState<string>("")

  React.useEffect(() => {
    loadQuoteData()
  }, [])

  const loadQuoteData = async () => {
    try {
      setLoading(true)

      // Load client data
      const clientResponse = await clientAuthAPI.getMe()
      setClientData(clientResponse.data)

      // Load quote via client quotes API
      const quoteResponse = await clientQuotesAPI.getQuote()
      if (quoteResponse.success && quoteResponse.data) {
        setQuote(quoteResponse.data)

        // Pre-select if already selected
        if (quoteResponse.data.selectedPackageId) {
          setSelectedPackageId(quoteResponse.data.selectedPackageId)
        }
        if (quoteResponse.data.selectedPaymentOption) {
          setSelectedPaymentOption(quoteResponse.data.selectedPaymentOption)
        }
      }
    } catch (error) {
      console.error('Error loading quote data:', error)
      toast.error('Errore nel caricamento della proposta')
    } finally {
      setLoading(false)
    }
  }

  const parseFeatures = (features: string | string[] | null | undefined): string[] => {
    if (!features) return []

    // If already an array, return it
    if (Array.isArray(features)) return features

    // If it's a JSON array string, parse it
    if (typeof features === 'string') {
      try {
        const parsed = JSON.parse(features)
        if (Array.isArray(parsed)) return parsed
        // If it's not a JSON array, try splitting by newlines
        return features.split('\n').filter(f => f.trim())
      } catch {
        // If parsing fails, split by newlines
        return features.split('\n').filter(f => f.trim())
      }
    }

    return []
  }

  const parseObjectives = (objectives: any): Array<{ title: string; description: string }> => {
    if (!objectives) return []
    if (Array.isArray(objectives)) return objectives
    if (typeof objectives === 'string') {
      try {
        const parsed = JSON.parse(objectives)
        if (Array.isArray(parsed)) return parsed
        return []
      } catch {
        return []
      }
    }
    return []
  }

  const calculatePackageTotal = (price: number, paymentOption: string) => {
    if (!quote || !price || isNaN(price)) return 0

    const discounts = {
      oneTime: quote.oneTimeDiscount || 0,
      payment2: quote.payment2Discount || 0,
      payment3: quote.payment3Discount || 0,
      payment4: quote.payment4Discount || 0,
    }

    const discount = discounts[paymentOption as keyof typeof discounts] || 0
    return price - (price * discount) / 100
  }

  const getPaymentLabel = (option: string) => {
    switch (option) {
      case 'oneTime':
        return 'Pagamento Unico'
      case 'payment2':
        return '2 Rate'
      case 'payment3':
        return '3 Rate'
      case 'payment4':
        return '4 Rate'
      default:
        return option
    }
  }

  const getPaymentDiscount = (option: string) => {
    if (!quote) return 0
    switch (option) {
      case 'oneTime':
        return quote.oneTimeDiscount || 0
      case 'payment2':
        return quote.payment2Discount || 0
      case 'payment3':
        return quote.payment3Discount || 0
      case 'payment4':
        return quote.payment4Discount || 0
      default:
        return 0
    }
  }

  const handleAcceptQuote = async () => {
    if (!quote) return

    // Validate selection if packages exist
    if (quote.packages && quote.packages.length > 0 && !selectedPackageId) {
      toast.error('Seleziona un pacchetto prima di accettare')
      return
    }

    try {
      setSubmitting(true)

      await clientQuotesAPI.acceptQuote({
        selectedPackageId: selectedPackageId!,
        selectedPaymentOption,
      })

      toast.success('Proposta accettata con successo!')
      loadQuoteData()
    } catch (error: any) {
      console.error('Error accepting quote:', error)
      toast.error(error.message || 'Errore nell\'accettazione della proposta')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejectQuote = () => {
    if (!quote) return
    setShowRejectDialog(true)
  }

  const confirmRejectQuote = async () => {
    if (!quote) return

    if (!rejectionCategory) {
      toast.error('Seleziona un motivo per il rifiuto')
      return
    }

    try {
      setSubmitting(true)

      let rejectionReason = rejectionCategory
      if (rejectionCategory === 'altro' && rejectionDetails) {
        rejectionReason = `Altro: ${rejectionDetails}`
      } else if (rejectionDetails) {
        rejectionReason = `${rejectionCategory}: ${rejectionDetails}`
      }

      await clientQuotesAPI.rejectQuote(rejectionReason)

      toast.success('Proposta rifiutata')
      setShowRejectDialog(false)
      setRejectionCategory('')
      setRejectionDetails('')
      loadQuoteData()
    } catch (error: any) {
      console.error('Error rejecting quote:', error)
      toast.error(error.message || 'Errore nel rifiuto della proposta')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'REJECTED':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'SENT':
      case 'VIEWED':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'EXPIRED':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Bozza'
      case 'SENT':
        return 'Inviato'
      case 'VIEWED':
        return 'Visualizzato'
      case 'ACCEPTED':
        return 'Accettato'
      case 'REJECTED':
        return 'Rifiutato'
      case 'EXPIRED':
        return 'Scaduto'
      default:
        return status
    }
  }

  const isQuoteExpired = quote && new Date(quote.validUntil) < new Date()
  const canInteract = quote && quote.status !== 'ACCEPTED' && quote.status !== 'REJECTED' && !isQuoteExpired

  if (loading) {
    return (
      <ClientLayout title="La Tua Proposta di Collaborazione" description="Visualizza e gestisci la tua proposta">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Caricamento...</p>
          </div>
        </div>
      </ClientLayout>
    )
  }

  if (!quote) {
    return (
      <ClientLayout title="La Tua Proposta di Collaborazione" description="Visualizza e gestisci la tua proposta">
        <div className="px-4 lg:px-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nessuna proposta di collaborazione assegnata al momento.
            </AlertDescription>
          </Alert>
        </div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout
      title="La Tua Proposta di Collaborazione"
      description={quote.title}
    >
      <div className="px-4 lg:px-6 space-y-6">
        {/* Quote Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {quote.quoteNumber}
                </CardTitle>
                <CardDescription className="mt-2">{quote.description}</CardDescription>
              </div>
              <Badge variant="outline" className={getStatusColor(quote.status)}>
                {getStatusLabel(quote.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Valido fino al:</span>
                <span className="font-medium">
                  {format(new Date(quote.validUntil), 'dd MMMM yyyy', { locale: it })}
                </span>
                {isQuoteExpired && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                    Scaduto
                  </Badge>
                )}
              </div>
              {quote.acceptedDate && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Accettato il:</span>
                  <span className="font-medium">
                    {format(new Date(quote.acceptedDate), 'dd MMMM yyyy', { locale: it })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Objectives Section */}
        {parseObjectives(quote.objectives).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Obiettivi del Progetto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {parseObjectives(quote.objectives).map((objective, index) => (
                  <div key={index} className="border-l-2 border-primary pl-4">
                    <h4 className="font-semibold text-base mb-1">{objective.title}</h4>
                    <p className="text-sm text-muted-foreground">{objective.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alert if expired */}
        {isQuoteExpired && (
          <Alert variant="destructive">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Questa proposta è scaduta. Contatta il supporto per richiederne una aggiornata.
            </AlertDescription>
          </Alert>
        )}

        {/* Alert if already accepted/rejected */}
        {quote.status === 'ACCEPTED' && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              Hai accettato questa proposta il {format(new Date(quote.acceptedDate!), 'dd MMMM yyyy', { locale: it })}
            </AlertDescription>
          </Alert>
        )}

        {quote.status === 'REJECTED' && (
          <Alert variant="destructive">
            <X className="h-4 w-4" />
            <AlertDescription>
              Hai rifiutato questa proposta. Contatta il supporto per discutere le modifiche.
            </AlertDescription>
          </Alert>
        )}

        {/* Packages Section (if exists) */}
        {quote.packages && quote.packages.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Scegli la Tua Soluzione</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {quote.packages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id
                const total = calculatePackageTotal(pkg.price, selectedPaymentOption)
                const features = parseFeatures(pkg.features)

                return (
                  <Card
                    key={pkg.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    } ${!canInteract ? 'opacity-60 cursor-not-allowed' : ''} ${
                      pkg.recommended ? 'border-primary' : ''
                    }`}
                    onClick={() => canInteract && setSelectedPackageId(pkg.id!)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {isSelected && <Check className="h-5 w-5 text-primary" />}
                          {pkg.name}
                        </CardTitle>
                        {pkg.recommended && (
                          <Badge variant="default">Consigliato</Badge>
                        )}
                      </div>
                      {pkg.description && (
                        <CardDescription>{pkg.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-3xl font-bold">
                        €{total.toFixed(2)}
                      </div>
                      {features.length > 0 && (
                        <div className="space-y-2">
                          {features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : (
          /* Traditional Items Section */
          <Card>
            <CardHeader>
              <CardTitle>Voci della Proposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quote.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      {item.category && (
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} x €{item.unitPrice.toFixed(2)}
                      </p>
                      <p className="font-medium">€{item.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotale</span>
                  <span>€{quote.subtotal.toFixed(2)}</span>
                </div>
                {quote.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sconto</span>
                    <span className="text-green-600">-€{quote.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA ({quote.taxRate}%)</span>
                  <span>€{((quote.total - quote.subtotal + quote.discountAmount) || 0).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Totale</span>
                  <span>€{quote.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Options */}
        {canInteract && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Opzioni di Pagamento
              </CardTitle>
              <CardDescription>Scegli la modalità di pagamento più adatta a te</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedPaymentOption} onValueChange={setSelectedPaymentOption}>
                <div className="grid gap-3">
                  {['oneTime', 'payment2', 'payment3', 'payment4'].map((option) => {
                    const discount = getPaymentDiscount(option)
                    return (
                      <div
                        key={option}
                        className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-all ${
                          selectedPaymentOption === option ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedPaymentOption(option)}
                      >
                        <RadioGroupItem value={option} id={option} />
                        <Label htmlFor={option} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{getPaymentLabel(option)}</span>
                            {discount > 0 && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                Sconto {discount}%
                              </Badge>
                            )}
                          </div>
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Summary Section (if package and payment selected) */}
        {canInteract && selectedPackageId && quote.packages.length > 0 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Riepilogo della Tua Scelta
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const selectedPackage = quote.packages.find(p => p.id === selectedPackageId)
                if (!selectedPackage) return null

                const basePrice = selectedPackage.price
                const discount = getPaymentDiscount(selectedPaymentOption)
                const discountAmount = (basePrice * discount) / 100
                const finalPrice = basePrice - discountAmount

                return (
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-sm text-muted-foreground">Pacchetto selezionato</span>
                        <span className="font-medium">{selectedPackage.name}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-sm text-muted-foreground">Prezzo base</span>
                        <span className="font-medium">€{basePrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-sm text-muted-foreground">Modalità di pagamento</span>
                        <span className="font-medium">{getPaymentLabel(selectedPaymentOption)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between items-center pb-2 border-b text-green-600">
                          <span className="text-sm">Sconto applicato ({discount}%)</span>
                          <span className="font-medium">-€{discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-lg font-semibold">Totale finale</span>
                        <span className="text-2xl font-bold text-primary">€{finalPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    {selectedPaymentOption !== 'oneTime' && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Nota:</strong> La prima rata di €{(finalPrice / parseInt(selectedPaymentOption.replace('payment', ''))).toFixed(2)} sarà pagata in anticipo.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {canInteract && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleAcceptQuote}
                  disabled={submitting || (quote.packages.length > 0 && !selectedPackageId)}
                  className="flex-1"
                  size="lg"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accetta Proposta
                </Button>
                <Button
                  onClick={handleRejectQuote}
                  disabled={submitting}
                  variant="outline"
                  size="lg"
                >
                  <X className="h-4 w-4 mr-2" />
                  Rifiuta
                </Button>
              </div>
              {quote.packages.length > 0 && !selectedPackageId && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Seleziona un pacchetto prima di accettare la proposta
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rejection Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rifiuta Proposta</DialogTitle>
              <DialogDescription>
                Aiutaci a capire il motivo del rifiuto. Questo ci permetterà di migliorare le nostre proposte future.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Motivo del rifiuto *</Label>
                <RadioGroup value={rejectionCategory} onValueChange={setRejectionCategory}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="prezzo_alto" id="prezzo_alto" />
                    <Label htmlFor="prezzo_alto" className="font-normal cursor-pointer">
                      Prezzo troppo alto
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non_interessato" id="non_interessato" />
                    <Label htmlFor="non_interessato" className="font-normal cursor-pointer">
                      Non più interessato
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="altro_fornitore" id="altro_fornitore" />
                    <Label htmlFor="altro_fornitore" className="font-normal cursor-pointer">
                      Scelto altro fornitore
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="altro" id="altro" />
                    <Label htmlFor="altro" className="font-normal cursor-pointer">
                      Altro
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="details">Dettagli aggiuntivi (opzionale)</Label>
                <Textarea
                  id="details"
                  placeholder="Aggiungi eventuali dettagli..."
                  value={rejectionDetails}
                  onChange={(e) => setRejectionDetails(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false)
                  setRejectionCategory('')
                  setRejectionDetails('')
                }}
                disabled={submitting}
              >
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={confirmRejectQuote}
                disabled={submitting || !rejectionCategory}
              >
                {submitting ? 'Invio...' : 'Conferma Rifiuto'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  )
}
