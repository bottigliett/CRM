import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  MessageSquare,
  Send,
  Clock,
  ArrowLeft,
  Timer,
  CalendarDays,
  Paperclip,
} from "lucide-react"
import { clientTicketsAPI, type Ticket } from "@/lib/client-tickets-api"
import { clientAuthAPI } from "@/lib/client-auth-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"
import { FileUpload } from "@/components/ui/file-upload"
import { AttachmentList } from "@/components/ui/attachment-list"

interface TicketMessage {
  id: number;
  ticketId: number;
  userId: number | null;
  clientAccessId: number | null;
  message: string;
  createdAt: string;
  attachments?: {
    id: number;
    fileName: string;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
    isInternal: boolean;
    uploadedBy: string;
    uploadedAt: string;
  }[];
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  clientAccess?: {
    id: number;
    username: string;
  };
}

export default function ClientTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ticket, setTicket] = React.useState<Ticket | null>(null)
  const [messages, setMessages] = React.useState<TicketMessage[]>([])
  const [loading, setLoading] = React.useState(true)
  const [newMessage, setNewMessage] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [uploadFiles, setUploadFiles] = React.useState<any[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [showFileUpload, setShowFileUpload] = React.useState(false)
  const [clientData, setClientData] = React.useState<any>(null)
  const previousMessageCountRef = React.useRef<number>(0)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-refresh per rilevare nuovi messaggi
  React.useEffect(() => {
    if (!id || !ticket) return

    const interval = setInterval(async () => {
      try {
        const response = await clientTicketsAPI.getById(parseInt(id))
        const newMessages = response.data.messages || []

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
    }, 15000)

    return () => clearInterval(interval)
  }, [id, ticket])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ticketRes, clientRes] = await Promise.all([
        clientTicketsAPI.getById(parseInt(id!)),
        clientAuthAPI.getMe()
      ])
      setTicket(ticketRes.data)
      setClientData(clientRes.data)
      const loadedMessages = ticketRes.data.messages || []
      setMessages(loadedMessages)
      previousMessageCountRef.current = loadedMessages.length
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error(error.message || 'Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }

  const getPreviewUrl = (attachmentId: number) => {
    return clientTicketsAPI.getPreviewUrl(attachmentId)
  }

  const handleDownloadAttachment = (attachmentId: number) => {
    const url = clientTicketsAPI.downloadAttachment(attachmentId)
    window.open(url, '_blank')
  }

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && uploadFiles.length === 0) || !ticket) return

    try {
      setSending(true)
      let messageId: number | undefined

      if (newMessage.trim()) {
        const response = await clientTicketsAPI.addMessage(ticket.id, newMessage)
        messageId = response.data.id
        setNewMessage('')
      }

      if (uploadFiles.length > 0) {
        setUploading(true)
        await clientTicketsAPI.uploadAttachments(ticket.id, uploadFiles, messageId)
        setUploadFiles([])
        setShowFileUpload(false)
        setUploading(false)
      }

      toast.success('Messaggio inviato')
      loadData()
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.message || "Errore nell'invio del messaggio")
      setUploading(false)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
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
    const map: Record<string, string> = {
      'OPEN': 'Aperto',
      'IN_PROGRESS': 'In Corso',
      'CLOSED': 'Chiuso',
      'WAITING_CLIENT': 'In Attesa',
      'RESOLVED': 'Risolto'
    }
    return map[status] || status
  }

  const translateSupportType = (type: string) => {
    const map: Record<string, string> = {
      'TECHNICAL': 'Tecnico',
      'DESIGN': 'Design',
      'CONTENT': 'Contenuti',
      'BILLING': 'Fatturazione',
      'OTHER': 'Altro'
    }
    return map[type] || type
  }

  const formatTimeSpent = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins} min`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}min`
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

  const ticketHoursUsed = (ticket.timeSpentMinutes || 0) / 60
  const totalHoursIncluded = clientData?.supportHoursIncluded || 0
  const totalHoursUsed = clientData?.supportHoursUsed || 0
  const totalHoursRemaining = Math.max(0, totalHoursIncluded - totalHoursUsed)
  const hoursPercentage = totalHoursIncluded > 0 ? (totalHoursUsed / totalHoursIncluded) * 100 : 0

  return (
    <ClientLayout
      title={ticket.subject}
      description={`Ticket #${ticket.ticketNumber}`}
      headerAction={
        <Button variant="outline" onClick={() => navigate('/client/tickets')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna ai Ticket
        </Button>
      }
    >
      <div className="px-4 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Side - Ticket Info */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Dettagli Ticket</CardTitle>
                <Badge variant="outline" className={getStatusColor(ticket.status)}>
                  {translateStatus(ticket.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Titolo</p>
                  <p className="font-medium">{ticket.subject}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tipo Supporto</p>
                    <p className="font-medium">{translateSupportType(ticket.supportType)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Priorità</p>
                    <p className="font-medium">{ticket.priority}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Creato il</span>
                  <span className="font-medium">
                    {format(new Date(ticket.createdAt), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                  </span>
                </div>

                {ticket.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Descrizione</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                      {ticket.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Hours Info */}
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Ore di Supporto</span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {ticketHoursUsed.toFixed(1)}h
                    </p>
                    <p className="text-xs text-muted-foreground">Su questo ticket</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {totalHoursIncluded}h
                    </p>
                    <p className="text-xs text-muted-foreground">Totali incluse</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {totalHoursRemaining.toFixed(1)}h
                    </p>
                    <p className="text-xs text-muted-foreground">Rimanenti</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Utilizzo totale</span>
                    <span className="font-medium">{totalHoursUsed.toFixed(1)}h / {totalHoursIncluded}h</span>
                  </div>
                  <Progress value={hoursPercentage} className="h-2" />
                </div>
              </div>

              {/* Initial Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="border-t pt-6">
                  <p className="text-sm font-medium mb-3">Allegati iniziali</p>
                  <AttachmentList
                    attachments={ticket.attachments}
                    onDownload={handleDownloadAttachment}
                    getPreviewUrl={getPreviewUrl}
                    showDelete={false}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Side - Chat */}
          <Card className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <CardHeader className="border-b shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversazione
              </CardTitle>
              <CardDescription>
                {messages.length} {messages.length === 1 ? 'messaggio' : 'messaggi'}
              </CardDescription>
            </CardHeader>

            {/* Messages Area */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Nessun messaggio ancora. Inizia la conversazione!
                </div>
              ) : (
                messages.map((message) => {
                  const isFromClient = message.clientAccessId !== null
                  const sender = isFromClient
                    ? 'Tu'
                    : message.user
                    ? `${message.user.firstName} ${message.user.lastName}`
                    : 'Team'

                  // Calculate bubble width based on message length
                  const messageLength = message.message.length
                  const maxWidth = messageLength < 50 ? 'max-w-[60%]' : messageLength < 100 ? 'max-w-[70%]' : 'max-w-[85%]'

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromClient ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 ${maxWidth} ${isFromClient ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={isFromClient ? 'bg-primary text-primary-foreground' : ''}>
                            {sender.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col ${isFromClient ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{sender}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.createdAt), 'dd/MM HH:mm', { locale: it })}
                            </span>
                          </div>
                          <div
                            className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                              isFromClient
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted rounded-bl-md'
                            }`}
                          >
                            {message.message}
                          </div>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 w-full">
                              <AttachmentList
                                attachments={message.attachments}
                                onDownload={handleDownloadAttachment}
                                getPreviewUrl={getPreviewUrl}
                                showDelete={false}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Message Input */}
            {ticket.status !== 'CLOSED' ? (
              <div className="border-t p-4 shrink-0 space-y-3">
                {showFileUpload && (
                  <FileUpload
                    files={uploadFiles}
                    onFilesChange={setUploadFiles}
                    disabled={sending || uploading}
                  />
                )}
                <div className="flex gap-2 items-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setShowFileUpload(!showFileUpload)}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Scrivi un messaggio..."
                    className="min-h-[44px] max-h-[120px] resize-none"
                    rows={1}
                    disabled={sending || uploading}
                  />
                  <Button
                    size="icon"
                    className="shrink-0"
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && uploadFiles.length === 0) || sending || uploading}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Premi Invio per inviare, Shift+Invio per andare a capo
                </p>
              </div>
            ) : (
              <div className="border-t p-4 shrink-0 bg-muted/50">
                <p className="text-sm text-muted-foreground text-center">
                  Questo ticket è stato chiuso. Non è più possibile inviare messaggi.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ClientLayout>
  )
}
