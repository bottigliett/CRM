import * as React from "react"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MessageSquare, Plus, Clock } from "lucide-react"
import { Link } from "react-router-dom"
import { clientTicketsAPI, type Ticket } from "@/lib/client-tickets-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"

export default function ClientTicketsPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [formData, setFormData] = React.useState({
    supportType: 'GENERAL',
    subject: '',
    description: '',
    priority: 'NORMAL',
  })

  React.useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const response = await clientTicketsAPI.getAll({ limit: 100 })
      setTickets(response.data || [])
    } catch (error) {
      console.error('Error loading tickets:', error)
      toast.error('Errore nel caricamento dei ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.subject.trim()) {
      toast.error('Il titolo è obbligatorio')
      return
    }

    try {
      setSubmitting(true)
      await clientTicketsAPI.create({
        supportType: formData.supportType,
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority,
      })

      toast.success('Ticket creato con successo')
      setDialogOpen(false)
      setFormData({ supportType: 'GENERAL', subject: '', description: '', priority: 'NORMAL' })
      loadTickets()
    } catch (error: any) {
      console.error('Error creating ticket:', error)
      toast.error(error.message || 'Errore nella creazione del ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLOSED':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      case 'OPEN':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'IN_PROGRESS':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'OPEN': 'Aperto',
      'IN_PROGRESS': 'In Corso',
      'CLOSED': 'Chiuso'
    }
    return statusMap[status] || status
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'P2':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'P3':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'NORMAL':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'URGENT':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const translatePriority = (priority: string) => {
    const priorityMap: Record<string, string> = {
      'P1': 'Alta',
      'P2': 'Media',
      'P3': 'Bassa',
      'NORMAL': 'Normale',
      'HIGH': 'Alta',
      'URGENT': 'Urgente'
    }
    return priorityMap[priority] || priority
  }

  return (
    <ClientLayout
      title="Ticket di Supporto"
      description="Gestisci le tue richieste di supporto"
      headerAction={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateTicket}>
              <DialogHeader>
                <DialogTitle>Crea Nuovo Ticket</DialogTitle>
                <DialogDescription>
                  Descrivici il tuo problema o richiesta e ti risponderemo al più presto
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="supportType">Tipo di Supporto *</Label>
                  <Select
                    value={formData.supportType}
                    onValueChange={(value) => setFormData({ ...formData, supportType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">Generale</SelectItem>
                      <SelectItem value="TECHNICAL">Tecnico</SelectItem>
                      <SelectItem value="BILLING">Fatturazione</SelectItem>
                      <SelectItem value="FEATURE_REQUEST">Richiesta Funzionalità</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Titolo *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Breve descrizione del problema"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priorità</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="NORMAL">Normale</SelectItem>
                      <SelectItem value="LOW">Bassa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrizione *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrivi in dettaglio il tuo problema o richiesta..."
                    rows={4}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creazione...' : 'Crea Ticket'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="px-4 lg:px-6 space-y-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Caricamento...</p>
          </div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessun Ticket</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Non hai ancora creato alcun ticket di supporto
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crea il Tuo Primo Ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{ticket.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Creato il {format(new Date(ticket.createdAt), 'dd MMMM yyyy', { locale: it })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={getStatusColor(ticket.status)}>
                        {translateStatus(ticket.status)}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                        {translatePriority(ticket.priority)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {ticket.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {ticket.description}
                    </p>
                  </CardContent>
                )}
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {ticket.assignedUser && (
                        <div>
                          Assegnato a: <span className="font-medium">{ticket.assignedUser.firstName} {ticket.assignedUser.lastName}</span>
                        </div>
                      )}
                      {ticket.timeSpent !== null && ticket.timeSpent > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ticket.timeSpent}h spese
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/client/tickets/${ticket.id}`}>Visualizza</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  )
}
