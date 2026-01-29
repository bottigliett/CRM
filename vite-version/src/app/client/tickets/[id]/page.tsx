import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  MessageSquare,
  Send,
  Clock,
  User,
  ArrowLeft,
} from "lucide-react"
import { clientTicketsAPI, type Ticket } from "@/lib/client-tickets-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"

interface TicketMessage {
  id: number;
  ticketId: number;
  isClientMessage: boolean;
  message: string;
  createdAt: string;
}

export default function ClientTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ticket, setTicket] = React.useState<Ticket | null>(null)
  const [messages, setMessages] = React.useState<TicketMessage[]>([])
  const [loading, setLoading] = React.useState(true)
  const [newMessage, setNewMessage] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const previousMessageCountRef = React.useRef<number>(0)

  React.useEffect(() => {
    if (id) {
      loadTicketData()
    }
  }, [id])

  // Auto-refresh per rilevare nuovi messaggi
  React.useEffect(() => {
    if (!id || !ticket) return

    const interval = setInterval(async () => {
      try {
        const response = await clientTicketsAPI.getById(parseInt(id))
        const newMessages = response.data.messages || []

        // Controlla se ci sono nuovi messaggi
        if (previousMessageCountRef.current > 0 && newMessages.length > previousMessageCountRef.current) {
          const newMessageCount = newMessages.length - previousMessageCountRef.current
          toast.success(`${newMessageCount} ${newMessageCount === 1 ? 'nuovo messaggio' : 'nuovi messaggi'}`)
        }

        previousMessageCountRef.current = newMessages.length
        setTicket(response.data)
        setMessages(newMessages)
      } catch (error) {
        console.error('Error refreshing ticket:', error)
      }
    }, 15000) // Refresh ogni 15 secondi

    return () => clearInterval(interval)
  }, [id, ticket])

  const loadTicketData = async () => {
    try {
      setLoading(true)
      const response = await clientTicketsAPI.getById(parseInt(id!))
      setTicket(response.data)
      const loadedMessages = response.data.messages || []
      setMessages(loadedMessages)
      previousMessageCountRef.current = loadedMessages.length
    } catch (error: any) {
      console.error('Error loading ticket:', error)
      toast.error(error.message || 'Errore nel caricamento del ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket) return

    try {
      setSending(true)
      await clientTicketsAPI.addMessage(ticket.id, newMessage)
      setNewMessage('')
      toast.success('Messaggio inviato')
      loadTicketData()
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.message || "Errore nell'invio del messaggio")
    } finally {
      setSending(false)
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'P2':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'P3':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  if (loading) {
    return (
      <ClientLayout title="Dettaglio Ticket">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Caricamento...</p>
          </div>
        </div>
      </ClientLayout>
    )
  }

  if (!ticket) {
    return (
      <ClientLayout title="Ticket Non Trovato">
        <div className="px-4 lg:px-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ticket Non Trovato</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Il ticket richiesto non esiste o non è accessibile
                </p>
                <Button onClick={() => navigate('/client/tickets')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Torna ai Ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout
      title={ticket.title}
      description={`Ticket #${ticket.id}`}
      headerAction={
        <Button variant="outline" onClick={() => navigate('/client/tickets')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna ai Ticket
        </Button>
      }
    >
      <div className="px-4 lg:px-6 space-y-6">
        {/* Ticket Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl">{ticket.title}</CardTitle>
                <CardDescription className="mt-2">
                  Creato il {format(new Date(ticket.createdAt), 'dd MMMM yyyy \'alle\' HH:mm', { locale: it })}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={getStatusColor(ticket.status)}>
                  {ticket.status}
                </Badge>
                <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                  {ticket.priority}
                </Badge>
              </div>
            </div>
          </CardHeader>
          {ticket.description && (
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Descrizione</h4>
                  <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  {ticket.assignedUser && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Assegnato a:</span>
                      <span className="font-medium">
                        {ticket.assignedUser.firstName} {ticket.assignedUser.lastName}
                      </span>
                    </div>
                  )}
                  {ticket.timeSpent !== null && ticket.timeSpent > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tempo speso:</span>
                      <span className="font-medium">{ticket.timeSpent}h</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Conversazione</CardTitle>
            <CardDescription>Storico messaggi del ticket</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nessun messaggio ancora
                </div>
              ) : (
                messages.map((message) => {
                  const isFromClient = message.isFromClient
                  const sender = isFromClient
                    ? 'Tu'
                    : message.user
                    ? `${message.user.firstName} ${message.user.lastName}`
                    : 'Team'

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isFromClient ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback>
                          {sender.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 max-w-[80%] ${isFromClient ? 'items-end' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{sender}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.createdAt), 'dd MMM HH:mm', { locale: it })}
                          </span>
                        </div>
                        <div
                          className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${
                            isFromClient
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.message}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* New Message */}
        {ticket.status !== 'CLOSED' && (
          <Card>
            <CardHeader>
              <CardTitle>Aggiungi un Messaggio</CardTitle>
              <CardDescription>Invia una risposta o un aggiornamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Scrivi il tuo messaggio..."
                  rows={4}
                  disabled={sending}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? 'Invio...' : 'Invia Messaggio'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {ticket.status === 'CLOSED' && (
          <Card className="border-gray-500/50 bg-gray-500/5">
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground">
                Questo ticket è stato chiuso. Non è più possibile inviare messaggi.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  )
}
