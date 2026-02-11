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
  invoicesAPI,
  type Invoice,
  type CreateInvoiceData,
} from "@/lib/invoices-api"
import { contactsAPI, type Contact } from "@/lib/contacts-api"
import { paymentEntityAPI, type PaymentEntity } from "@/lib/payment-entity-api"
import { Loader2, Check, ChevronsUpDown, Trash2, Search, Users } from "lucide-react"
import { format } from "date-fns"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { AlertDialogCustom } from "@/components/ui/alert-dialog-custom"

interface InvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  onInvoicePaid?: (invoice: Invoice) => void
  invoice?: Invoice | null
}

interface ServiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export function InvoiceDialog({ open, onOpenChange, onSuccess, onInvoicePaid, invoice }: InvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingNumber, setIsLoadingNumber] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all')
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [paymentEntities, setPaymentEntities] = useState<PaymentEntity[]>([])
  const [services, setServices] = useState<ServiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0 }
  ])

  const [formData, setFormData] = useState<CreateInvoiceData>({
    invoiceNumber: '',
    clientName: '',
    clientAddress: '',
    clientPIva: '',
    clientCF: '',
    subject: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatPercentage: 0,
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    paymentDays: 30,
    status: 'DRAFT',
    fiscalNotes: "IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL'ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\n\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.",
  })

  // Calculate amounts from services
  const subtotal = services.reduce((sum, service) => {
    return sum + (service.quantity * service.unitPrice)
  }, 0)
  const vatAmount = 0 // IVA sempre 0%
  const total = subtotal + vatAmount

  // Add new service
  const addService = () => {
    const newId = (Math.max(...services.map(s => parseInt(s.id)), 0) + 1).toString()
    setServices([...services, { id: newId, description: '', quantity: 1, unitPrice: 0 }])
  }

  // Remove service
  const removeService = (id: string) => {
    if (services.length > 1) {
      setServices(services.filter(s => s.id !== id))
    }
  }

  // Update service
  const updateService = (id: string, field: keyof ServiceItem, value: any) => {
    setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  // Filter contacts based on search and type
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = clientSearchTerm === '' ||
      contact.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      contact.partitaIva?.toLowerCase().includes(clientSearchTerm.toLowerCase())

    const matchesType = clientTypeFilter === 'all' || contact.type === clientTypeFilter

    return matchesSearch && matchesType
  })

  // Load contacts and payment entities when dialog opens
  useEffect(() => {
    async function loadData() {
      if (open) {
        try {
          setIsLoadingContacts(true)
          const [contactsResponse, entitiesResponse] = await Promise.all([
            contactsAPI.getContacts({ limit: 1000 }),
            paymentEntityAPI.getAll(true) // Only active entities
          ])
          if (contactsResponse.success) {
            setContacts(contactsResponse.data.contacts)
          }
          if (entitiesResponse.success) {
            setPaymentEntities(entitiesResponse.data)
            // Set default payment entity if creating new invoice and one exists
            if (!invoice) {
              const defaultEntity = entitiesResponse.data.find(e => e.isDefault)
              if (defaultEntity) {
                setFormData(prev => ({ ...prev, paymentEntityId: defaultEntity.id }))
              }
            }
          }
        } catch (error) {
          console.error('Failed to load data:', error)
        } finally {
          setIsLoadingContacts(false)
        }
      }
    }

    loadData()
  }, [open, invoice])

  // Load next invoice number when creating new invoice
  useEffect(() => {
    async function loadNextNumber() {
      if (open && !invoice) {
        try {
          setIsLoadingNumber(true)
          const response = await invoicesAPI.getNextInvoiceNumber()
          if (response.success) {
            setFormData(prev => ({ ...prev, invoiceNumber: response.data.invoiceNumber }))
          }
        } catch (error) {
          console.error('Failed to load next invoice number:', error)
        } finally {
          setIsLoadingNumber(false)
        }
      }
    }

    loadNextNumber()
  }, [open, invoice])

  // Load invoice data when editing
  useEffect(() => {
    if (open && invoice) {
      setFormData({
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientAddress: invoice.clientAddress || '',
        clientPIva: invoice.clientPIva || '',
        clientCF: invoice.clientCF || '',
        subject: invoice.subject,
        description: invoice.description || '',
        quantity: invoice.quantity,
        unitPrice: invoice.unitPrice,
        vatPercentage: invoice.vatPercentage,
        issueDate: format(new Date(invoice.issueDate), 'yyyy-MM-dd'),
        paymentDays: invoice.paymentDays,
        status: invoice.status,
        fiscalNotes: invoice.fiscalNotes || '',
        contactId: invoice.contactId,
        paymentEntityId: invoice.paymentEntityId,
        paymentDate: invoice.paymentDate ? format(new Date(invoice.paymentDate), 'yyyy-MM-dd') : undefined,
      })

      // Parse services from JSON description
      if (invoice.description) {
        try {
          const parsedServices = JSON.parse(invoice.description)
          if (Array.isArray(parsedServices) && parsedServices.length > 0) {
            setServices(parsedServices)
          } else {
            // Fallback to single service from invoice data
            setServices([{
              id: '1',
              description: '',
              quantity: invoice.quantity,
              unitPrice: invoice.unitPrice
            }])
          }
        } catch (e) {
          // If JSON parsing fails, use invoice data as single service
          setServices([{
            id: '1',
            description: invoice.description || '',
            quantity: invoice.quantity,
            unitPrice: invoice.unitPrice
          }])
        }
      } else {
        setServices([{
          id: '1',
          description: '',
          quantity: invoice.quantity,
          unitPrice: invoice.unitPrice
        }])
      }
    } else if (open && !invoice) {
      // Reset form for new invoice
      setFormData({
        invoiceNumber: '',
        clientName: '',
        clientAddress: '',
        clientPIva: '',
        clientCF: '',
        subject: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        vatPercentage: 0,
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        paymentDays: 30,
        status: 'DRAFT',
        fiscalNotes: "IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL'ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\n\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO.",
      })
      setServices([{ id: '1', description: '', quantity: 1, unitPrice: 0 }])
    }
  }, [open, invoice])

  const handleClientSelect = (contactId: number) => {
    const contact = contacts.find(c => c.id === contactId)
    if (contact) {
      setFormData({
        ...formData,
        contactId: contact.id,
        clientName: contact.name,
        clientAddress: contact.address || '',
        clientPIva: contact.partitaIva || '',
        clientCF: contact.codiceFiscale || '',
      })
      setClientSelectorOpen(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)

      // Calculate totals from services
      const firstService = services[0]
      const calculatedSubtotal = services.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0)
      const calculatedVatAmount = 0 // IVA sempre 0%
      const calculatedTotal = calculatedSubtotal + calculatedVatAmount

      // Store services as JSON in description field for now
      const servicesJSON = JSON.stringify(services)

      const invoiceData = {
        ...formData,
        quantity: firstService.quantity,
        unitPrice: firstService.unitPrice,
        description: servicesJSON,
        subtotal: calculatedSubtotal,
        vatPercentage: 0,
        vatAmount: calculatedVatAmount,
        total: calculatedTotal,
        paymentEntityId: formData.paymentEntityId,
      }

      // Track if status is becoming PAID
      const isBecomingPaid = invoice && invoice.status !== 'PAID' && formData.status === 'PAID'

      let updatedInvoice: Invoice | undefined

      if (invoice) {
        // Update existing invoice
        const response = await invoicesAPI.updateInvoice(invoice.id, invoiceData)
        updatedInvoice = response.data
      } else {
        // Create new invoice
        const response = await invoicesAPI.createInvoice(invoiceData)
        updatedInvoice = response.data
      }

      onSuccess?.()
      onOpenChange(false)

      // Open tax reservation dialog if invoice just became PAID and taxes not reserved
      if (isBecomingPaid && updatedInvoice && !updatedInvoice.taxReserved && onInvoicePaid) {
        // Small delay to let the dialog close first
        setTimeout(() => {
          onInvoicePaid(updatedInvoice!)
        }, 300)
      }
    } catch (error) {
      console.error('Failed to save invoice:', error)
      setErrorMessage('Errore durante il salvataggio della fattura.')
      setErrorDialogOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? 'Modifica Fattura' : 'Nuova Fattura'}</DialogTitle>
          <DialogDescription>
            {invoice ? 'Modifica i dettagli della fattura' : 'Compila i campi per creare una nuova fattura'}
          </DialogDescription>
        </DialogHeader>

        {isLoadingNumber ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Invoice Number and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Numero Fattura *</Label>
                  <Input
                    id="invoiceNumber"
                    required
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="#001 2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Stato *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => {
                      // Auto-set payment date to today when changing to PAID
                      if (value === 'PAID' && !formData.paymentDate) {
                        setFormData({ ...formData, status: value, paymentDate: format(new Date(), 'yyyy-MM-dd') })
                      } else {
                        setFormData({ ...formData, status: value })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Bozza</SelectItem>
                      <SelectItem value="ISSUED">Emessa</SelectItem>
                      <SelectItem value="PAID">Pagata</SelectItem>
                      <SelectItem value="CANCELLED">Annullata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Client Information */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Dati Cliente</h3>

                <div className="space-y-2">
                  <Label>Seleziona Cliente *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cerca cliente per nome, email o P.IVA..."
                        value={formData.clientName}
                        readOnly
                        className="pl-9 cursor-pointer"
                        onClick={() => setClientSelectorOpen(true)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setClientSelectorOpen(true)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Dettagli Fattura</h3>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Oggetto *</Label>
                    <Input
                      id="subject"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Social Media Management - Gennaio 2025"
                    />
                  </div>

                  {/* Services List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Servizi *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addService}>
                        + Aggiungi Servizio
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {services.map((service, index) => (
                        <div key={service.id} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-6 space-y-1">
                            {index === 0 && <Label className="text-xs">Descrizione</Label>}
                            <Input
                              placeholder="Gestione social media"
                              value={service.description}
                              onChange={(e) => updateService(service.id, 'description', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            {index === 0 && <Label className="text-xs">Qtà</Label>}
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="1"
                              value={service.quantity || ''}
                              onChange={(e) => updateService(service.id, 'quantity', parseFloat(e.target.value) || 0)}
                              required
                            />
                          </div>
                          <div className="col-span-3 space-y-1">
                            {index === 0 && <Label className="text-xs">Prezzo €</Label>}
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={service.unitPrice || ''}
                              onChange={(e) => updateService(service.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="col-span-1">
                            {services.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                                onClick={() => removeService(service.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Calculated Amounts */}
                  <div className="bg-muted p-3 rounded-md space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Imponibile:</span>
                      <span className="font-medium">€ {subtotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>IVA (0%):</span>
                      <span className="font-medium">€ 0,00</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold border-t pt-1">
                      <span>Totale:</span>
                      <span>€ {total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates and Payment */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Date e Pagamento</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Data Emissione *</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      required
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDays">Giorni Pagamento *</Label>
                    <Select
                      value={formData.paymentDays?.toString()}
                      onValueChange={(value) => setFormData({ ...formData, paymentDays: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 giorni</SelectItem>
                        <SelectItem value="30">30 giorni</SelectItem>
                        <SelectItem value="60">60 giorni</SelectItem>
                        <SelectItem value="90">90 giorni</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.status === 'PAID' && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="paymentDate">Data Pagamento *</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      required
                      value={formData.paymentDate || format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Questa data verrà usata per la transazione nel Finance
                    </p>
                  </div>
                )}

                {paymentEntities.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="paymentEntity">Entità Pagamento</Label>
                    <Select
                      value={formData.paymentEntityId?.toString() || ''}
                      onValueChange={(value) => setFormData({ ...formData, paymentEntityId: value ? parseInt(value) : undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona entità..." />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentEntities.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id.toString()}>
                            {entity.name} {entity.isDefault && '(Default)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Determina le informazioni di pagamento sulla fattura
                    </p>
                  </div>
                )}
              </div>

            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {invoice ? 'Salva Modifiche' : 'Crea Fattura'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>

      {/* Client Selection Dialog */}
      <Dialog open={clientSelectorOpen} onOpenChange={setClientSelectorOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Seleziona Cliente dall'Anagrafica</DialogTitle>
            <DialogDescription>
              Cerca e seleziona un cliente esistente dall'elenco
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome, email o P.IVA..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="CLIENT">Clienti</SelectItem>
                  <SelectItem value="PROSPECT">Prospect</SelectItem>
                  <SelectItem value="COLLABORATION">Collaborazioni</SelectItem>
                  <SelectItem value="USEFUL_CONTACT">Contatti Utili</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contacts List */}
            <div className="border rounded-md overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                {isLoadingContacts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nessun cliente trovato
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className={cn(
                          "p-4 hover:bg-muted cursor-pointer transition-colors",
                          formData.contactId === contact.id && "bg-muted"
                        )}
                        onClick={() => handleClientSelect(contact.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{contact.name}</h4>
                              {formData.contactId === contact.id && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                              {contact.email && <div>Email: {contact.email}</div>}
                              {contact.partitaIva && <div>P.IVA: {contact.partitaIva}</div>}
                              {contact.address && <div>Indirizzo: {contact.address}</div>}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {contact.type === 'CLIENT' && 'Cliente'}
                            {contact.type === 'PROSPECT' && 'Prospect'}
                            {contact.type === 'COLLABORATION' && 'Collaborazione'}
                            {contact.type === 'USEFUL_CONTACT' && 'Contatto Utile'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Results Count */}
            {!isLoadingContacts && (
              <div className="text-sm text-muted-foreground text-center">
                {filteredContacts.length} {filteredContacts.length === 1 ? 'cliente trovato' : 'clienti trovati'}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setClientSelectorOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
