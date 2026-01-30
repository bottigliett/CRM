'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ticketsAPI } from '@/lib/tickets-api'
import type { Ticket } from '@/lib/tickets-api'
import {
  ArrowLeft,
  Send,
  CheckCircle,
  AlertCircle,
  Circle,
  Timer,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/ui/file-upload'
import { AttachmentList } from '@/components/ui/attachment-list'

const priorityConfig = {
  LOW: { label: 'Bassa', variant: 'outline' as const, icon: Circle },
  NORMAL: { label: 'Normale', variant: 'secondary' as const, icon: Circle },
  HIGH: { label: 'Alta', variant: 'default' as const, icon: AlertCircle, className: 'bg-orange-500' },
  URGENT: { label: 'Urgente', variant: 'destructive' as const, icon: AlertTriangle }
}

const statusConfig = {
  OPEN: { label: 'Aperto', variant: 'default' as const, icon: Circle, className: 'bg-blue-500' },
  IN_PROGRESS: { label: 'In Lavorazione', variant: 'default' as const, icon: Timer, className: 'bg-yellow-500' },
  WAITING_CLIENT: { label: 'Attesa Cliente', variant: 'outline' as const, icon: Clock },
  RESOLVED: { label: 'Risolto', variant: 'default' as const, icon: CheckCircle, className: 'bg-green-500' },
  CLOSED: { label: 'Chiuso', variant: 'secondary' as const, icon: XCircle }
}

const supportTypeConfig = {
  TECHNICAL: { label: 'Tecnico', color: 'bg-blue-100 text-blue-800' },
  DESIGN: { label: 'Design', color: 'bg-purple-100 text-purple-800' },
  CONTENT: { label: 'Contenuti', color: 'bg-green-100 text-green-800' },
  BILLING: { label: 'Fatturazione', color: 'bg-yellow-100 text-yellow-800' },
  OTHER: { label: 'Altro', color: 'bg-gray-100 text-gray-800' }
}

export default function TicketDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const ticketId = parseInt(params.id as string)

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('')
  const [timeToLog, setTimeToLog] = useState('')
  const [uploadFiles, setUploadFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closingNotes, setClosingNotes] = useState('')
  const [closing, setClosing] = useState(false)
  const previousMessageCountRef = useRef<number>(0)

  const loadTicket = async () => {
    try {
      setLoading(true)
      const response = await ticketsAPI.getById(ticketId)
      setTicket(response.data)
      setNewStatus(response.data.status)
      previousMessageCountRef.current = response.data.messages?.length || 0
    } catch (error) {
      console.error('Failed to load ticket:', error)
      toast.error('Errore nel caricamento del ticket')
      navigate('/tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTicket()
  }, [ticketId])

  // Auto-refresh per rilevare nuovi messaggi
  useEffect(() => {
    if (!ticket) return

    const interval = setInterval(async () => {
      try {
        const response = await ticketsAPI.getById(ticket.id)
        const newMessages = response.data.messages || []

        // Controlla se ci sono nuovi messaggi
        if (previousMessageCountRef.current > 0 && newMessages.length > previousMessageCountRef.current) {
          const newMessageCount = newMessages.length - previousMessageCountRef.current
          toast.success(`${newMessageCount} ${newMessageCount === 1 ? 'nuovo messaggio' : 'nuovi messaggi'}`)
        }

        previousMessageCountRef.current = newMessages.length
        setTicket(response.data)
      } catch (error) {
        console.error('Error refreshing ticket:', error)
      }
    }, 15000) // Refresh ogni 15 secondi

    return () => clearInterval(interval)
  }, [ticket])

  const handleAddMessage = async () => {
    if (!ticket || (!newMessage.trim() && uploadFiles.length === 0)) {
      toast.error('Inserisci un messaggio o seleziona dei file')
      return
    }

    try {
      let messageId: number | undefined

      // Send message if there's text
      if (newMessage.trim()) {
        const response = await ticketsAPI.addMessage(ticket.id, {
          message: newMessage,
          isInternal
        })
        messageId = response.data.id
      }

      // Upload files if present
      if (uploadFiles.length > 0) {
        setUploading(true)
        await ticketsAPI.uploadAttachments(
          ticket.id,
          uploadFiles,
          isInternal,
          messageId
        )
        setUploadFiles([])
      }

      toast.success('Messaggio aggiunto')
      setNewMessage('')
      setIsInternal(false)
      setUploading(false)

      // Reload ticket
      loadTicket()
    } catch (error) {
      console.error('Failed to add message:', error)
      toast.error('Errore nell\'aggiunta del messaggio')
      setUploading(false)
    }
  }

  const handleDownloadAttachment = (attachmentId: number) => {
    const url = ticketsAPI.downloadAttachment(attachmentId)
    window.open(url, '_blank')
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('Eliminare questo allegato?')) return

    try {
      await ticketsAPI.deleteAttachment(attachmentId)
      toast.success('Allegato eliminato')
      loadTicket()
    } catch (error) {
      console.error('Failed to delete attachment:', error)
      toast.error('Errore nell\'eliminazione dell\'allegato')
    }
  }

  const handleStatusChange = async () => {
    if (!ticket || !newStatus) return

    try {
      await ticketsAPI.update(ticket.id, { status: newStatus as any })
      toast.success('Stato aggiornato')
      loadTicket()
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Errore nell\'aggiornamento dello stato')
    }
  }

  const handleLogTime = async () => {
    if (!ticket || !timeToLog) {
      toast.error('Inserisci i minuti da registrare')
      return
    }

    try {
      const minutes = parseInt(timeToLog)
      if (isNaN(minutes) || minutes <= 0) {
        toast.error('Inserisci un numero valido di minuti')
        return
      }

      await ticketsAPI.logTime(ticket.id, minutes)
      toast.success(`Registrati ${minutes} minuti`)
      setTimeToLog('')
      loadTicket()
    } catch (error) {
      console.error('Failed to log time:', error)
      toast.error('Errore nella registrazione del tempo')
    }
  }

  const handleCloseTicket = async () => {
    if (!ticket) return

    try {
      setClosing(true)
      await ticketsAPI.close(ticket.id, closingNotes)
      toast.success('Ticket chiuso e email inviata al cliente')
      setCloseDialogOpen(false)
      setClosingNotes('')
      navigate('/tickets')
    } catch (error) {
      console.error('Failed to close ticket:', error)
      toast.error('Errore nella chiusura del ticket')
    } finally {
      setClosing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading || !ticket) {
    return (
      <BaseLayout>
        <div className="flex h-full items-center justify-center">
          <p>Caricamento...</p>
        </div>
      </BaseLayout>
    )
  }

  const priority = priorityConfig[ticket.priority]
  const status = statusConfig[ticket.status]
  const supportType = supportTypeConfig[ticket.supportType]
  const PriorityIcon = priority.icon
  const StatusIcon = status.icon

  return (
    <BaseLayout>
      <div className="flex h-full flex-col gap-6 p-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/tickets')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {ticket.ticketNumber} - {ticket.subject}
                </h1>
                <Badge variant={status.variant} className={status.className}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Cliente: {ticket.contact.name}
              </p>
            </div>
          </div>
        </div>

        {/* Ticket Info Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${supportType.color}`}>
                {supportType.label}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Priorità</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={priority.variant} className={priority.className}>
                <PriorityIcon className="mr-1 h-3 w-3" />
                {priority.label}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Registrato</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ticketsAPI.formatTimeSpent(ticket.timeSpentMinutes)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Creato il</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm">{formatDate(ticket.createdAt)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Descrizione</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Messaggi</CardTitle>
            <CardDescription>
              Conversazione con il cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto mb-4">
              {/* Allegati del ticket (caricati alla creazione) */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="rounded-lg p-4 bg-gray-50 border border-gray-200 mb-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Allegati iniziali</div>
                  <AttachmentList
                    attachments={ticket.attachments}
                    onDownload={handleDownloadAttachment}
                    onDelete={handleDeleteAttachment}
                    showDelete={true}
                  />
                </div>
              )}

              {ticket.messages.map((message) => {
                // Determina il nome di chi ha scritto il messaggio
                let senderName = '';
                if (message.userId && message.user) {
                  senderName = `${message.user.firstName} ${message.user.lastName}`;
                } else if (message.clientAccessId && message.clientAccess) {
                  senderName = message.clientAccess.contact.name;
                }

                return (
                  <div
                    key={message.id}
                    className={`rounded-lg p-4 ${
                      message.isInternal
                        ? 'bg-yellow-50 border border-yellow-200'
                        : message.userId
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">
                        {message.isInternal
                          ? `Nota Interna - ${senderName}`
                          : message.userId
                          ? `Admin - ${senderName}`
                          : `Cliente - ${senderName}`
                        }
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3">
                        <AttachmentList
                          attachments={message.attachments}
                          onDownload={handleDownloadAttachment}
                          onDelete={handleDeleteAttachment}
                          showDelete={true}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Separator className="my-4" />

            {/* Add Message Form */}
            <div className="space-y-3">
              <Label>Nuovo Messaggio</Label>
              <Textarea
                placeholder="Scrivi un messaggio..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
              />
              <FileUpload
                files={uploadFiles}
                onFilesChange={setUploadFiles}
                disabled={uploading}
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded"
                  />
                  Nota interna (non visibile al cliente)
                </label>
                <Button onClick={handleAddMessage} size="sm" disabled={uploading}>
                  <Send className="mr-2 h-4 w-4" />
                  {uploading ? 'Caricamento...' : 'Invia'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Cambia Stato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Aperto</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Lavorazione</SelectItem>
                    <SelectItem value="WAITING_CLIENT">Attesa Cliente</SelectItem>
                    <SelectItem value="RESOLVED">Risolto</SelectItem>
                    <SelectItem value="CLOSED">Chiuso</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleStatusChange} size="sm">
                  Aggiorna
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registra Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Minuti..."
                  value={timeToLog}
                  onChange={(e) => setTimeToLog(e.target.value)}
                />
                <Button onClick={handleLogTime} size="sm">
                  <Timer className="mr-2 h-4 w-4" />
                  Log
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chiudi Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.status !== 'CLOSED' ? (
                <Button
                  onClick={() => setCloseDialogOpen(true)}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Chiudi Ticket
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Ticket già chiuso</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dialog chiusura ticket */}
        <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Chiudi Ticket</DialogTitle>
              <DialogDescription>
                Inserisci le note di chiusura che verranno inviate al cliente via email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="closingNotes">Note di chiusura *</Label>
                <Textarea
                  id="closingNotes"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Descrivi la risoluzione del problema..."
                  rows={4}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCloseDialogOpen(false)
                  setClosingNotes('')
                }}
                disabled={closing}
              >
                Annulla
              </Button>
              <Button
                onClick={handleCloseTicket}
                disabled={closing || !closingNotes.trim()}
              >
                {closing ? 'Chiusura...' : 'Chiudi e Invia Email'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BaseLayout>
  )
}
