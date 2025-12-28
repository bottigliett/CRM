import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CheckSquare,
  Clock,
  Calendar as CalendarIcon,
  ArrowUpCircle,
  ArrowDownCircle,
  Euro,
} from "lucide-react"
import { tasksAPI, type Task } from "@/lib/tasks-api"
import { eventsAPI, type Event } from "@/lib/events-api"
import { api, type User } from "@/lib/api"
import { transactionsAPI, type Transaction } from "@/lib/finance-api"
import { contactsAPI } from "@/lib/contacts-api"
import { leadsAPI } from "@/lib/leads-api"
import { format, addDays, endOfDay, startOfYear, endOfYear, startOfMonth, endOfMonth } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from "recharts"
import { usePinProtection } from "@/contexts/pin-protection-context"
import { PinUnlockDialog } from "@/components/pin-unlock-dialog"
import { ProtectedData } from "@/components/protected-data"


function getPriorityColor(priority: string) {
  switch (priority) {
    case "P1":
      return "destructive"
    case "P2":
      return "default"
    case "P3":
      return "secondary"
    default:
      return "secondary"
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return "default"
    case "PENDING":
      return "secondary"
    case "TODO":
      return "outline"
    case "COMPLETED":
      return "outline"
    default:
      return "outline"
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return "In corso"
    case "PENDING":
      return "In attesa"
    case "TODO":
      return "Da fare"
    case "COMPLETED":
      return "Completato"
    default:
      return status
  }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { isProtectionEnabled, isUnlocked } = usePinProtection()
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [, setAllTasks] = useState<Task[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [annualRevenue, setAnnualRevenue] = useState(0)
  const [annualExpenses, setAnnualExpenses] = useState(0)
  const [annualGoal] = useState(50000)
  const [totalBalance, setTotalBalance] = useState(0)
  const [bestMonth, setBestMonth] = useState({ month: '', amount: 0 })
  const [cashflowData, setCashflowData] = useState<Array<{ month: string; entrate: number; uscite: number }>>([])
  const [, setIsLoadingUser] = useState(true)
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [isLoadingFinance, setIsLoadingFinance] = useState(true)
  const [activeClientsCount, setActiveClientsCount] = useState(0)
  const [totalContactsCount, setTotalContactsCount] = useState(0)
  const [leadboardValue, setLeadboardValue] = useState(0)

  // Check if user has Finance Tracker access
  // SUPER_ADMIN always has access, or check permissions for ADMIN
  const hasFinanceAccess =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.permissions?.some(p =>
      p.moduleName === 'FINANCE_TRACKER' && p.hasAccess
    ) || false

  // Check if user has Leads access
  const hasLeadsAccess =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.permissions?.some(p =>
      p.moduleName === 'LEADS' && p.hasAccess
    ) || false

  // Check if user has Contacts/Anagrafica access
  const hasContactsAccess =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.permissions?.some(p =>
      p.moduleName === 'CONTACTS' && p.hasAccess
    ) || false

  // Calculate task statistics (currently unused but available for future use)

  // Check if data should be protected
  const shouldProtectData = isProtectionEnabled && !isUnlocked

  // Load current user
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        setIsLoadingUser(true)
        const user = await api.getCurrentUser()
        setCurrentUser(user)
      } catch (error) {
        console.error('Failed to load user:', error)
        toast.error('Errore nel caricamento dei dati utente')
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadCurrentUser()
  }, [])

  // Load recent tasks (all non-completed tasks)
  useEffect(() => {
    async function loadRecentTasks() {
      try {
        setIsLoadingTasks(true)
        const response = await tasksAPI.getTasks({
          isArchived: false,
          limit: 1000, // Get all for statistics
        })

        if (response.success) {
          // Store all tasks for statistics
          setAllTasks(response.data.tasks)

          // Filter out completed tasks and sort by deadline
          const activeTasksFiltered = response.data.tasks
            .filter(task => task.status !== 'COMPLETED')
            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
            .slice(0, 3) // Take top 3

          setRecentTasks(activeTasksFiltered)
        }
      } catch (error) {
        console.error('Failed to load tasks:', error)
      } finally {
        setIsLoadingTasks(false)
      }
    }

    loadRecentTasks()
  }, [])

  // Load upcoming events for next 7 days
  useEffect(() => {
    async function loadUpcomingEvents() {
      try {
        setIsLoadingEvents(true)
        const now = new Date()
        const nextWeek = endOfDay(addDays(now, 7))

        const response = await eventsAPI.getEvents({
          startDate: format(now, 'yyyy-MM-dd HH:mm:ss'),
          endDate: format(nextWeek, 'yyyy-MM-dd'),
          limit: 100,
        })

        if (response.success) {
          // Filter events that haven't started yet or are ongoing, then sort and take top 3
          const upcomingEventsFiltered = response.data.events
            .filter(event => new Date(event.endDateTime) >= now)
            .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
            .slice(0, 3)

          setUpcomingEvents(upcomingEventsFiltered)
        }
      } catch (error) {
        console.error('Failed to load events:', error)
      } finally {
        setIsLoadingEvents(false)
      }
    }

    loadUpcomingEvents()
  }, [])

  // Load financial data (only if user has access)
  useEffect(() => {
    async function loadFinancialData() {
      if (!hasFinanceAccess) {
        setIsLoadingFinance(false)
        return
      }

      try {
        setIsLoadingFinance(true)
        const now = new Date()
        const yearStart = startOfYear(now)
        const yearEnd = endOfYear(now)

        // Load annual stats
        const annualStats = await transactionsAPI.getTransactionStats({
          startDate: format(yearStart, 'yyyy-MM-dd'),
          endDate: format(yearEnd, 'yyyy-MM-dd'),
        })

        if (annualStats.success) {
          setAnnualRevenue(annualStats.data.summary.income)
          setAnnualExpenses(annualStats.data.summary.expenses)
        }

        // Load cashflow data for last 6 months and find best month
        const cashflowDataTemp: Array<{ month: string; entrate: number; uscite: number }> = []
        const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
        let maxIncome = 0
        let maxIncomeMonth = ''

        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthStartDate = startOfMonth(monthDate)
          const monthEndDate = endOfMonth(monthDate)

          const stats = await transactionsAPI.getTransactionStats({
            startDate: format(monthStartDate, 'yyyy-MM-dd'),
            endDate: format(monthEndDate, 'yyyy-MM-dd'),
          })

          if (stats.success) {
            const income = stats.data.summary.income
            cashflowDataTemp.push({
              month: monthNames[monthDate.getMonth()],
              entrate: income,
              uscite: stats.data.summary.expenses,
            })

            // Track best month
            if (income > maxIncome) {
              maxIncome = income
              maxIncomeMonth = monthNames[monthDate.getMonth()]
            }
          }
        }

        setCashflowData(cashflowDataTemp)
        setBestMonth({ month: maxIncomeMonth, amount: maxIncome })

        // Calculate total balance (all-time income - expenses)
        const allTimeStats = await transactionsAPI.getTransactionStats({})
        if (allTimeStats.success) {
          setTotalBalance(allTimeStats.data.summary.balance)
        }

        // Load recent transactions
        const transactionsResponse = await transactionsAPI.getTransactions({
          page: 1,
          limit: 5,
          sortBy: 'date',
          sortOrder: 'desc',
        })

        if (transactionsResponse.success) {
          setRecentTransactions(transactionsResponse.data.transactions)
        }
      } catch (error) {
        console.error('Failed to load financial data:', error)
      } finally {
        setIsLoadingFinance(false)
      }
    }

    loadFinancialData()
  }, [hasFinanceAccess])

  // Load contacts statistics
  useEffect(() => {
    async function loadContactsStats() {
      if (!hasContactsAccess) return

      try {
        // Get active clients
        const clientsResponse = await contactsAPI.getContacts({
          type: 'CLIENT',
          limit: 1000,
        })

        if (clientsResponse.success) {
          setActiveClientsCount(clientsResponse.data.pagination.total)
        }

        // Get total contacts
        const allContactsResponse = await contactsAPI.getContacts({
          limit: 1000,
        })

        if (allContactsResponse.success) {
          setTotalContactsCount(allContactsResponse.data.pagination.total)
        }
      } catch (error) {
        console.error('Failed to load contacts stats:', error)
      }
    }

    loadContactsStats()
  }, [hasContactsAccess])

  // Load leads statistics
  useEffect(() => {
    async function loadLeadsStats() {
      if (!hasLeadsAccess) return

      try {
        const leadsResponse = await leadsAPI.getLeads()

        if (leadsResponse.success) {
          // Calculate total leadboard value
          let totalValue = 0
          Object.values(leadsResponse.data.leads).forEach(stageLeads => {
            stageLeads.forEach(lead => {
              if (lead.funnelValue) {
                totalValue += lead.funnelValue
              }
            })
          })
          setLeadboardValue(totalValue)
        }
      } catch (error) {
        console.error('Failed to load leads stats:', error)
      }
    }

    loadLeadsStats()
  }, [hasLeadsAccess])

  const revenueProgress = (annualRevenue / annualGoal) * 100

  // Calculate financial metrics
  const currentMonth = new Date().getMonth() + 1 // Current month number (1-12)
  const averageMonthlyExpenses = currentMonth > 0 ? annualExpenses / currentMonth : 0
  const operatingMargin = annualRevenue > 0 ? ((annualRevenue - annualExpenses) / annualRevenue) * 100 : 0
  const netProfit = annualRevenue - annualExpenses

  const pageContent = (
    <div className="px-4 lg:px-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Benvenuto, {currentUser?.firstName || currentUser?.username || 'Utente'}
          </h2>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("it-IT", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Financial Stats - Only show if user has access */}
      {hasFinanceAccess && (
        <div className="grid gap-6 md:grid-cols-2 relative">
          {/* Cat GIF positioned absolutely */}
          <div className="absolute -top-20 right-0 w-20 h-20 z-10 hidden md:block">
            <img src="/cat_idle.gif" alt="" className="w-full h-full object-contain" />
          </div>

          {/* Annual Revenue Card */}
          <Card>
            {shouldProtectData ? (
              <ProtectedData onUnlock={() => setPinDialogOpen(true)} />
            ) : (
              <>
                <CardHeader>
                  <CardDescription>Ricavi Annuali 2025</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2 mt-2">
                    <Euro className="h-6 w-6" />
                    {annualRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Obiettivo con Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Obiettivo: €{annualGoal.toLocaleString('it-IT')}
                      </span>
                      <span className="font-semibold">{revenueProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={revenueProgress} className="h-2" />
                  </div>

                  {/* Metriche Principali */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Utile Netto</p>
                      <p className="text-sm font-semibold">
                        €{netProfit.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Margine</p>
                      <p className="text-sm font-semibold">
                        {operatingMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Dettagli Secondari */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    {bestMonth.month && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Miglior Mese</p>
                        <p className="text-sm font-semibold">
                          {bestMonth.month} - €{bestMonth.amount.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Media Spese/Mese</p>
                      <p className="text-sm font-semibold">
                        €{averageMonthlyExpenses.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
          </Card>

          {/* Cashflow Card */}
          <Card>
            {shouldProtectData ? (
              <ProtectedData onUnlock={() => setPinDialogOpen(true)} />
            ) : (
              <>
                <CardHeader>
                  <CardDescription>Disponibilità sul Conto</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2 mt-2">
                    <Euro className="h-6 w-6" />
                    {totalBalance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Metriche Principali */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ricavi Annuali</p>
                      <p className="text-xl font-bold text-green-600">
                        +€{annualRevenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Spese Annuali</p>
                      <p className="text-xl font-bold text-red-600">
                        -€{annualExpenses.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  {/* Cashflow Chart */}
                  {cashflowData.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-3">Andamento ultimi 6 mesi</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={cashflowData} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                            tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: '12px' }}
                            iconType="line"
                          />
                          <Line
                            type="monotone"
                            dataKey="entrate"
                            stroke="#22c55e"
                            strokeWidth={2}
                            name="Entrate"
                            dot={{ fill: '#22c55e', r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="uscite"
                            stroke="#ef4444"
                            strokeWidth={2}
                            name="Uscite"
                            dot={{ fill: '#ef4444', r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Tasks & Agenda Section */}
      <div className="grid gap-6 md:grid-cols-2 relative">
        {/* Cat GIF for users without finance access - positioned above Agenda */}
        {!hasFinanceAccess && (
          <div className="absolute -top-20 right-0 w-20 h-20 z-10 hidden md:block">
            <img src="/cat_idle.gif" alt="" className="w-full h-full object-contain" />
          </div>
        )}

        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Task Recenti
                </CardTitle>
                <CardDescription>Task assegnati a te</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/tasks')}
              >
                Vedi tutti
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTasks ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Caricamento...</p>
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Nessun task attivo</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTasks.map((task) => {
                  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'COMPLETED'

                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate('/tasks')}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {task.category && (
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: task.category.color }}
                                />
                              )}
                              <p className="font-medium text-sm">{task.title}</p>
                            </div>
                            {task.contact && (
                              <p className="text-xs text-muted-foreground mt-1">{task.contact.name}</p>
                            )}
                          </div>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.deadline), "dd MMM yyyy", { locale: it })}
                          </div>
                          <Badge variant={getStatusColor(task.status)} className="text-xs">
                            {getStatusLabel(task.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Prossimi Eventi
                </CardTitle>
                <CardDescription>Agenda della settimana</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/calendar')}
              >
                Apri Agenda
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Caricamento...</p>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Nessun evento in programma</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/calendar')}
                  >
                    <div
                      className="w-1 h-full rounded-full shrink-0"
                      style={{ backgroundColor: event.color || event.category?.color || '#3b82f6' }}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm">{event.title}</p>
                      {event.contact && (
                        <p className="text-xs text-muted-foreground">{event.contact.name}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(event.startDateTime), "dd MMM yyyy", { locale: it })}
                        </span>
                        {!event.isAllDay && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(event.startDateTime), "HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                    {event.category && (
                      <Badge variant="outline" className="text-xs">
                        {event.category.name}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions - Only show if user has access */}
      {hasFinanceAccess && (
        <Card>
          {shouldProtectData ? (
            <ProtectedData onUnlock={() => setPinDialogOpen(true)} />
          ) : (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Transazioni Recenti</CardTitle>
                    <CardDescription>Ultimi movimenti finanziari</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/finance')}>
                    Vedi tutte
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingFinance ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-muted-foreground">Caricamento...</p>
                  </div>
                ) : recentTransactions.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-muted-foreground">Nessuna transazione</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Tipo</TableHead>
                          <TableHead>Descrizione</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Importo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {transaction.type === "INCOME" ? (
                                <Badge className="bg-green-500 hover:bg-green-600">
                                  <ArrowUpCircle className="mr-1 h-3 w-3" />
                                  Entrata
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <ArrowDownCircle className="mr-1 h-3 w-3" />
                                  Uscita
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {transaction.description || 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(transaction.date), "dd MMM yyyy", { locale: it })}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <span
                                className={
                                  transaction.type === "INCOME"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {transaction.type === "INCOME" ? "+" : "-"}€{transaction.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      )}

      {/* Stats Box - Come nel CRM originale */}
      <div className="grid gap-4 md:grid-cols-3">
        {hasContactsAccess && (
          <Card>
            {shouldProtectData ? (
              <ProtectedData onUnlock={() => setPinDialogOpen(true)} compact noPadding />
            ) : (
              <>
                <CardHeader className="pb-3">
                  <CardDescription>Clienti Attivi</CardDescription>
                  <CardTitle className="text-2xl">{activeClientsCount}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Totale clienti attivi</p>
                </CardContent>
              </>
            )}
          </Card>
        )}

        {hasLeadsAccess && (
          <Card>
            {shouldProtectData ? (
              <ProtectedData onUnlock={() => setPinDialogOpen(true)} compact noPadding />
            ) : (
              <>
                <CardHeader className="pb-3">
                  <CardDescription>Valore Leadboard</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    <Euro className="h-6 w-6" />
                    {leadboardValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Valore totale opportunità</p>
                </CardContent>
              </>
            )}
          </Card>
        )}

        {hasContactsAccess && (
          <Card>
            {shouldProtectData ? (
              <ProtectedData onUnlock={() => setPinDialogOpen(true)} compact noPadding />
            ) : (
              <>
                <CardHeader className="pb-3">
                  <CardDescription>Numero Contatti</CardDescription>
                  <CardTitle className="text-2xl">{totalContactsCount}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Totale contatti in anagrafica</p>
                </CardContent>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  )

  return (
    <BaseLayout>
      {pageContent}
      <PinUnlockDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} />
    </BaseLayout>
  )
}
