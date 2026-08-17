import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronLeft, ChevronRight, Eye, Copy, ArrowRightLeft, CalendarDays, Clock } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
} from "date-fns"
import { it } from "date-fns/locale"

const PLATFORM_META: Record<string, { color: string; short: string; chip: string }> = {
  INSTAGRAM: { color: "bg-pink-500", short: "IG", chip: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30" },
  FACEBOOK: { color: "bg-blue-600", short: "FB", chip: "bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-600/30" },
  LINKEDIN: { color: "bg-sky-600", short: "IN", chip: "bg-sky-600/15 text-sky-700 dark:text-sky-300 border-sky-600/30" },
  TIKTOK: { color: "bg-zinc-800", short: "TT", chip: "bg-zinc-800/15 text-zinc-800 dark:text-zinc-200 border-zinc-500/30" },
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "opacity-50",
  PENDING_APPROVAL: "ring-1 ring-yellow-500/50",
  SCHEDULED: "",
  PUBLISHED: "opacity-90",
  FAILED: "ring-1 ring-red-500/60",
}

/** Group a post into one calendar entry carrying all its target platforms + times */
function groupPostsByContent(posts: any[]) {
  const entries: {
    key: string
    post: any
    platforms: { platform: string; time: Date | null }[]
    clientName: string
  }[] = []

  for (const p of posts) {
    const targets = p.targets?.length
      ? p.targets
      : [{ socialAccount: { platform: "?" } }]
    const timeRaw = p.scheduledAt || p.publishedAt
    const platforms = targets.map((t: any) => ({
      platform: t.socialAccount?.platform || "?",
      time: timeRaw ? new Date(timeRaw) : null,
    }))
    entries.push({
      key: `post-${p.id}`,
      post: p,
      platforms,
      clientName: p.contact?.name || "",
    })
  }
  return entries
}

export default function GeneralSocialCalendar() {
  const navigate = useNavigate()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [view, setView] = useState<"month" | "week">("month")
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [posts, setPosts] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPlatform, setFilterPlatform] = useState("all")
  const [filterClient, setFilterClient] = useState("all")
  const [transferPost, setTransferPost] = useState<any>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  useEffect(() => {
    socialAPI.getDashboard()
      .then(res => setClients(res.data.clients || []))
      .catch(() => {})
  }, [])

  const fetchPosts = () => {
    const start = startOfWeek(view === "week" ? weekStart : startOfMonth(currentMonth), { weekStartsOn: 1 })
    const end = view === "week"
      ? endOfWeek(weekStart, { weekStartsOn: 1 })
      : endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })

    setLoading(true)
    socialAPI.getCalendar({
      contactId: filterClient !== "all" ? parseInt(filterClient) : undefined,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    })
      .then(res => setPosts(res.data))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPosts() }, [currentMonth, weekStart, view, filterClient])

  const handleDuplicate = async (postId: number) => {
    try {
      await socialAPI.duplicatePost(postId)
      toast.success("Post duplicato")
      fetchPosts()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleTransfer = async (postId: number, targetContactId: number) => {
    try {
      await socialAPI.duplicatePost(postId, targetContactId)
      await socialAPI.deletePost(postId)
      toast.success("Post trasferito")
      setTransferPost(null)
      fetchPosts()
    } catch (err: any) { toast.error(err.message) }
  }

  const entries = useMemo(() => groupPostsByContent(posts), [posts])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentMonth])

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }))
  }

  const navPrev = () => {
    if (view === "week") setWeekStart(subWeeks(weekStart, 1))
    else setCurrentMonth(subMonths(currentMonth, 1))
  }
  const navNext = () => {
    if (view === "week") setWeekStart(addWeeks(weekStart, 1))
    else setCurrentMonth(addMonths(currentMonth, 1))
  }
  const headerLabel = view === "week"
    ? `${format(weekStart, "d MMM", { locale: it })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: it })}`
    : format(currentMonth, "MMMM yyyy", { locale: it })

  const getEntriesForDay = (day: Date) => {
    return entries
      .filter(e => {
        const onDay = e.platforms.some(t => t.time && isSameDay(t.time, day))
        if (!onDay) return false
        if (filterPlatform !== "all" && !e.platforms.some(t => t.platform === filterPlatform)) return false
        return true
      })
      .sort((a, b) => {
        const ta = a.platforms.find(t => t.time)?.time?.getTime() || 0
        const tb = b.platforms.find(t => t.time)?.time?.getTime() || 0
        return ta - tb
      })
  }

  const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
  const weekViewDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i))
    return days
  }, [weekStart])

  return (
    <BaseLayout title="Calendario Social" description="Panoramica di tutti i post programmati — per piattaforma e orario">
      <div className="px-4 lg:px-6 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
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
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                <SelectItem value="FACEBOOK">Facebook</SelectItem>
                <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                <SelectItem value="TIKTOK">TikTok</SelectItem>
              </SelectContent>
            </Select>
            {loading && <span className="text-xs text-muted-foreground">Caricamento...</span>}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              <button
                type="button"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === "month" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setView("month")}
              >
                Mese
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === "week" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setView("week")}
              >
                Settimana
              </button>
            </div>

            <Button variant="outline" size="icon" className="h-8 w-8" onClick={navPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold capitalize min-w-32 text-center">
              {headerLabel}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={navNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="ml-1 text-xs" onClick={goToToday}>
              Oggi
            </Button>
          </div>
        </div>

        {view === "month" && (
        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {weekDays.map(d => (
              <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayEntries = getEntriesForDay(day)
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)

              return (
                <div
                  key={i}
                  className={`min-h-36 p-1.5 border-b border-r transition-colors ${
                    !inMonth ? "bg-muted/20" : "bg-card"
                  } ${today ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`}
                >
                  <button
                    type="button"
                    className={`text-xs font-medium mb-1.5 ${today
                      ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
                      : inMonth ? "text-foreground" : "text-muted-foreground/50"
                    } ${dayEntries.length > 0 ? "hover:underline cursor-pointer" : ""}`}
                    title={dayEntries.length > 0 ? "Vedi tutti i post del giorno" : undefined}
                    onClick={() => { if (dayEntries.length > 0) setSelectedDay(day) }}
                  >
                    {format(day, "d")}
                  </button>
                  <div className="space-y-1">
                    {dayEntries.slice(0, 4).map(e => (
                        <DropdownMenu key={e.key}>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={`w-full text-left text-[11px] px-1.5 py-1 rounded-md border cursor-pointer hover:brightness-95 transition-colors bg-card ${STATUS_STYLES[e.post.status] || ""}`}
                              title={`${e.clientName} · ${e.post.content || ""}`}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                                  {e.platforms.map((t, i) => {
                                    const pm = PLATFORM_META[t.platform] || { color: "bg-gray-400", short: "?", chip: "bg-muted text-muted-foreground border-border" }
                                    return (
                                      <span key={i} className="flex items-center gap-0.5">
                                        <span className={`shrink-0 font-bold text-[9px] px-1 leading-4 rounded ${pm.color} text-white`}>{pm.short}</span>
                                        {t.time && <span className="font-semibold tabular-nums">{format(t.time, "HH:mm")}</span>}
                                      </span>
                                    )
                                  })}
                                  <span className="truncate font-medium opacity-80">{e.clientName.split(" ")[0]}</span>
                                </span>
                                <span className="block truncate opacity-70 mt-0.5">{e.post.content?.slice(0, 28) || "—"}</span>
                              </span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => navigate(`/social/${e.post.contactId}/posts/${e.post.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> Apri
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/social/${e.post.contactId}?tab=ced&sub=programmazione`)}>
                              Piano cliente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(e.post.id)}>
                              <Copy className="h-4 w-4 mr-2" /> Duplica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTransferPost(e.post)}>
                              <ArrowRightLeft className="h-4 w-4 mr-2" /> Trasferisci a...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    ))}
                    {dayEntries.length > 4 && (
                      <button
                        type="button"
                        className="text-[10px] text-primary hover:underline font-medium pl-1"
                        onClick={() => setSelectedDay(day)}
                      >
                        +{dayEntries.length - 4} altri
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        )}

        {view === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekViewDays.map((day, i) => {
            const dayEntries = getEntriesForDay(day)
            const today = isToday(day)
            const label = weekDays[i]
            return (
              <div
                key={i}
                className={`min-h-64 rounded-xl border p-2 space-y-1.5 ${today ? "border-primary ring-1 ring-primary/20 bg-primary/5" : "bg-card"}`}
              >
                <div className="flex items-center justify-between pb-1 border-b">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">{label}</span>
                  <span className={`text-sm font-semibold ${today ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center" : ""}`}>
                    {format(day, "d")}
                  </span>
                </div>
                {dayEntries.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/50 pt-2">—</p>
                ) : (
                  dayEntries.map(e => (
                    <DropdownMenu key={e.key}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={`w-full text-left text-[11px] px-2 py-1.5 rounded-md border cursor-pointer hover:brightness-95 transition-colors bg-card ${STATUS_STYLES[e.post.status] || ""}`}
                          title={`${e.clientName} · ${e.post.content || ""}`}
                        >
                          <span className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                            {e.platforms.map((t, j) => {
                              const pm = PLATFORM_META[t.platform] || { color: "bg-gray-400", short: "?", chip: "bg-muted text-muted-foreground border-border" }
                              return (
                                <span key={j} className="flex items-center gap-0.5">
                                  <span className={`shrink-0 font-bold text-[9px] px-1 leading-4 rounded ${pm.color} text-white`}>{pm.short}</span>
                                  {t.time && <span className="font-semibold tabular-nums">{format(t.time, "HH:mm")}</span>}
                                </span>
                              )
                            })}
                          </span>
                          <span className="block truncate font-medium mt-0.5">{e.post.content?.slice(0, 30) || "—"}</span>
                          <span className="block truncate opacity-60 text-[10px]">{e.clientName}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => navigate(`/social/${e.post.contactId}/posts/${e.post.id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> Apri
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/social/${e.post.contactId}?tab=ced&sub=programmazione`)}>
                          Piano cliente
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(e.post.id)}>
                          <Copy className="h-4 w-4 mr-2" /> Duplica
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTransferPost(e.post)}>
                          <ArrowRightLeft className="h-4 w-4 mr-2" /> Trasferisci a...
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ))
                )}
              </div>
            )
          })}
        </div>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          {Object.entries(PLATFORM_META).map(([p, m]) => (
            <div key={p} className="flex items-center gap-1.5">
              <span className={`w-5 text-center text-[9px] font-bold rounded text-white ${m.color}`}>{m.short}</span>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </div>
          ))}
          <div className="w-px h-3 bg-border mx-1" />
          <span>Ogni chip = un contenuto · i badge mostrano social e orario di ogni uscita</span>
        </div>

        <Dialog open={!!transferPost} onOpenChange={open => { if (!open) setTransferPost(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Trasferisci post a...</DialogTitle>
            </DialogHeader>
            <div className="space-y-1 py-2 max-h-64 overflow-y-auto">
              {clients.filter(c => c.id !== transferPost?.contactId).length > 0 ? (
                clients.filter(c => c.id !== transferPost?.contactId).map((c: any) => (
                  <button key={c.id} className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-sm" onClick={() => handleTransfer(transferPost.id, c.id)}>
                    {c.name}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nessun altro cliente disponibile</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Day detail — all posts of the selected day (handles many overlapping posts) */}
        <Dialog open={!!selectedDay} onOpenChange={open => { if (!open) setSelectedDay(null) }}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {selectedDay ? format(selectedDay, "EEEE d MMMM yyyy", { locale: it }) : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto">
              {selectedDay && getEntriesForDay(selectedDay).length > 0 ? (
                getEntriesForDay(selectedDay).map(e => (
                  <div key={e.key} className={`rounded-lg border p-3 ${STATUS_STYLES[e.post.status] || ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mb-1">
                          {e.platforms.map((t, i) => {
                            const pm = PLATFORM_META[t.platform] || { color: "bg-gray-400", short: "?", chip: "bg-muted text-muted-foreground border-border" }
                            return (
                              <span key={i} className="flex items-center gap-0.5">
                                <span className={`shrink-0 font-bold text-[9px] px-1 leading-4 rounded ${pm.color} text-white`}>{pm.short}</span>
                                {t.time && <span className="font-semibold tabular-nums text-xs">{format(t.time, "HH:mm")}</span>}
                              </span>
                            )
                          })}
                          <Badge variant="outline" className="text-[10px]">{e.post.status}</Badge>
                        </div>
                        <p className="text-sm break-words">{e.post.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{e.clientName}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelectedDay(null); navigate(`/social/${e.post.contactId}/posts/${e.post.id}`) }}>
                          <Eye className="h-3 w-3 mr-1" /> Apri
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Nessun post in questo giorno.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </BaseLayout>
  )
}
