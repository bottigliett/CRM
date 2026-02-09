"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { developerAPI, type SystemStats, type AccessLog } from "@/lib/developer-api"
import {
  Code,
  Terminal,
  Zap,
  Users,
  CheckSquare,
  Calendar,
  Ticket,
  FileText,
  FolderKanban,
  Activity,
  RefreshCw,
  Trash2,
  Play,
  Clock,
  BarChart3,
  Database,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"

// Comandi predefiniti per API Tester
const presetCommands = [
  { label: "Utenti", method: "GET", endpoint: "/users", body: "" },
  { label: "Utente corrente", method: "GET", endpoint: "/auth/me", body: "" },
  { label: "Contatti", method: "GET", endpoint: "/contacts", body: "" },
  { label: "Task", method: "GET", endpoint: "/tasks", body: "" },
  { label: "Eventi", method: "GET", endpoint: "/events", body: "" },
  { label: "Ticket", method: "GET", endpoint: "/tickets", body: "" },
  { label: "Preventivi", method: "GET", endpoint: "/quotes", body: "" },
  { label: "Fatture", method: "GET", endpoint: "/invoices", body: "" },
  { label: "Progetti", method: "GET", endpoint: "/projects", body: "" },
  { label: "Transazioni", method: "GET", endpoint: "/transactions", body: "" },
  { label: "Annunci", method: "GET", endpoint: "/announcements", body: "" },
  { label: "Notifiche", method: "GET", endpoint: "/notifications", body: "" },
  { label: "Client Access", method: "GET", endpoint: "/client-access", body: "" },
  { label: "Moduli disponibili", method: "GET", endpoint: "/modules", body: "" },
]

export default function SandboxPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [apiEndpoint, setApiEndpoint] = useState("")
  const [apiMethod, setApiMethod] = useState("GET")
  const [apiBody, setApiBody] = useState("")
  const [apiResponse, setApiResponse] = useState("")
  const [loading, setLoading] = useState(false)

  // Stats
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

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
    loadAccessLogs()
  }, [])

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const data = await developerAPI.getStats()
      setStats(data)
    } catch (error) {
      console.error("Error loading stats:", error)
      toast.error("Errore nel caricamento statistiche")
    } finally {
      setStatsLoading(false)
    }
  }

  const loadAccessLogs = async (action?: string) => {
    try {
      setLogsLoading(true)
      const data = await developerAPI.getAccessLogs(50, action === "ALL" ? undefined : action)
      setAccessLogs(data)
    } catch (error) {
      console.error("Error loading access logs:", error)
      toast.error("Errore nel caricamento logs")
    } finally {
      setLogsLoading(false)
    }
  }

  const handleLogFilterChange = (value: string) => {
    setLogFilter(value)
    loadAccessLogs(value)
  }

  const testApiCall = async () => {
    if (!apiEndpoint) {
      toast.error("Inserisci un endpoint")
      return
    }

    try {
      setLoading(true)
      setApiResponse("Loading...")

      let response
      const endpoint = apiEndpoint.startsWith("/") ? apiEndpoint : `/${apiEndpoint}`

      switch (apiMethod) {
        case "GET":
          response = await api.get(endpoint)
          break
        case "POST":
          response = await api.post(endpoint, apiBody ? JSON.parse(apiBody) : {})
          break
        case "PUT":
          response = await api.put(endpoint, apiBody ? JSON.parse(apiBody) : {})
          break
        case "DELETE":
          response = await api.delete(endpoint)
          break
        default:
          response = await api.get(endpoint)
      }

      setApiResponse(JSON.stringify(response, null, 2))
      toast.success("Richiesta completata")
    } catch (error: any) {
      const errorData = error.response?.data || error.message
      setApiResponse(JSON.stringify(errorData, null, 2))
      toast.error("Errore nella richiesta")
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (preset: typeof presetCommands[0]) => {
    setApiMethod(preset.method)
    setApiEndpoint(preset.endpoint)
    setApiBody(preset.body)
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
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Success</Badge>
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Login</Badge>
      case "LOGOUT":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">Logout</Badge>
      case "USER_CREATED":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Utente creato</Badge>
      case "USER_DELETED":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Utente eliminato</Badge>
      case "USER_UPDATED":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Utente modificato</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  return (
    <BaseLayout
      title="Developer Sandbox"
      description="Strumenti di sviluppo, statistiche e monitoring"
    >
      <div className="px-4 lg:px-6 space-y-6">
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stats">
              <BarChart3 className="mr-2 h-4 w-4" />
              Statistiche
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="mr-2 h-4 w-4" />
              Access Logs
            </TabsTrigger>
            <TabsTrigger value="api">
              <Terminal className="mr-2 h-4 w-4" />
              API Tester
            </TabsTrigger>
            <TabsTrigger value="tools">
              <Zap className="mr-2 h-4 w-4" />
              Tools
            </TabsTrigger>
          </TabsList>

          {/* STATISTICHE TAB */}
          <TabsContent value="stats" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={loadStats} disabled={statsLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>

            {statsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Caricamento statistiche...</div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Utenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.users.total}</div>
                    <p className="text-xs text-muted-foreground">{stats.users.active} attivi</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      Contatti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.contacts.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-green-500" />
                      Task
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.tasks.total}</div>
                    <p className="text-xs text-muted-foreground">{stats.tasks.open} aperti · {stats.tasks.todayNew} oggi</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      Eventi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.events.total}</div>
                    <p className="text-xs text-muted-foreground">{stats.events.upcoming} futuri</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-red-500" />
                      Ticket
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.tickets.total}</div>
                    <p className="text-xs text-muted-foreground">{stats.tickets.open} aperti · {stats.tickets.todayNew} oggi</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-cyan-500" />
                      Preventivi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.quotes.total}</div>
                    <p className="text-xs text-muted-foreground">{stats.quotes.pending} in attesa</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-yellow-500" />
                      Fatture
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.invoices.total}</div>
                    <p className="text-xs text-muted-foreground">{stats.invoices.unpaid} non pagate</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-indigo-500" />
                      Progetti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.projects.total}</div>
                    <p className="text-xs text-muted-foreground">{stats.projects.active} attivi</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-teal-500" />
                      Client Access
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.clientAccess.total}</div>
                    <p className="text-xs text-muted-foreground">{stats.clientAccess.active} attivi</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Database className="h-4 w-4 text-pink-500" />
                      Transazioni
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.transactions.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-gray-500" />
                      Access Logs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.accessLogs.total}</div>
                    <p className="text-xs text-muted-foreground">{stats.accessLogs.todayLogins} login oggi</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Nessuna statistica disponibile</div>
            )}
          </TabsContent>

          {/* ACCESS LOGS TAB */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Ultimi Access Logs
                    </CardTitle>
                    <CardDescription>
                      Log degli accessi e delle azioni degli utenti
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={logFilter} onValueChange={handleLogFilterChange}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filtra per azione" />
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
                    <Button variant="outline" size="sm" onClick={() => loadAccessLogs(logFilter)} disabled={logsLoading}>
                      <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Caricamento logs...</div>
                ) : accessLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nessun log trovato</div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Data</TableHead>
                          <TableHead>Utente</TableHead>
                          <TableHead>Azione</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>Dettagli</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accessLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: it })}
                              </div>
                            </TableCell>
                            <TableCell>
                              {log.user ? (
                                <div>
                                  <div className="font-medium">{log.user.username}</div>
                                  <div className="text-xs text-muted-foreground">{log.user.role}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">{log.username || "-"}</span>
                              )}
                            </TableCell>
                            <TableCell>{getActionBadge(log.action)}</TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                            <TableCell className="font-mono text-xs">{log.ipAddress || "-"}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                              {log.details || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API TESTER TAB */}
          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  API Tester
                </CardTitle>
                <CardDescription>
                  Testa le API del backend direttamente dalla dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preset Commands */}
                <div>
                  <Label className="mb-2 block">Comandi Rapidi</Label>
                  <div className="flex flex-wrap gap-2">
                    {presetCommands.map((preset, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-32">
                    <Label>Metodo</Label>
                    <select
                      value={apiMethod}
                      onChange={(e) => setApiMethod(e.target.value)}
                      className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <Label>Endpoint</Label>
                    <Input
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder="/users"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={testApiCall} disabled={loading}>
                      <Play className="mr-2 h-4 w-4" />
                      {loading ? "..." : "Esegui"}
                    </Button>
                  </div>
                </div>

                {(apiMethod === "POST" || apiMethod === "PUT") && (
                  <div>
                    <Label>Body (JSON)</Label>
                    <Textarea
                      value={apiBody}
                      onChange={(e) => setApiBody(e.target.value)}
                      placeholder='{"key": "value"}'
                      rows={4}
                      className="mt-1 font-mono text-sm"
                    />
                  </div>
                )}

                <div>
                  <Label>Response</Label>
                  <pre className="mt-1 p-4 bg-muted rounded-lg overflow-auto max-h-96 text-sm font-mono">
                    {apiResponse || "Nessuna risposta"}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TOOLS TAB */}
          <TabsContent value="tools" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Tools</CardTitle>
                  <CardDescription>
                    Strumenti rapidi per il debug
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        localStorage.clear()
                        toast.success("LocalStorage svuotato")
                      }}
                    >
                      Clear LocalStorage
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        sessionStorage.clear()
                        toast.success("SessionStorage svuotato")
                      }}
                    >
                      Clear SessionStorage
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.clear()
                        toast.success("Console svuotata")
                      }}
                    >
                      Clear Console
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.reload()
                      }}
                    >
                      Reload Page
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Console Log</p>
                    <div className="flex gap-2">
                      <Input
                        id="consoleLog"
                        placeholder="Messaggio da loggare..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.target as HTMLInputElement
                            console.log("[Sandbox]", input.value)
                            toast.success("Loggato in console")
                            input.value = ""
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const input = document.getElementById("consoleLog") as HTMLInputElement
                          if (input?.value) {
                            console.log("[Sandbox]", input.value)
                            toast.success("Loggato in console")
                            input.value = ""
                          }
                        }}
                      >
                        Log
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Database Maintenance</CardTitle>
                  <CardDescription>
                    Pulizia e manutenzione database
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCleanSessions}
                      className="justify-start"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Pulisci sessioni scadute
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCleanLogs}
                      className="justify-start"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Pulisci access logs (30+ giorni)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>System Info</CardTitle>
                  <CardDescription>
                    Informazioni sull'ambiente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Environment</p>
                      <p className="text-sm text-muted-foreground">
                        {import.meta.env.MODE}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">API URL</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {import.meta.env.VITE_API_URL || "Non configurato"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Browser</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {navigator.userAgent.match(/Chrome|Firefox|Safari|Edge/)?.[0] || "Unknown"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Screen</p>
                      <p className="text-sm text-muted-foreground">
                        {window.innerWidth} x {window.innerHeight}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </BaseLayout>
  )
}
