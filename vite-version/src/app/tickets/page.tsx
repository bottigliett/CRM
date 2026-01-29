import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ticketsAPI } from '@/lib/tickets-api'
import type { Ticket } from '@/lib/tickets-api'
import {
  Search,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Circle,
  Timer,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

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
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    loadTickets()
  }, [statusFilter, priorityFilter])

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

  const openDetails = (ticketId: number) => {
    navigate(`/tickets/${ticketId}`)
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
    </BaseLayout>
  )
}
