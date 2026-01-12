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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { quotesAPI, Quote } from '@/lib/quotes-api'
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

const statusConfig = {
  DRAFT: { label: 'Bozza', variant: 'secondary' as const, icon: FileText },
  SENT: { label: 'Inviato', variant: 'default' as const, icon: Send },
  VIEWED: { label: 'Visualizzato', variant: 'outline' as const, icon: Eye },
  ACCEPTED: { label: 'Accettato', variant: 'default' as const, icon: CheckCircle, className: 'bg-green-500' },
  REJECTED: { label: 'Rifiutato', variant: 'destructive' as const, icon: XCircle },
  EXPIRED: { label: 'Scaduto', variant: 'secondary' as const, icon: AlertCircle }
}

export default function QuotesPage() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<number | null>(null)

  useEffect(() => {
    loadQuotes()
  }, [statusFilter])

  const loadQuotes = async () => {
    try {
      setLoading(true)
      const response = await quotesAPI.getAll({
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined
      })
      setQuotes(response.data)
    } catch (error) {
      console.error('Failed to load quotes:', error)
      toast.error('Errore nel caricamento dei preventivi')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadQuotes()
  }

  const handleDelete = async () => {
    if (!quoteToDelete) return

    try {
      await quotesAPI.delete(quoteToDelete)
      toast.success('Preventivo eliminato con successo')
      loadQuotes()
    } catch (error) {
      console.error('Failed to delete quote:', error)
      toast.error('Errore nell\'eliminazione del preventivo')
    } finally {
      setDeleteDialogOpen(false)
      setQuoteToDelete(null)
    }
  }

  const confirmDelete = (id: number) => {
    setQuoteToDelete(id)
    setDeleteDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const filteredQuotes = quotes.filter(quote =>
    quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <BaseLayout>
      <BaseLayout.Header>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Preventivi</h1>
            <p className='text-muted-foreground'>
              Gestisci i preventivi per i tuoi clienti
            </p>
          </div>
          <Button onClick={() => navigate('/quotes/create')}>
            <Plus className='mr-2 h-4 w-4' />
            Nuovo Preventivo
          </Button>
        </div>
      </BaseLayout.Header>

      <BaseLayout.Body>
        <Card>
          <CardHeader>
            <CardTitle>Lista Preventivi</CardTitle>
            <CardDescription>
              Visualizza e gestisci tutti i preventivi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className='mb-4 flex gap-4'>
              <div className='flex flex-1 gap-2'>
                <div className='relative flex-1'>
                  <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                  <Input
                    placeholder='Cerca per numero, titolo o cliente...'
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
                  <SelectItem value='DRAFT'>Bozza</SelectItem>
                  <SelectItem value='SENT'>Inviato</SelectItem>
                  <SelectItem value='VIEWED'>Visualizzato</SelectItem>
                  <SelectItem value='ACCEPTED'>Accettato</SelectItem>
                  <SelectItem value='REJECTED'>Rifiutato</SelectItem>
                  <SelectItem value='EXPIRED'>Scaduto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {loading ? (
              <div className='flex h-32 items-center justify-center'>
                <p className='text-muted-foreground'>Caricamento...</p>
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className='flex h-32 flex-col items-center justify-center gap-2'>
                <FileText className='h-8 w-8 text-muted-foreground' />
                <p className='text-muted-foreground'>Nessun preventivo trovato</p>
                <Button onClick={() => navigate('/quotes/create')} variant='outline' size='sm'>
                  <Plus className='mr-2 h-4 w-4' />
                  Crea il primo preventivo
                </Button>
              </div>
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Importo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Validità</TableHead>
                      <TableHead>Data Creazione</TableHead>
                      <TableHead className='text-right'>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => {
                      const status = statusConfig[quote.status]
                      const StatusIcon = status.icon
                      return (
                        <TableRow key={quote.id}>
                          <TableCell className='font-medium'>
                            {quote.quoteNumber}
                          </TableCell>
                          <TableCell>{quote.title}</TableCell>
                          <TableCell>{quote.contact.name}</TableCell>
                          <TableCell className='font-medium'>
                            {formatCurrency(quote.total)}
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
                            {formatDate(quote.validUntil)}
                          </TableCell>
                          <TableCell>
                            {formatDate(quote.createdAt)}
                          </TableCell>
                          <TableCell className='text-right'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon'>
                                  <MoreHorizontal className='h-4 w-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => navigate(`/quotes/${quote.id}`)}
                                >
                                  <Eye className='mr-2 h-4 w-4' />
                                  Visualizza
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => navigate(`/quotes/${quote.id}/edit`)}
                                >
                                  <Edit className='mr-2 h-4 w-4' />
                                  Modifica
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => confirmDelete(quote.id)}
                                  className='text-destructive'
                                >
                                  <Trash2 className='mr-2 h-4 w-4' />
                                  Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. Il preventivo verrà eliminato
                definitivamente dal sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </BaseLayout.Body>
    </BaseLayout>
  )
}
