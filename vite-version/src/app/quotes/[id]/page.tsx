import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { quotesAPI } from '@/lib/quotes-api'
import type { Quote } from '@/lib/quotes-api'
import { toast } from 'sonner'
import {
  Loader2,
  ArrowLeft,
  Edit,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  User,
  Calendar,
  Euro
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const statusConfig = {
  DRAFT: { label: 'Bozza', variant: 'secondary' as const, icon: FileText },
  SENT: { label: 'Inviato', variant: 'default' as const, icon: Send },
  VIEWED: { label: 'Visualizzato', variant: 'outline' as const, icon: Eye },
  ACCEPTED: { label: 'Accettato', variant: 'default' as const, icon: CheckCircle, className: 'bg-green-500' },
  REJECTED: { label: 'Rifiutato', variant: 'destructive' as const, icon: XCircle },
  EXPIRED: { label: 'Scaduto', variant: 'secondary' as const, icon: AlertCircle }
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<Quote | null>(null)

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
      }
    } catch (error) {
      console.error('Failed to load quote:', error)
      toast.error('Errore nel caricamento del preventivo')
      navigate('/quotes')
    } finally {
      setLoading(false)
    }
  }

  const parseFeatures = (features: string | string[] | null | undefined): string[] => {
    if (!features) return []
    if (Array.isArray(features)) return features
    if (typeof features === 'string') {
      try {
        const parsed = JSON.parse(features)
        if (Array.isArray(parsed)) return parsed
        return features.split('\n').filter(f => f.trim())
      } catch {
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

  if (loading) {
    return (
      <BaseLayout title="Dettaglio Preventivo" description="Caricamento...">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </BaseLayout>
    )
  }

  if (!quote) {
    return (
      <BaseLayout title="Dettaglio Preventivo" description="Preventivo non trovato">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Preventivo non trovato</p>
          </CardContent>
        </Card>
      </BaseLayout>
    )
  }

  const StatusIcon = statusConfig[quote.status as keyof typeof statusConfig]?.icon || FileText

  return (
    <BaseLayout
      title="Dettaglio Preventivo"
      description={`Preventivo ${quote.quoteNumber}`}
      headerAction={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/quotes')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla lista
          </Button>
          <Button onClick={() => navigate(`/quotes/${quote.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Modifica
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{quote.title}</CardTitle>
                <CardDescription className="mt-1">{quote.quoteNumber}</CardDescription>
              </div>
              <Badge
                variant={statusConfig[quote.status as keyof typeof statusConfig]?.variant || 'secondary'}
                className={statusConfig[quote.status as keyof typeof statusConfig]?.className}
              >
                <StatusIcon className="mr-1 h-3 w-3" />
                {statusConfig[quote.status as keyof typeof statusConfig]?.label || quote.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {quote.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Descrizione</h4>
                <p className="text-sm text-muted-foreground">{quote.description}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Cliente</p>
                  <p className="text-sm text-muted-foreground">{quote.contact.name}</p>
                  {quote.contact.email && (
                    <p className="text-sm text-muted-foreground">{quote.contact.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Valido fino al</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(quote.validUntil), 'PPP', { locale: it })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Data creazione</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(quote.createdAt), 'PPP', { locale: it })}
                  </p>
                </div>
              </div>

              {quote.acceptedDate && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Data accettazione</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(quote.acceptedDate), 'PPP', { locale: it })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Objectives */}
        {parseObjectives(quote.objectives).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Obiettivi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {parseObjectives(quote.objectives).map((objective, index) => (
                  <div key={index}>
                    <h4 className="font-medium">{objective.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{objective.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Packages */}
        {quote.packages && quote.packages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pacchetti</CardTitle>
              <CardDescription>I pacchetti proposti per questo preventivo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quote.packages.map((pkg) => (
                  <Card key={pkg.id} className={pkg.isRecommended ? 'border-primary' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                        {pkg.isRecommended && (
                          <Badge variant="default">Consigliato</Badge>
                        )}
                      </div>
                      {pkg.description && (
                        <CardDescription>{pkg.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-2xl font-bold">
                          {formatCurrency(pkg.price || pkg.basePrice)}
                        </div>

                        {parseFeatures(pkg.features).length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Caratteristiche:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {parseFeatures(pkg.features).map((feature, idx) => (
                                <li key={idx}>• {feature}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {pkg.items && pkg.items.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Voci incluse:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {pkg.items.map((item, idx) => (
                                <li key={idx}>
                                  {item.itemName} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual Items */}
        {quote.items && quote.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Voci del Preventivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quote.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <p className="font-medium">{item.itemName}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      {item.category && (
                        <Badge variant="outline" className="mt-1">{item.category}</Badge>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-medium">{formatCurrency(item.total)}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Discounts */}
        <Card>
          <CardHeader>
            <CardTitle>Sconti Modalità di Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Pagamento Unico</p>
                <p className="text-lg font-semibold">{quote.oneTimeDiscount}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">2 Rate</p>
                <p className="text-lg font-semibold">{quote.payment2Discount}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">3 Rate</p>
                <p className="text-lg font-semibold">{quote.payment3Discount}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">4 Rate</p>
                <p className="text-lg font-semibold">{quote.payment4Discount}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Riepilogo Importi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotale</span>
                <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Sconto</span>
                  <span className="font-medium">-{formatCurrency(quote.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA ({quote.taxRate}%)</span>
                <span>{formatCurrency((quote.subtotal - quote.discountAmount) * (quote.taxRate / 100))}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Totale</span>
                <span className="font-bold">{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Package/Payment (if accepted) */}
        {quote.status === 'ACCEPTED' && quote.selectedPackageId && (
          <Card>
            <CardHeader>
              <CardTitle>Scelta Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Pacchetto selezionato</p>
                  <p className="font-medium">
                    {quote.packages.find(p => p.id === quote.selectedPackageId)?.name || 'N/A'}
                  </p>
                </div>
                {quote.selectedPaymentOption && (
                  <div>
                    <p className="text-sm text-muted-foreground">Modalità di pagamento</p>
                    <p className="font-medium">
                      {quote.selectedPaymentOption === 'oneTime' && 'Pagamento Unico'}
                      {quote.selectedPaymentOption === 'payment2' && '2 Rate'}
                      {quote.selectedPaymentOption === 'payment3' && '3 Rate'}
                      {quote.selectedPaymentOption === 'payment4' && '4 Rate'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </BaseLayout>
  )
}
