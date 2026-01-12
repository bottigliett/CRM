import * as React from "react"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Clock,
  FileText,
  Receipt,
  CheckSquare,
  Calendar,
  MessageSquare,
  FolderOpen,
  ExternalLink,
  AlertCircle,
  TrendingUp,
  Euro,
  Timer,
} from "lucide-react"
import { Link } from "react-router-dom"
import { clientAuthAPI } from "@/lib/client-auth-api"
import { invoicesAPI, type Invoice } from "@/lib/invoices-api"
import { tasksAPI, type Task } from "@/lib/tasks-api"
import { eventsAPI, type Event } from "@/lib/events-api"
import { ticketsAPI, type Ticket } from "@/lib/tickets-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export default function ClientDashboardPage() {
  const [clientData, setClientData] = React.useState<any>(null)
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [events, setEvents] = React.useState<Event[]>([])
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load client data
      const clientResponse = await clientAuthAPI.getMe()
      setClientData(clientResponse.data)

      const contactId = clientResponse.data.contact.id

      // Load recent data in parallel
      const [invoicesRes, tasksRes, eventsRes, ticketsRes] = await Promise.all([
        invoicesAPI.getInvoices({ limit: 5 }).catch(() => ({ data: { invoices: [] } })),
        tasksAPI.getTasks({ contactId, visibleToClient: true, limit: 5 }).catch(() => ({ data: { tasks: [] } })),
        eventsAPI.getEvents({ contactId, limit: 5 }).catch(() => ({ data: { events: [] } })),
        ticketsAPI.getAll({ limit: 5 }).catch(() => ({ data: [] })),
      ])

      setInvoices(invoicesRes.data.invoices || [])
      setTasks(tasksRes.data.tasks || [])
      setEvents(eventsRes.data.events || [])
      setTickets(ticketsRes.data || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const supportHoursPercentage = clientData
    ? (clientData.supportHoursUsed / clientData.supportHoursIncluded) * 100
    : 0

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'PAID':
      case 'CLOSED':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'IN_PROGRESS':
      case 'ISSUED':
      case 'OPEN':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'TODO':
      case 'DRAFT':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      case 'PENDING':
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
      <ClientLayout title="Dashboard" description="Panoramica del tuo progetto">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Caricamento...</p>
          </div>
        </div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout
      title="Dashboard"
      description={clientData?.projectName || "Panoramica del tuo progetto"}
    >
      <div className="px-4 lg:px-6 space-y-6">
        {/* Project Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Support Hours */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ore di Supporto</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clientData?.supportHoursUsed || 0} / {clientData?.supportHoursIncluded || 0}
              </div>
              <Progress value={supportHoursPercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {clientData?.supportHoursIncluded - clientData?.supportHoursUsed} ore rimanenti
              </p>
            </CardContent>
          </Card>

          {/* Monthly Fee */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Canone Mensile</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{clientData?.monthlyFee || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">al mese</p>
            </CardContent>
          </Card>

          {/* Active Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Task Attivi</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tasks.filter(t => t.status !== 'COMPLETED').length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {tasks.filter(t => t.status === 'COMPLETED').length} completati
              </p>
            </CardContent>
          </Card>

          {/* Open Tickets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Aperti</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {tickets.filter(t => t.status === 'CLOSED').length} chiusi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Project Info */}
        {clientData?.projectDescription && (
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Progetto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Descrizione</p>
                  <p className="text-sm">{clientData.projectDescription}</p>
                </div>
                {(clientData.projectStartDate || clientData.projectEndDate) && (
                  <div className="flex gap-6">
                    {clientData.projectStartDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Data Inizio</p>
                        <p className="text-sm">
                          {format(new Date(clientData.projectStartDate), 'dd MMMM yyyy', { locale: it })}
                        </p>
                      </div>
                    )}
                    {clientData.projectEndDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Data Fine Prevista</p>
                        <p className="text-sm">
                          {format(new Date(clientData.projectEndDate), 'dd MMMM yyyy', { locale: it })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {clientData.projectBudget && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Budget</p>
                    <p className="text-sm">€{clientData.projectBudget.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Documents Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Documenti
                </CardTitle>
                <CardDescription>Accedi ai tuoi file e cartelle</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/client/documents">Vedi Tutti</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientData?.driveFolderLink && (
                  <a
                    href={clientData.driveFolderLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Cartella Principale</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                )}
                {clientData?.documentsFolder && (
                  <a
                    href={clientData.documentsFolder}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Documenti</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                )}
                {clientData?.assetsFolder && (
                  <a
                    href={clientData.assetsFolder}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Assets</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                )}
                {clientData?.invoiceFolder && (
                  <a
                    href={clientData.invoiceFolder}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Fatture</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                )}
                {!clientData?.driveFolderLink && !clientData?.documentsFolder && !clientData?.assetsFolder && !clientData?.invoiceFolder && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Nessuna cartella configurata
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Fatture Recenti
                </CardTitle>
                <CardDescription>Le tue ultime fatture</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/client/invoices">Vedi Tutte</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{invoice.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">€{invoice.total.toFixed(2)}</p>
                      <Badge variant="outline" className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {invoices.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Nessuna fattura disponibile
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks and Events */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Active Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Task Assegnati
                </CardTitle>
                <CardDescription>I tuoi task in corso</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/client/tasks">Vedi Tutti</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getStatusColor(task.status)} size="sm">
                          {task.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(task.priority)} size="sm">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(task.deadline), 'dd MMM', { locale: it })}
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Nessun task assegnato
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Prossimi Eventi
                </CardTitle>
                <CardDescription>La tua agenda</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/client/calendar">Vedi Agenda</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="flex flex-col items-center justify-center min-w-[48px] pt-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {format(new Date(event.startDateTime), 'MMM', { locale: it })}
                      </span>
                      <span className="text-lg font-bold">
                        {format(new Date(event.startDateTime), 'd')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.startDateTime), 'HH:mm', { locale: it })} - {format(new Date(event.endDateTime), 'HH:mm', { locale: it })}
                      </p>
                      {event.location && (
                        <p className="text-xs text-muted-foreground mt-1">{event.location}</p>
                      )}
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Nessun evento in programma
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Ticket di Supporto
              </CardTitle>
              <CardDescription>I tuoi ticket aperti e recenti</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/client/tickets">Vedi Tutti</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tickets.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{ticket.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={getStatusColor(ticket.status)} size="sm">
                        {ticket.status}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(ticket.priority)} size="sm">
                        {ticket.priority}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/client/tickets/${ticket.id}`}>Apri</Link>
                  </Button>
                </div>
              ))}
              {tickets.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Nessun ticket aperto
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  )
}
