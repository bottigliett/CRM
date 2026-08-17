import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft, RefreshCw, MoreVertical, ShieldAlert, CheckCircle2, Globe,
  Unplug, Trash2, AlertTriangle, ExternalLink,
} from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const PLATFORM_DOT: Record<string, string> = {
  INSTAGRAM: "bg-pink-500",
  FACEBOOK: "bg-blue-600",
  LINKEDIN: "bg-sky-600",
  TIKTOK: "bg-gray-800",
}

interface AuthAccount {
  id: number
  contactId: number
  contactName: string
  platform: string
  platformName: string
  hasToken: boolean
  tokenExpiring: boolean
  tokenExpired: boolean
  tokenExpiresAt: string | null
  browserOnly: boolean
  browserFallback: boolean
  hasBrowserSession: boolean
  browserActive: boolean
  scheduledPosts: number
  risk: "ok" | "warning" | "critical"
}

export default function SocialAuthAdmin() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<AuthAccount[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = () => {
    setLoading(true)
    socialAPI.getAuthOverview()
      .then(r => setAccounts(r.data))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleBrowserLogin = async (id: number) => {
    try {
      await socialAPI.browserLogin(id)
      toast.success("Browser aperto — effettua il login")
      setTimeout(fetchData, 5000)
    } catch (err: any) { toast.error(err.message) }
  }

  const handleBrowserDelete = async (id: number) => {
    try {
      await socialAPI.browserDeleteSession(id)
      toast.success("Sessione eliminata")
      fetchData()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleRefreshToken = async (id: number) => {
    try {
      await socialAPI.refreshToken(id)
      toast.success("Token aggiornato")
      fetchData()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDisconnect = async (id: number) => {
    try {
      await socialAPI.disconnectAccount(id)
      toast.success("Account disconnesso")
      fetchData()
    } catch (err: any) { toast.error(err.message) }
  }

  const critical = accounts.filter(a => a.risk === "critical")
  const warning = accounts.filter(a => a.risk === "warning")
  const totalScheduled = accounts.reduce((s, a) => s + a.scheduledPosts, 0)

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center gap-4">

          <Button variant="ghost" size="sm" onClick={() => navigate("/social")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Social
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Autorizzazioni Social</h1>
            <p className="text-sm text-muted-foreground">Panoramica sessioni OAuth e browser di tutti i clienti</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Aggiorna
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Account totali</p>
              <p className="text-2xl font-bold">{accounts.length}</p>
            </CardContent>
          </Card>
          <Card className={critical.length > 0 ? "border-red-300 dark:border-red-800" : ""}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" /> Critici</p>
              <p className="text-2xl font-bold text-red-600">{critical.length}</p>
            </CardContent>
          </Card>
          <Card className={warning.length > 0 ? "border-yellow-300 dark:border-yellow-800" : ""}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-yellow-500" /> Attenzione</p>
              <p className="text-2xl font-bold text-yellow-600">{warning.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Post programmati</p>
              <p className="text-2xl font-bold">{totalScheduled}</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts for critical accounts */}
        {critical.length > 0 && (
          <Card className="border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" /> Account critici — azione richiesta
              </CardTitle>
              <CardDescription>Questi account non possono pubblicare. Nessun token API valido e nessuna sessione browser.</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                {critical.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-2 rounded bg-background border">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${PLATFORM_DOT[acc.platform] || "bg-gray-400"}`} />
                      <span className="text-sm font-medium">{acc.platformName}</span>
                      <span className="text-xs text-muted-foreground">({acc.contactName})</span>
                      {acc.scheduledPosts > 0 && (
                        <Badge variant="destructive" className="text-[10px]">{acc.scheduledPosts} post a rischio</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBrowserLogin(acc.id)}>
                        <Globe className="h-3 w-3 mr-1" /> Login
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/social/${acc.contactId}?tab=accounts`)}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Apri
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tutti gli account</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-40">Cliente</TableHead>
                      <TableHead className="min-w-28">Piattaforma</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>API</TableHead>
                      <TableHead>Browser</TableHead>
                      <TableHead>Modalità</TableHead>
                      <TableHead className="text-center">Post</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map(acc => (
                      <TableRow key={acc.id} className={acc.risk === "critical" ? "bg-red-50/50 dark:bg-red-950/10" : acc.risk === "warning" ? "bg-yellow-50/50 dark:bg-yellow-950/10" : ""}>
                        <TableCell>
                          <button className="text-sm font-medium hover:underline" onClick={() => navigate(`/social/${acc.contactId}?tab=accounts`)}>
                            {acc.contactName}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${PLATFORM_DOT[acc.platform] || "bg-gray-400"}`} />
                            <span className="text-sm">{acc.platform}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{acc.platformName}</TableCell>
                        <TableCell>
                          {!acc.hasToken ? (
                            <Badge variant="outline" className="text-[10px] gap-1"><Unplug className="h-2.5 w-2.5" /> No</Badge>
                          ) : acc.tokenExpired ? (
                            <Badge variant="destructive" className="text-[10px] gap-1">Scaduto</Badge>
                          ) : acc.tokenExpiring ? (
                            <Badge variant="outline" className="text-[10px] gap-1 border-yellow-400 text-yellow-700 dark:text-yellow-400">
                              <ShieldAlert className="h-2.5 w-2.5" />
                              {acc.tokenExpiresAt ? format(new Date(acc.tokenExpiresAt), "dd/MM", { locale: it }) : "—"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> OK</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {acc.hasBrowserSession ? (
                            <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              <Globe className="h-2.5 w-2.5" /> Attivo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-1"><Globe className="h-2.5 w-2.5" /> No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {acc.browserOnly ? "Solo Browser" : acc.browserFallback ? "API + Fallback" : "Solo API"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {acc.scheduledPosts > 0 ? (
                            <span className="text-sm font-medium">{acc.scheduledPosts}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {acc.risk === "critical" ? (
                            <Badge variant="destructive" className="text-[10px]">Critico</Badge>
                          ) : acc.risk === "warning" ? (
                            <Badge variant="outline" className="text-[10px] border-yellow-400 text-yellow-700 dark:text-yellow-400">Attenzione</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleBrowserLogin(acc.id)}>
                                <Globe className="h-4 w-4 mr-2" /> Login Browser
                              </DropdownMenuItem>
                              {acc.hasToken && (
                                <DropdownMenuItem onClick={() => handleRefreshToken(acc.id)}>
                                  <RefreshCw className="h-4 w-4 mr-2" /> Rinnova Token
                                </DropdownMenuItem>
                              )}
                              {acc.hasBrowserSession && (
                                <DropdownMenuItem onClick={() => handleBrowserDelete(acc.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Elimina Sessione
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => navigate(`/social/${acc.contactId}?tab=accounts`)}>
                                <ExternalLink className="h-4 w-4 mr-2" /> Vai al cliente
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDisconnect(acc.id)}>
                                <Unplug className="h-4 w-4 mr-2" /> Disconnetti
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
