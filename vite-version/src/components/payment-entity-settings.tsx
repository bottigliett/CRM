import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { paymentEntityAPI, type PaymentEntity, type CreatePaymentEntityData } from '@/lib/payment-entity-api'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import { Settings, Plus, Pencil, Trash2, Star, Loader2 } from 'lucide-react'

export function PaymentEntitySettings() {
  const [open, setOpen] = useState(false)
  const [entities, setEntities] = useState<PaymentEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEntity, setEditingEntity] = useState<PaymentEntity | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { user } = useAuthStore()
  const isDeveloper = user?.role === 'DEVELOPER'

  // Form state
  const [formData, setFormData] = useState<CreatePaymentEntityData>({
    name: '',
    beneficiary: '',
    iban: '',
    bankName: '',
    bic: '',
    sdi: '',
    taxId: '',
    isDefault: false,
  })

  useEffect(() => {
    if (open) {
      loadEntities()
    }
  }, [open])

  const loadEntities = async () => {
    try {
      setLoading(true)
      const response = await paymentEntityAPI.getAll()
      if (response.success) {
        setEntities(response.data)
      }
    } catch (error) {
      console.error('Error loading payment entities:', error)
      toast.error('Errore nel caricamento delle entità di pagamento')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      beneficiary: '',
      iban: '',
      bankName: '',
      bic: '',
      sdi: '',
      taxId: '',
      isDefault: false,
    })
    setEditingEntity(null)
    setShowForm(false)
  }

  const handleEdit = (entity: PaymentEntity) => {
    setEditingEntity(entity)
    setFormData({
      name: entity.name,
      beneficiary: entity.beneficiary,
      iban: entity.iban,
      bankName: entity.bankName,
      bic: entity.bic || '',
      sdi: entity.sdi || '',
      taxId: entity.taxId || '',
      isDefault: entity.isDefault,
    })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.beneficiary || !formData.iban || !formData.bankName) {
      toast.error('Compila tutti i campi obbligatori')
      return
    }

    try {
      setSubmitting(true)
      if (editingEntity) {
        const response = await paymentEntityAPI.update(editingEntity.id, formData)
        if (response.success) {
          toast.success('Entità aggiornata')
          loadEntities()
          resetForm()
        }
      } else {
        const response = await paymentEntityAPI.create(formData)
        if (response.success) {
          toast.success('Entità creata')
          loadEntities()
          resetForm()
        }
      }
    } catch (error) {
      console.error('Error saving payment entity:', error)
      toast.error('Errore nel salvataggio')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (entity: PaymentEntity) => {
    if (!confirm(`Eliminare "${entity.name}"?`)) return

    try {
      const response = await paymentEntityAPI.delete(entity.id)
      if (response.success) {
        toast.success(response.message)
        loadEntities()
      }
    } catch (error) {
      console.error('Error deleting payment entity:', error)
      toast.error('Errore nell\'eliminazione')
    }
  }

  const handleSetDefault = async (entity: PaymentEntity) => {
    try {
      const response = await paymentEntityAPI.setDefault(entity.id)
      if (response.success) {
        toast.success('Impostata come predefinita')
        loadEntities()
      }
    } catch (error) {
      console.error('Error setting default:', error)
      toast.error('Errore')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Entità di Pagamento</DialogTitle>
          <DialogDescription>
            Gestisci le informazioni di pagamento per le fatture
          </DialogDescription>
        </DialogHeader>

        {showForm ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="es. Davide"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="beneficiary">Beneficiario *</Label>
                <Input
                  id="beneficiary"
                  value={formData.beneficiary}
                  onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                  placeholder="es. Stefano Costato e Davide Marangoni"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN *</Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                placeholder="es. IT55 V181 0301 6000 0481 4366 773"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Banca *</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="es. FINOM PAYMENTS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bic">BIC/SWIFT</Label>
                <Input
                  id="bic"
                  value={formData.bic}
                  onChange={(e) => setFormData({ ...formData, bic: e.target.value })}
                  placeholder="es. FNOMITM2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sdi">Codice SDI</Label>
                <Input
                  id="sdi"
                  value={formData.sdi}
                  onChange={(e) => setFormData({ ...formData, sdi: e.target.value })}
                  placeholder="es. JI3TXCE"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">P.IVA/C.F.</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="es. IT05052740239"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
              <Label htmlFor="isDefault">Imposta come predefinita</Label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm} disabled={submitting}>
                Annulla
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : editingEntity ? (
                  'Aggiorna'
                ) : (
                  'Crea'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : entities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nessuna entità di pagamento configurata</p>
                {isDeveloper && (
                  <Button className="mt-4" onClick={() => setShowForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi la prima
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>Banca</TableHead>
                    <TableHead>Stato</TableHead>
                    {isDeveloper && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entities.map((entity) => (
                    <TableRow key={entity.id}>
                      <TableCell className="font-medium">
                        {entity.name}
                        {entity.isDefault && (
                          <Badge variant="secondary" className="ml-2">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{entity.iban}</TableCell>
                      <TableCell>{entity.bankName}</TableCell>
                      <TableCell>
                        <Badge variant={entity.isActive ? 'default' : 'secondary'}>
                          {entity.isActive ? 'Attiva' : 'Inattiva'}
                        </Badge>
                      </TableCell>
                      {isDeveloper && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!entity.isDefault && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSetDefault(entity)}
                                title="Imposta come predefinita"
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(entity)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(entity)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {isDeveloper && entities.length > 0 && (
              <DialogFooter>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Entità
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
