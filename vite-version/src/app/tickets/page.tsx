import { useState, useEffect, useRef } from 'react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { ticketsAPI } from '@/lib/tickets-api'
import type { Ticket, TicketMessage } from '@/lib/tickets-api'
import {
  Search,
  MoreHorizontal,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Circle,
  Timer,
  Send,
  User,
  AlertTriangle,
  XCircle,
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

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('')
  const [timeToLog, setTimeToLog] = useState('')
  const [uploadFiles, setUploadFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const previousMessageCountRef = useRef<number>(0)

  useEffect(() => {
    loadTickets()
  }, [statusFilter, priorityFilter])

  // Auto-refresh per rilevare nuovi messaggi quando il dialog è aperto
  useEffect(() => {
    if (!detailsOpen || !selectedTicket) return

    const interval = setInterval(async () => {
      try {
        const response = await ticketsAPI.getById(selectedTicket.id)
        const newMessages = response.data.messages || []

        // Controlla se ci sono nuovi messaggi
        if (previousMessageCountRef.current > 0 && newMessages.length > previousMessageCountRef.current) {
          const newMessageCount = newMessages.length - previousMessageCountRef.current
          toast.success(`${newMessageCount} ${newMessageCount === 1 ? 'nuovo messaggio' : 'nuovi messaggi'}`)
        }

        previousMessageCountRef.current = newMessages.length
        setSelectedTicket(response.data)
      } catch (error) {
        console.error('Error refreshing ticket:', error)
      }
    }, 15000) // Refresh ogni 15 secondi

    return () => clearInterval(interval)
  }, [detailsOpen, selectedTicket])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const response = await ticketsAPI.getAll({
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined
      })
      setTickets(response.data)
    } catch (error) {
      console.error('Failed to load tickets:', error)
      toast.error('Errore nel caricamento dei ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadTickets()
  }

  const openDetails = async (ticketId: number) => {
    try {
      const response = await ticketsAPI.getById(ticketId)
      setSelectedTicket(response.data)
      setNewStatus(response.data.status)
      previousMessageCountRef.current = response.data.messages?.length || 0
      setDetailsOpen(true)
    } catch (error) {
      console.error('Failed to load ticket details:', error)
      toast.error('Errore nel caricamento dei dettagli')
    }
  }

  const handleAddMessage = async () => {
    if (!selectedTicket || (!newMessage.trim() && uploadFiles.length === 0)) {
      toast.error('Inserisci un messaggio o seleziona dei file')
      return
    }

    try {
      let messageId: number | undefined

      // Send message if there's text
      if (newMessage.trim()) {
        const response = await ticketsAPI.addMessage(selectedTicket.id, {
          message: newMessage,
          isInternal
        })
        messageId = response.data.id
      }

      // Upload files if present
      if (uploadFiles.length > 0) {
        setUploading(true)
        await ticketsAPI.uploadAttachments(
          selectedTicket.id,
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

      // Reload ticket details
      const response = await ticketsAPI.getById(selectedTicket.id)
      setSelectedTicket(response.data)
      loadTickets()
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

      // Reload ticket details
      if (selectedTicket) {
        const response = await ticketsAPI.getById(selectedTicket.id)
        setSelectedTicket(response.data)
      }
    } catch (error) {
      console.error('Failed to delete attachment:', error)
      toast.error('Errore nell\'eliminazione dell\'allegato')
    }
  }

  const handleStatusChange = async () => {
    if (!selectedTicket || !newStatus) return

    try {
      await ticketsAPI.update(selectedTicket.id, { status: newStatus as any })
      toast.success('Stato aggiornato')
      const response = await ticketsAPI.getById(selectedTicket.id)
      setSelectedTicket(response.data)
      loadTickets()
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Errore nell\'aggiornamento dello stato')
    }
  }

  const handleLogTime = async () => {
    if (!selectedTicket || !timeToLog) {
      toast.error('Inserisci i minuti da registrare')
      return
    }

    try {
      const minutes = parseInt(timeToLog)
      if (isNaN(minutes) || minutes <= 0) {
        toast.error('Inserisci un numero valido di minuti')
        return
      }

      await ticketsAPI.logTime(selectedTicket.id, minutes)
      toast.success(`Registrati ${minutes} minuti`)
      setTimeToLog('')
      const response = await ticketsAPI.getById(selectedTicket.id)
      setSelectedTicket(response.data)
      loadTickets()
    } catch (error) {
      console.error('Failed to log time:', error)
      toast.error('Errore nella registrazione del tempo')
    }
  }

  const handleCloseTicket = async () => {
    if (!selectedTicket) return

    try {
      await ticketsAPI.close(selectedTicket.id)
      toast.success('Ticket chiuso')
      setDetailsOpen(false)
      loadTickets()
    } catch (error) {
      console.error('Failed to close ticket:', error)
      toast.error('Errore nella chiusura del ticket')
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

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <BaseLayout
      title="Ticket di Supporto"
      description="Gestisci le richieste di supporto dei clienti"
    >
        <Card>
          <CardHeader>
            <CardTitle>Lista Ticket</CardTitle>
            <CardDescription>
              Visualizza e gestisci tutti i ticket di supporto
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className='mb-4 flex gap-4'>
              <div className='flex flex-1 gap-2'>
                <div className='relative flex-1'>
                  <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                  <Input
                    placeholder='Cerca per numero, oggetto o cliente...'
                    className='pl-8'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch}>Cerca</Button>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder='Stato' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tutti</SelectItem>
                  <SelectItem value='OPEN'>Aperto</SelectItem>
                  <SelectItem value='IN_PROGRESS'>In Lavorazione</SelectItem>
                  <SelectItem value='WAITING_CLIENT'>Attesa Cliente</SelectItem>
                  <SelectItem value='RESOLVED'>Risolto</SelectItem>
                  <SelectItem value='CLOSED'>Chiuso</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder='Priorità' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tutte</SelectItem>
                  <SelectItem value='LOW'>Bassa</SelectItem>
                  <SelectItem value='NORMAL'>Normale</SelectItem>
                  <SelectItem value='HIGH'>Alta</SelectItem>
                  <SelectItem value='URGENT'>Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {loading ? (
              <div className='flex h-32 items-center justify-center'>
                <p className='text-muted-foreground'>Caricamento...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className='flex h-32 flex-col items-center justify-center gap-2'>
                <MessageSquare className='h-8 w-8 text-muted-foreground' />
                <p className='text-muted-foreground'>Nessun ticket trovato</p>
              </div>
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Oggetto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Priorità</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead>Creato</TableHead>
                      <TableHead className='text-right'>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => {
                      const priority = priorityConfig[ticket.priority]
                      const status = statusConfig[ticket.status]
                      const supportType = supportTypeConfig[ticket.supportType]
                      const PriorityIcon = priority.icon
                      const StatusIcon = status.icon

                      return (
                        <TableRow key={ticket.id}>
                          <TableCell className='font-medium'>
                            {ticket.ticketNumber}
                          </TableCell>
                          <TableCell>{ticket.contact.name}</TableCell>
                          <TableCell className='max-w-[300px] truncate'>
                            {ticket.subject}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${supportType.color}`}>
                              {supportType.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={priority.variant}
                              className={priority.className}
                            >
                              <PriorityIcon className='mr-1 h-3 w-3' />
                              {priority.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={status.variant}
                              className={status.className}
                            >
                              <StatusIcon className='mr-1 h-3 w-3' />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className='text-sm text-muted-foreground'>
                              {ticketsAPI.formatTimeSpent(ticket.timeSpentMinutes)}
                            </span>
                          </TableCell>
                          <TableCell className='text-sm text-muted-foreground'>
                            {formatDate(ticket.createdAt)}
                          </TableCell>
                          <TableCell className='text-right'>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => openDetails(ticket.id)}
                            >
                              <Eye className='h-4 w-4' />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className='w-[95vw] max-w-[1600px] max-h-[90vh] overflow-y-auto'>
            {selectedTicket && (
              <>
                <DialogHeader>
                  <DialogTitle className='flex items-center gap-2'>
                    {selectedTicket.ticketNumber} - {selectedTicket.subject}
                  </DialogTitle>
                  <DialogDescription>
                    Cliente: {selectedTicket.contact.name}
                  </DialogDescription>
                </DialogHeader>

                <div className='space-y-4'>
                  {/* Ticket Info */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label>Tipo</Label>
                      <p className='text-sm'>
                        {supportTypeConfig[selectedTicket.supportType].label}
                      </p>
                    </div>
                    <div>
                      <Label>Priorità</Label>
                      <p className='text-sm'>
                        {priorityConfig[selectedTicket.priority].label}
                      </p>
                    </div>
                    <div>
                      <Label>Tempo Registrato</Label>
                      <p className='text-sm'>
                        {ticketsAPI.formatTimeSpent(selectedTicket.timeSpentMinutes)}
                      </p>
                    </div>
                    <div>
                      <Label>Creato il</Label>
                      <p className='text-sm'>{formatDate(selectedTicket.createdAt)}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Description */}
                  <div>
                    <Label>Descrizione</Label>
                    <p className='text-sm whitespace-pre-wrap mt-1'>
                      {selectedTicket.description}
                    </p>
                  </div>

                  <Separator />

                  {/* Messages */}
                  <div>
                    <Label className='mb-2 block'>Messaggi</Label>
                    <div className='space-y-2 max-h-[300px] overflow-y-auto'>
                      {selectedTicket.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-lg p-3 ${
                            message.isInternal
                              ? 'bg-yellow-50 border border-yellow-200'
                              : message.userId
                              ? 'bg-blue-50 border border-blue-200'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className='flex items-center justify-between mb-1'>
                            <span className='text-xs font-medium'>
                              {message.isInternal ? 'Nota Interna' : message.userId ? 'Admin' : 'Cliente'}
                            </span>
                            <span className='text-xs text-muted-foreground'>
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                          <p className='text-sm whitespace-pre-wrap'>{message.message}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className='mt-2'>
                              <AttachmentList
                                attachments={message.attachments}
                                onDownload={handleDownloadAttachment}
                                onDelete={handleDeleteAttachment}
                                showDelete={true}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Message */}
                  <div className='space-y-2'>
                    <Label>Nuovo Messaggio</Label>
                    <Textarea
                      placeholder='Scrivi un messaggio...'
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                    />
                    <FileUpload
                      files={uploadFiles}
                      onFilesChange={setUploadFiles}
                      disabled={uploading}
                    />
                    <div className='flex items-center gap-2'>
                      <label className='flex items-center gap-2 text-sm'>
                        <input
                          type='checkbox'
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className='rounded'
                        />
                        Nota interna (non visibile al cliente)
                      </label>
                      <Button onClick={handleAddMessage} size='sm' disabled={uploading}>
                        <Send className='mr-2 h-4 w-4' />
                        {uploading ? 'Caricamento...' : 'Invia'}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label>Cambia Stato</Label>
                      <div className='flex gap-2 mt-1'>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='OPEN'>Aperto</SelectItem>
                            <SelectItem value='IN_PROGRESS'>In Lavorazione</SelectItem>
                            <SelectItem value='WAITING_CLIENT'>Attesa Cliente</SelectItem>
                            <SelectItem value='RESOLVED'>Risolto</SelectItem>
                            <SelectItem value='CLOSED'>Chiuso</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={handleStatusChange} size='sm'>
                          Aggiorna
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Registra Tempo (minuti)</Label>
                      <div className='flex gap-2 mt-1'>
                        <Input
                          type='number'
                          placeholder='60'
                          value={timeToLog}
                          onChange={(e) => setTimeToLog(e.target.value)}
                        />
                        <Button onClick={handleLogTime} size='sm'>
                          <Timer className='mr-2 h-4 w-4' />
                          Log
                        </Button>
                      </div>
                    </div>
                  </div>

                  {selectedTicket.status !== 'CLOSED' && (
                    <Button
                      onClick={handleCloseTicket}
                      variant='outline'
                      className='w-full'
                    >
                      <CheckCircle className='mr-2 h-4 w-4' />
                      Chiudi Ticket
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
    </BaseLayout>
  )
}
