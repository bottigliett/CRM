import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Eye, Heart, TrendingUp, TrendingDown, ExternalLink, Trophy, Megaphone } from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"
import { format, subDays } from "date-fns"

const PERIODS = [
  { value: "7", label: "7 giorni" },
  { value: "30", label: "30 giorni" },
  { value: "90", label: "90 giorni" },
  { value: "365", label: "12 mesi" },
]

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: "#E1306C",
  FACEBOOK: "#1877F2",
  LINKEDIN: "#0A66C2",
  TIKTOK: "#000000",
}

const PLATFORM_DOT: Record<string, string> = {
  INSTAGRAM: "bg-pink-500",
  FACEBOOK: "bg-blue-600",
  LINKEDIN: "bg-sky-600",
  TIKTOK: "bg-gray-800",
}

const PLATFORMS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TIKTOK", label: "TikTok" },
]

function KpiCard({ title, value, delta, icon: Icon }: { title: string; value: string | number; delta?: number; icon: any }) {
  return (
    <Card className="animate-in fade-in duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardDescription className="text-sm font-medium">{title}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{typeof value === "number" ? value.toLocaleString("it-IT") : value}</div>
        {delta !== undefined && delta !== 0 && (
          <div className={`flex items-center text-xs mt-1.5 ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
            {delta > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {delta > 0 ? "+" : ""}{delta.toLocaleString("it-IT")}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function GeneralSocialAnalytics() {
  const navigate = useNavigate()

  const [period, setPeriod] = useState("30")
  const [filterClient, setFilterClient] = useState("all")
  const [filterPlatform, setFilterPlatform] = useState("all")
  const [clients, setClients] = useState<any[]>([])
  const [overview, setOverview] = useState<any>({ byPlatform: [], byClient: [] })
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    socialAPI.getDashboard()
      .then(res => setClients(res.data.clients || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const endDate = new Date().toISOString()
    const startDate = subDays(new Date(), parseInt(period)).toISOString()
    const platformParam = filterPlatform !== "all" ? filterPlatform : undefined

    setLoading(true)
    if (filterClient === "all") {
      socialAPI.getAnalyticsOverview({ startDate, endDate, platform: platformParam })
        .then(res => setOverview(res.data))
        .catch(err => toast.error(err.message))
        .finally(() => setLoading(false))
    } else {
      const cid = parseInt(filterClient)
      socialAPI.getAnalytics(cid, { startDate, endDate, platform: platformParam })
        .then(res => setData({ singleClient: true, ...res.data }))
        .catch(err => toast.error(err.message))
        .finally(() => setLoading(false))
    }
  }, [filterClient, filterPlatform, period])

  const kpis = useMemo(() => {
    if (filterClient === "all") {
      return overview.byPlatform.reduce((acc: any, p: any) => ({
        followers: acc.followers + (p.followers || 0),
        growth: acc.growth + (p.growth || 0),
        reach: acc.reach + (p.reach || 0),
        engagement: acc.engagement + (p.engagement || 0),
      }), { followers: 0, growth: 0, reach: 0, engagement: 0 })
    }
    if (data?.summary?.length) {
      return data.summary.reduce((acc: any, s: any) => ({
        followers: acc.followers + (s.followers || 0),
        growth: acc.growth + (s.followersGrowth || 0),
        reach: acc.reach + (s.totalReach || 0),
        engagement: acc.engagement + (s.totalEngagement || 0),
      }), { followers: 0, growth: 0, reach: 0, engagement: 0 })
    }
    return { followers: 0, growth: 0, reach: 0, engagement: 0 }
  }, [overview, data, filterClient])

  const chartData = useMemo(() => {
    if (!data?.singleClient || !data?.analytics?.length) return []
    const byDate: Record<string, any> = {}
    for (const a of data.analytics) {
      const dateKey = format(new Date(a.date), "dd/MM")
      if (!byDate[dateKey]) byDate[dateKey] = { date: dateKey }
      const suffix = a.socialAccount ? ` (${a.socialAccount.platform})` : ""
      byDate[dateKey][`followers${suffix}`] = a.followers
      byDate[dateKey][`engagement${suffix}`] = a.engagement
    }
    return Object.values(byDate)
  }, [data])

  const bestPlatform = useMemo(() => {
    const withData = overview.byPlatform.filter((p: any) => (p.engagement || 0) > 0 || (p.followers || 0) > 0)
    return withData.sort((a: any, b: any) => (b.engagement || 0) - (a.engagement || 0))[0]
  }, [overview])

  const bestClient = useMemo(() => {
    const withData = overview.byClient.filter((c: any) => (c.engagement || 0) > 0 || (c.followers || 0) > 0)
    return withData.sort((a: any, b: any) => (b.engagement || 0) - (a.engagement || 0))[0]
  }, [overview])

  // Is there any real analytics data at all? (engagement, reach or followers)
  const hasAnyData = useMemo(() =>
    overview.byPlatform.some((p: any) => (p.engagement || 0) > 0 || (p.reach || 0) > 0 || (p.followers || 0) > 0) ||
    overview.byClient.some((c: any) => (c.engagement || 0) > 0 || (c.reach || 0) > 0 || (c.followers || 0) > 0),
    [overview])

  const clientRanking = useMemo(() =>
    [...overview.byClient]
      .filter((c: any) => (c.engagement || 0) > 0 || (c.followers || 0) > 0)
      .sort((a: any, b: any) => (b.engagement || 0) - (a.engagement || 0)),
    [overview])

  if (loading) {
    return (
      <BaseLayout title="Analytics Generale">
        <div className="px-4 lg:px-6 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </BaseLayout>
    )
  }

  return (
    <BaseLayout title="Analytics Generale" description="Confronto clienti e social — chi performa meglio">
      <div className="px-4 lg:px-6 space-y-6 animate-in fade-in duration-300">
        {/* Toolbar — filtri avanzati */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tutti i clienti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i clienti</SelectItem>
                {clients.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tutti i social" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i social</SelectItem>
                {PLATFORMS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Follower Totali" value={kpis.followers} delta={kpis.growth} icon={Users} />
          <KpiCard title="Reach Totale" value={kpis.reach} icon={Eye} />
          <KpiCard title="Engagement Totale" value={kpis.engagement} icon={Heart} />
          <KpiCard title="Account Collegati" value={clients.reduce((s: number, c: any) => s + (c.accountCount || 0), 0)} icon={Megaphone} />
        </div>

        {/* All clients: "best" highlight + platform comparison + ranking */}
        {filterClient === "all" && (
          <>
            {/* Best platform / best client highlight */}
            {(bestPlatform || bestClient) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {bestPlatform && (
                  <Card className="border-primary/30 bg-primary/[0.03]">
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-1.5 text-primary"><Trophy className="h-4 w-4" /> Miglior social</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${PLATFORM_DOT[bestPlatform.platform] || "bg-gray-400"}`} />
                        <span className="text-lg font-bold">{bestPlatform.platformName || bestPlatform.platform}</span>
                        <span className="text-sm text-muted-foreground ml-auto">{bestPlatform.engagement.toLocaleString("it-IT")} engagement</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {bestClient && (
                  <Card className="border-primary/30 bg-primary/[0.03]">
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-1.5 text-primary"><Trophy className="h-4 w-4" /> Miglior cliente</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {bestClient.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="text-lg font-bold truncate">{bestClient.name}</span>
                        <span className="text-sm text-muted-foreground ml-auto">{bestClient.engagement.toLocaleString("it-IT")} engagement</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Platform comparison chart */}
            {overview.byPlatform.length > 1 && hasAnyData && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Confronto tra Social</CardTitle>
                  <CardDescription>Engagement e reach aggregati per piattaforma</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={overview.byPlatform}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => v.toLocaleString("it-IT")} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                      <Legend />
                      <Bar dataKey="engagement" name="Engagement" radius={[4, 4, 0, 0]}>
                        {overview.byPlatform.map((p: any) => <Cell key={p.platform} fill={PLATFORM_COLORS[p.platform] || "#6366f1"} />)}
                      </Bar>
                      <Bar dataKey="reach" name="Reach" radius={[4, 4, 0, 0]}>
                        {overview.byPlatform.map((p: any) => <Cell key={p.platform} fill={PLATFORM_COLORS[p.platform] || "#6366f1"} opacity={0.45} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Client ranking */}
            {clientRanking.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ranking Clienti per Engagement</CardTitle>
                  <CardDescription className="mt-1">Clicca su un cliente per i dettagli</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {clientRanking.map((c: any, i: number) => (
                      <div
                        key={c.contactId}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/social/${c.contactId}?tab=analytics`)}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="text-sm font-bold text-muted-foreground w-6 text-right shrink-0">{i + 1}</span>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                            {c.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{c.name}</div>
                            <div className="flex gap-1 mt-0.5">
                              {c.accounts?.map((a: any) => (
                                <span key={a.id} className={`w-2 h-2 rounded-full ${PLATFORM_DOT[a.platform] || "bg-gray-400"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm shrink-0">
                          <div className="text-right hidden sm:block">
                            <div className="text-xs text-muted-foreground">Follower</div>
                            <div className="font-medium">{c.followers.toLocaleString("it-IT")}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Engagement</div>
                            <div className="font-medium">{c.engagement.toLocaleString("it-IT")}</div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!hasAnyData && (
              <Card>
                <CardContent className="py-16 text-center">
                  <Eye className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground font-medium">Non ci sono ancora dati analytics sufficienti</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Finché non arrivano follower, reach o engagement reali non mostro classifiche o "miglior social/cliente" inventati. Collega gli account e raccogli le metriche (si raccolgono automaticamente ogni notte).
                  </p>
                  <Button className="mt-4" onClick={() => navigate("/social/auth")}>Vai alle autorizzazioni</Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Single client: charts */}
        {filterClient !== "all" && data?.singleClient && (
          <>
            {chartData.length > 0 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Andamento Follower</CardTitle></CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        {data?.accounts?.map((acc: any) => (
                          <Line key={acc.id} type="monotone" dataKey={`followers (${acc.platform})`} stroke={PLATFORM_COLORS[acc.platform] || "#666"} strokeWidth={2} dot={false} name={acc.platformName} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Engagement</CardTitle></CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        {data?.accounts?.map((acc: any) => (
                          <Bar key={acc.id} dataKey={`engagement (${acc.platform})`} fill={PLATFORM_COLORS[acc.platform] || "#666"} name={acc.platformName} radius={[4, 4, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
            {chartData.length === 0 && (
              <Card>
                <CardContent className="py-16 text-center">
                  <Eye className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground font-medium">Nessun dato analytics per questo cliente</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </BaseLayout>
  )
}
