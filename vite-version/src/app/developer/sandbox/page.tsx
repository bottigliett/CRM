"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Cell, Pie, PieChart } from "recharts"
import { toast } from "sonner"
import { developerAPI, type SystemStats, type AccessLog, type ActivityDay } from "@/lib/developer-api"
import {
  Zap,
  Activity,
  RefreshCw,
  Trash2,
  Clock,
  BarChart3,
  Database,
  Server,
  Shield,
  CircleDot,
  Settings2,
} from "lucide-react"
import { ModuleSettings } from "@/components/developer/module-settings"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"

const chartConfig = {
  logins: { label: "Login", color: "hsl(var(--foreground))" },
  tasks: { label: "Task", color: "hsl(var(--muted-foreground))" },
  tickets: { label: "Ticket", color: "hsl(var(--foreground) / 0.5)" },
  events: { label: "Eventi", color: "hsl(var(--muted-foreground) / 0.5)" },
}

export default function SandboxPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Stats
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Activity History
  const [activityHistory, setActivityHistory] = useState<ActivityDay[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Access Logs
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logFilter, setLogFilter] = useState<string>("ALL")

  // Role protection - redirect if not DEVELOPER
  useEffect(() => {
    if (user && user.role !== 'DEVELOPER') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  // Load initial data
  useEffect(() => {
    loadStats()
    loadActivityHistory()
    loadAccessLogs()
  }, [])

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const data = await developerAPI.getStats()
      setStats(data)
    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }

  const loadActivityHistory = async () => {
    try {
      setHistoryLoading(true)
      const data = await developerAPI.getActivityHistory()
      setActivityHistory(data || [])
    } catch (error) {
      console.error("Error loading activity history:", error)
      setActivityHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadAccessLogs = async (action?: string) => {
    try {
      setLogsLoading(true)
      const data = await developerAPI.getAccessLogs(50, action === "ALL" ? undefined : action)
      setAccessLogs(data || [])
    } catch (error) {
      console.error("Error loading access logs:", error)
      setAccessLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  const handleLogFilterChange = (value: string) => {
    setLogFilter(value)
    loadAccessLogs(value)
  }

  const refreshAll = () => {
    loadStats()
    loadActivityHistory()
    loadAccessLogs(logFilter)
  }

  const handleCleanSessions = async () => {
    try {
      const result = await developerAPI.cleanSessions()
      toast.success(`Eliminate ${result.deletedCount} sessioni scadute`)
      loadStats()
    } catch (error) {
      toast.error("Errore nella pulizia sessioni")
    }
  }

  const handleCleanLogs = async () => {
    try {
      const result = await developerAPI.cleanAccessLogs()
      toast.success(`Eliminati ${result.deletedCount} access logs`)
      loadStats()
      loadAccessLogs(logFilter)
    } catch (error) {
      toast.error("Errore nella pulizia logs")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Success</Badge>
      case "FAILED":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Login</Badge>
      case "LOGOUT":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Logout</Badge>
      case "USER_CREATED":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Utente creato</Badge>
      case "USER_DELETED":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Utente eliminato</Badge>
      case "USER_UPDATED":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Utente modificato</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  // Prepare pie chart data
  const pieData = stats ? [
    { name: "Contatti", value: stats.contacts.total, color: "#3b82f6" },
    { name: "Task", value: stats.tasks.total, color: "#22c55e" },
    { name: "Ticket", value: stats.tickets.total, color: "#ef4444" },
    { name: "Eventi", value: stats.events.total, color: "#f59e0b" },
    { name: "Preventivi", value: stats.quotes.total, color: "#8b5cf6" },
    { name: "Fatture", value: stats.invoices.total, color: "#ec4899" },
    { name: "Progetti", value: stats.projects.total, color: "#06b6d4" },
  ].filter(d => d.value > 0) : []

  const totalRecords = pieData.reduce((acc, d) => acc + d.value, 0)

  return (
    <BaseLayout
      title="Developer Console"
      description="Sistema di monitoraggio e gestione avanzata"
      headerAction={
        <Button variant="outline" size="sm" onClick={refreshAll}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Aggiorna tutto
        </Button>
      }
    >
      <div className="px-4 lg:px-6 space-y-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity className="mr-2 h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="tools" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="mr-2 h-4 w-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings2 className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* DASHBOARD TAB */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Status Bar */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Sistema Online</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Server className="h-4 w-4" />
                <span>{import.meta.env.VITE_API_URL || "localhost"}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-green-500" />
                <span>JWT Auth</span>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                Ultimo aggiornamento: {new Date().toLocaleTimeString("it-IT")}
              </div>
            </div>

            {/* Quick Stats Row */}
            {statsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
            ) : stats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Utenti</p>
                      <p className="text-2xl font-bold">{stats.users.total}</p>
                      <p className="text-xs text-muted-foreground">{stats.users.active} attivi</p>
                      <Progress value={(stats.users.active / stats.users.total) * 100} className="mt-2 h-1" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Task</p>
                      <p className="text-2xl font-bold">{stats.tasks.total}</p>
                      <p className="text-xs text-muted-foreground">{stats.tasks.open} aperti</p>
                      <Progress value={stats.tasks.total > 0 ? ((stats.tasks.total - stats.tasks.open) / stats.tasks.total) * 100 : 0} className="mt-2 h-1" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Ticket</p>
                      <p className="text-2xl font-bold">{stats.tickets.total}</p>
                      <p className="text-xs text-muted-foreground">{stats.tickets.open} aperti</p>
                      <Progress value={stats.tickets.total > 0 ? ((stats.tickets.total - stats.tickets.open) / stats.tickets.total) * 100 : 0} className="mt-2 h-1" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Eventi</p>
                      <p className="text-2xl font-bold">{stats.events.total}</p>
                      <p className="text-xs text-muted-foreground">{stats.events.upcoming} futuri</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Contatti</p>
                      <p className="text-2xl font-bold">{stats.contacts.total}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Login Oggi</p>
                      <p className="text-2xl font-bold">{stats.accessLogs.todayLogins}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Activity Chart */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Attività Ultimi 7 Giorni
                      </CardTitle>
                      <CardDescription>Login, task, ticket ed eventi creati</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {historyLoading ? (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          Caricamento grafico...
                        </div>
                      ) : !activityHistory || activityHistory.length === 0 ? (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          Nessun dato disponibile
                        </div>
                      ) : (
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                          <AreaChart data={activityHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area type="monotone" dataKey="logins" stroke="currentColor" fill="currentColor" fillOpacity={0.1} strokeWidth={2} />
                            <Area type="monotone" dataKey="tasks" stroke="currentColor" fill="currentColor" fillOpacity={0.05} strokeWidth={1.5} strokeDasharray="4 4" />
                            <Area type="monotone" dataKey="tickets" stroke="currentColor" fill="none" strokeWidth={1} strokeDasharray="2 2" />
                          </AreaChart>
                        </ChartContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pie Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        Distribuzione Dati
                      </CardTitle>
                      <CardDescription>{totalRecords.toLocaleString()} record totali</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[200px] w-full">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                        {pieData.slice(0, 6).map((entry, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-muted-foreground">{entry.name}: {entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Fatture</p>
                      <p className="text-2xl font-bold">{stats.invoices.total}</p>
                      <p className="text-xs text-muted-foreground">{stats.invoices.unpaid} da pagare</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Progetti</p>
                      <p className="text-2xl font-bold">{stats.projects.total}</p>
                      <p className="text-xs text-muted-foreground">{stats.projects.active} attivi</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Client Access</p>
                      <p className="text-2xl font-bold">{stats.clientAccess.total}</p>
                      <p className="text-xs text-muted-foreground">{stats.clientAccess.active} attivi</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Access Logs</p>
                      <p className="text-2xl font-bold">{stats.accessLogs.total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{stats.transactions.total} transazioni</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* ACCESS LOGS TAB */}
          <TabsContent value="logs" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Activity Feed
                    </CardTitle>
                    <CardDescription>
                      Monitoraggio in tempo reale delle attività
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={logFilter} onValueChange={handleLogFilterChange}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filtra" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tutti</SelectItem>
                        <SelectItem value="LOGIN">Login</SelectItem>
                        <SelectItem value="LOGOUT">Logout</SelectItem>
                        <SelectItem value="USER_CREATED">Utente creato</SelectItem>
                        <SelectItem value="USER_UPDATED">Utente modificato</SelectItem>
                        <SelectItem value="USER_DELETED">Utente eliminato</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => loadAccessLogs(logFilter)} disabled={logsLoading}>
                      <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
                ) : accessLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nessun log trovato</div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                      {accessLogs.map((log) => (
                        <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex-shrink-0">
                            <CircleDot className={`h-4 w-4 ${log.status === 'SUCCESS' ? 'text-green-500' : 'text-red-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {log.user?.username || log.username || "Sistema"}
                              </span>
                              {getActionBadge(log.action)}
                              {getStatusBadge(log.status)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {log.details && <span className="mr-2">{log.details}</span>}
                              <span className="font-mono">{log.ipAddress || "-"}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: it })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TOOLS TAB */}
          <TabsContent value="tools" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => { localStorage.clear(); toast.success("LocalStorage cleared") }}>
                    <Trash2 className="mr-2 h-4 w-4" /> Clear LocalStorage
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => { sessionStorage.clear(); toast.success("SessionStorage cleared") }}>
                    <Trash2 className="mr-2 h-4 w-4" /> Clear SessionStorage
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => { console.clear(); toast.success("Console cleared") }}>
                    <Trash2 className="mr-2 h-4 w-4" /> Clear Console
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => window.location.reload()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Reload Page
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Cleanup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={handleCleanSessions}>
                    <Trash2 className="mr-2 h-4 w-4" /> Pulisci sessioni scadute
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={handleCleanLogs}>
                    <Trash2 className="mr-2 h-4 w-4" /> Pulisci logs (30+ giorni)
                  </Button>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    System Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase">Environment</p>
                      <p className="font-mono font-medium">{import.meta.env.MODE}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase">API URL</p>
                      <p className="font-mono font-medium truncate">{import.meta.env.VITE_API_URL || "localhost"}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase">Browser</p>
                      <p className="font-mono font-medium">{navigator.userAgent.match(/Chrome|Firefox|Safari|Edge/)?.[0] || "Unknown"}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase">Resolution</p>
                      <p className="font-mono font-medium">{window.innerWidth} x {window.innerHeight}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            <ModuleSettings />
          </TabsContent>
        </Tabs>
      </div>
    </BaseLayout>
  )
}
