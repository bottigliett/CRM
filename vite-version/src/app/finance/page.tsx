import { useState, useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePinProtection } from "@/contexts/pin-protection-context"
import { PinUnlockDialog } from "@/components/pin-unlock-dialog"
import { ProtectedData } from "@/components/protected-data"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Minus,
  MoreHorizontal,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  Filter,
  List,
  Pencil,
  Trash2,
  Landmark,
  Download,
} from "lucide-react"
import { transactionsAPI, type Transaction, type GetTransactionsParams } from "@/lib/finance-api"
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { it } from "date-fns/locale"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import { TransactionDialog } from "./components/transaction-dialog"

export default function FinancePage() {
  const { isProtectionEnabled, isUnlocked } = usePinProtection()
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAllTransactionsDialogOpen, setIsAllTransactionsDialogOpen] = useState(false)
  const [dialogDefaultType, setDialogDefaultType] = useState<'INCOME' | 'EXPENSE'>('INCOME')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  // Check if data should be protected
  const shouldProtectData = isProtectionEnabled && !isUnlocked

  // Filtri - default anno 2026
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString())
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year' | 'all'>('year')

  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    categoryBreakdown: [] as Array<{
      name: string
      type: string
      color: string | null
      total: number
      count: number
    }>,
  })

  // Separate state for all-time totals (not filtered by period)
  const [allTimeStats, setAllTimeStats] = useState({
    balance: 0,
    reservedTaxes: 0,
  })

  // Calculate reserved taxes from category breakdown (filtered by period)
  const reservedTaxes = stats.categoryBreakdown.find(
    cat => cat.type === 'EXPENSE' && cat.name.toLowerCase().includes('tasse')
  )?.total || 0

  const [monthlyData, setMonthlyData] = useState<Array<{
    month: string
    income: number
    expense: number
  }>>([])

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  })

  // Calcola date range in base ai filtri
  const getDateRange = () => {
    if (selectedPeriod === 'all') {
      return { startDate: undefined, endDate: undefined }
    }

    if (selectedPeriod === 'year') {
      const start = startOfYear(new Date(parseInt(selectedYear), 0, 1))
      const end = endOfYear(new Date(parseInt(selectedYear), 0, 1))
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      }
    }

    // month
    const start = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1))
    const end = endOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1))
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    }
  }

  // Load recent transactions (limited)
  useEffect(() => {
    async function loadTransactions() {
      try {
        setIsLoadingTransactions(true)
        const dateRange = getDateRange()
        const params: GetTransactionsParams = {
          page: pagination.page,
          limit: pagination.limit,
          sortBy: 'date',
          sortOrder: 'desc',
          ...dateRange,
        }

        const response = await transactionsAPI.getTransactions(params)

        if (response.success) {
          setTransactions(response.data.transactions)
          setPagination(response.data.pagination)
        }
      } catch (error) {
        console.error('Failed to load transactions:', error)
      } finally {
        setIsLoadingTransactions(false)
      }
    }

    loadTransactions()
  }, [pagination.page, selectedYear, selectedMonth, selectedPeriod])

  // Load monthly trend data
  useEffect(() => {
    async function loadMonthlyData() {
      try {
        const year = parseInt(selectedYear)
        const response = await transactionsAPI.getTransactions({
          limit: 1000,
          sortBy: 'date',
          sortOrder: 'asc',
          startDate: `${year}-01-01`,
          endDate: format(new Date(), 'yyyy-MM-dd'),
        })

        if (response.success) {
          const monthlyMap = new Map<string, { income: number; expense: number }>()

          response.data.transactions.forEach(t => {
            const transactionDate = new Date(t.date)
            const transactionYear = transactionDate.getFullYear()

            if (transactionYear === year) {
              const month = format(transactionDate, 'MMM', { locale: it })
              if (!monthlyMap.has(month)) {
                monthlyMap.set(month, { income: 0, expense: 0 })
              }
              const data = monthlyMap.get(month)!
              if (t.type === 'INCOME') {
                data.income += t.amount
              } else {
                data.expense += t.amount
              }
            }
          })

          const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
          const currentMonthIndex = year === currentYear ? currentMonth - 1 : 11

          const monthlyArray = months.slice(0, currentMonthIndex + 1).map(month => ({
            month,
            income: monthlyMap.get(month)?.income || 0,
            expense: monthlyMap.get(month)?.expense || 0,
          }))

          setMonthlyData(monthlyArray)
        }
      } catch (error) {
        console.error('Failed to load monthly data:', error)
      }
    }

    loadMonthlyData()
  }, [selectedYear])

  // Load statistics
  useEffect(() => {
    async function loadStats() {
      try {
        setIsLoadingStats(true)
        const dateRange = getDateRange()
        const response = await transactionsAPI.getTransactionStats(dateRange)

        if (response.success) {
          setStats({
            totalIncome: response.data.summary.income,
            totalExpenses: response.data.summary.expenses,
            balance: response.data.summary.balance,
            categoryBreakdown: response.data.categoryBreakdown || [],
          })
        }
      } catch (error: any) {
        console.error('Failed to load stats:', error)
      } finally {
        setIsLoadingStats(false)
      }
    }

    loadStats()
  }, [selectedYear, selectedMonth, selectedPeriod])

  // Function to load all-time statistics
  const loadAllTimeStats = async () => {
    try {
      const response = await transactionsAPI.getTransactionStats({ startDate: undefined, endDate: undefined })

      if (response.success) {
        const taxesReserved = response.data.categoryBreakdown?.find(
          (cat: any) => cat.type === 'EXPENSE' && cat.name.toLowerCase().includes('tasse')
        )?.total || 0

        setAllTimeStats({
          balance: response.data.summary.balance,
          reservedTaxes: taxesReserved,
        })
      }
    } catch (error: any) {
      console.error('Failed to load all-time stats:', error)
    }
  }

  // Load all-time statistics on mount and when period stats reload
  useEffect(() => {
    loadAllTimeStats()
  }, [selectedYear, selectedMonth, selectedPeriod]) // Reload when filters change

  // Load all transactions for popup
  const loadAllTransactions = async () => {
    try {
      const dateRange = getDateRange()
      const response = await transactionsAPI.getTransactions({
        limit: 1000,
        sortBy: 'date',
        sortOrder: 'desc',
        ...dateRange,
      })

      if (response.success) {
        setAllTransactions(response.data.transactions)
      }
    } catch (error) {
      console.error('Failed to load all transactions:', error)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleTransactionCreated = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const openNewIncomeDialog = () => {
    setEditingTransaction(null)
    setDialogDefaultType('INCOME')
    setIsDialogOpen(true)
  }

  const openNewExpenseDialog = () => {
    setEditingTransaction(null)
    setDialogDefaultType('EXPENSE')
    setIsDialogOpen(true)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setDialogDefaultType(transaction.type)
    setIsDialogOpen(true)
  }

  const openAllTransactionsDialog = async () => {
    await loadAllTransactions()
    setIsAllTransactionsDialogOpen(true)
  }

  const handleDeleteTransaction = async (id: number) => {
    if (confirm('Sei sicuro di voler eliminare questa transazione?')) {
      try {
        await transactionsAPI.deleteTransaction(id)
        // Reload data
        setPagination(prev => ({ ...prev, page: 1 }))
        handleTransactionCreated()
      } catch (error) {
        console.error('Failed to delete transaction:', error)
      }
    }
  }

  const handleExportCSV = () => {
    // Convert transactions to CSV
    const headers = ['Data', 'Tipo', 'Importo', 'Descrizione', 'Categoria', 'Metodo', 'Fornitore']
    const csvRows = [headers.join(',')]

    allTransactions.forEach(t => {
      const row = [
        format(new Date(t.date), 'dd/MM/yyyy'),
        t.type === 'INCOME' ? 'Entrata' : 'Uscita',
        t.amount.toFixed(2),
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.category?.name || '-').replace(/"/g, '""')}"`,
        `"${(t.paymentMethod?.name || '-').replace(/"/g, '""')}"`,
        `"${(t.vendor || '-').replace(/"/g, '""')}"`,
      ]
      csvRows.push(row.join(','))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `transazioni_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Genera lista anni (solo 2025 e 2026)
  const years = [2025, 2026]
  const months = [
    { value: '1', label: 'Gennaio' },
    { value: '2', label: 'Febbraio' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Aprile' },
    { value: '5', label: 'Maggio' },
    { value: '6', label: 'Giugno' },
    { value: '7', label: 'Luglio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Settembre' },
    { value: '10', label: 'Ottobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Dicembre' },
  ]

  // Prepare balance pie chart data
  const balanceData = [
    { name: 'Entrate', value: stats.totalIncome, color: '#10b981' },
    { name: 'Uscite', value: stats.totalExpenses, color: '#ef4444' },
  ]

  const pageContent = shouldProtectData ? (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <ProtectedData onUnlock={() => setPinDialogOpen(true)} />
      </Card>
    </div>
  ) : (
    <div className="h-[calc(100vh-4rem)] flex flex-col px-4 lg:px-6 space-y-4 overflow-y-auto">
      {/* Header con filtri e azioni */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={(v: 'month' | 'year' | 'all') => setSelectedPeriod(v)}>
            <SelectTrigger className="w-35">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mese</SelectItem>
              <SelectItem value="year">Anno</SelectItem>
              <SelectItem value="all">Tutto</SelectItem>
            </SelectContent>
          </Select>

          {selectedPeriod !== 'all' && (
            <>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPeriod === 'month' && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-35">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={openNewIncomeDialog} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Nuova Entrata
          </Button>
          <Button onClick={openNewExpenseDialog} variant="outline">
            <Minus className="mr-2 h-4 w-4" />
            Nuova Uscita
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrate Totali</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Caricamento...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  € {(stats.totalIncome || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Totale entrate periodo
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uscite Totali</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Caricamento...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  € {(stats.totalExpenses || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Totale uscite periodo
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo sul Conto</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Caricamento...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  € {allTimeStats.balance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Saldo attuale del conto (tutti i tempi)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasse Accantonate</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Caricamento...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-600">
                  € {allTimeStats.reservedTaxes.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Imposte accantonate (tutti i tempi)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Andamento {selectedYear}</CardTitle>
          <CardDescription>Entrate e uscite mensili</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis
                  dataKey="month"
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    borderColor: 'var(--border)',
                    borderRadius: '6px',
                    color: 'var(--popover-foreground)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Entrate"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Uscite"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 3 Pie Charts */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Balance Pie Chart */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bilancio Totale</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {isLoadingStats ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={balanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {balanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        borderColor: 'var(--border)',
                        borderRadius: '6px',
                        color: 'var(--popover-foreground)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {balanceData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">
                        € {item.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Income Pie Chart */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Entrate per Categoria</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {isLoadingStats ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : stats.categoryBreakdown.filter(cat => cat.type === 'INCOME').length === 0 ? (
              <div className="flex items-center justify-center flex-1">
                <p className="text-sm text-muted-foreground">Nessuna entrata</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.categoryBreakdown.filter(cat => cat.type === 'INCOME')}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="total"
                    >
                      {stats.categoryBreakdown
                        .filter(cat => cat.type === 'INCOME')
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#10b981'} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        borderColor: 'var(--border)',
                        borderRadius: '6px',
                        color: 'var(--popover-foreground)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {stats.categoryBreakdown
                    .filter(cat => cat.type === 'INCOME')
                    .map((cat, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#10b981' }} />
                          <span>{cat.name}</span>
                        </div>
                        <span className="font-medium">
                          {((cat.total / stats.totalIncome) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Expense Pie Chart */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Uscite per Categoria</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {isLoadingStats ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : stats.categoryBreakdown.filter(cat => cat.type === 'EXPENSE').length === 0 ? (
              <div className="flex items-center justify-center flex-1">
                <p className="text-sm text-muted-foreground">Nessuna uscita</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.categoryBreakdown.filter(cat => cat.type === 'EXPENSE')}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="total"
                    >
                      {stats.categoryBreakdown
                        .filter(cat => cat.type === 'EXPENSE')
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#ef4444'} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        borderColor: 'var(--border)',
                        borderRadius: '6px',
                        color: 'var(--popover-foreground)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {stats.categoryBreakdown
                    .filter(cat => cat.type === 'EXPENSE')
                    .map((cat, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#ef4444' }} />
                          <span>{cat.name}</span>
                        </div>
                        <span className="font-medium">
                          {((cat.total / stats.totalExpenses) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table - Full Width */}
      <Card className="pb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transazioni Recenti</CardTitle>
              <CardDescription>Ultime {pagination.limit} transazioni del periodo</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={async () => {
                await loadAllTransactions()
                handleExportCSV()
              }}>
                <Download className="mr-2 h-4 w-4" />
                Esporta CSV
              </Button>
              <Button variant="outline" size="sm" onClick={openAllTransactionsDialog}>
                <List className="mr-2 h-4 w-4" />
                Vedi Tutte
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-sm text-muted-foreground">Nessuna transazione trovata</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Data</TableHead>
                      <TableHead className="w-32">Importo</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Metodo</TableHead>
                      <TableHead>Fornitore</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(transaction.date), 'dd MMM yyyy', { locale: it })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {transaction.type === "INCOME" ? (
                              <ArrowUpCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className={`font-semibold text-sm whitespace-nowrap ${transaction.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                              {transaction.type === "INCOME" ? "+" : "-"}€{transaction.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {transaction.description || '-'}
                        </TableCell>
                        <TableCell>
                          {transaction.category ? (
                            <Badge variant="outline" style={{ borderColor: transaction.category.color || undefined }}>
                              {transaction.category.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {transaction.paymentMethod?.name || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {transaction.vendor || '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Modifica
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} di {pagination.total} transazioni
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Precedente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Successivo
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <>
      <PinUnlockDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} />
    <BaseLayout
      title="Finance Tracker"
      description="Monitora entrate, uscite e cashflow"
    >
      {pageContent}

      {/* New Transaction Dialog */}
      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleTransactionCreated}
        defaultType={dialogDefaultType}
        transaction={editingTransaction}
      />

      {/* All Transactions Dialog */}
      <Dialog open={isAllTransactionsDialogOpen} onOpenChange={setIsAllTransactionsDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Tutte le Transazioni</DialogTitle>
            <DialogDescription>
              Elenco completo delle transazioni per il periodo selezionato ({allTransactions.length} transazioni)
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead className="w-32">Importo</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Fornitore</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(transaction.date), 'dd MMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {transaction.type === "INCOME" ? (
                          <ArrowUpCircle className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <span className={`font-semibold text-sm whitespace-nowrap ${transaction.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                          {transaction.type === "INCOME" ? "+" : "-"}€{transaction.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.description || '-'}
                    </TableCell>
                    <TableCell>
                      {transaction.category ? (
                        <Badge variant="outline" style={{ borderColor: transaction.category.color || undefined }}>
                          {transaction.category.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {transaction.paymentMethod?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {transaction.vendor || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setIsAllTransactionsDialogOpen(false)
                            handleEditTransaction(transaction)
                          }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              handleDeleteTransaction(transaction.id)
                              setIsAllTransactionsDialogOpen(false)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </BaseLayout>
    </>
  )
}
