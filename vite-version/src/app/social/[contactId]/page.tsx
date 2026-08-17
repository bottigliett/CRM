import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipTrigger as UiTooltipTrigger } from "@/components/ui/tooltip"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Plus,
  Calendar as CalendarIcon,
  CalendarDays,
  TableProperties,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
  Unplug,
  MoreVertical,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  Hash,
  Trash2,
  Settings,
  Clock,
  Copy,
  ArrowRightLeft,
  Lightbulb,
  Sparkles,
  Wand2,
  Send,
  BarChart3,
  MessageCircle,
  Share2,
  Bookmark,
  Megaphone,
  Upload,
  Film,
  Image as ImageIcon,
  X,
  Save,
  Globe,
  AlertTriangle,
  Info,
  FileText,
  Mail,
  Phone,
  Loader2,
} from "lucide-react"
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
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { socialAPI } from "@/lib/social-api"
import { contactsAPI } from "@/lib/contacts-api"
import { PlatformPreview, formatScheduleLabel } from "./components/platform-preview"
import { AiFeedback } from "./components/ai-feedback"
import { ReviewDialog } from "./components/review-dialog"
import { ContextEventsCard } from "./components/context-events-card"
import { ClarifyingQuestionsDialog } from "./components/clarifying-questions-dialog"
import { toast } from "sonner"
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns"
import { it } from "date-fns/locale"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table"

// === Constants ===

const PLATFORM_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  INSTAGRAM: { bg: "bg-pink-50 dark:bg-pink-950", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  FACEBOOK: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-600" },
  LINKEDIN: { bg: "bg-sky-50 dark:bg-sky-950", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-600" },
  TIKTOK: { bg: "bg-gray-50 dark:bg-gray-900", text: "text-gray-700 dark:text-gray-300", dot: "bg-gray-800" },
}

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: "#E1306C", FACEBOOK: "#1877F2", LINKEDIN: "#0A66C2", TIKTOK: "#000000",
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Bozza", variant: "secondary" },
  PENDING_APPROVAL: { label: "In attesa", variant: "outline" },
  APPROVED: { label: "Approvato", variant: "default" },
  SCHEDULED: { label: "Programmato", variant: "default" },
  PUBLISHING: { label: "Pubblicando...", variant: "default" },
  PUBLISHED: { label: "Pubblicato", variant: "default" },
  FAILED: { label: "Fallito", variant: "destructive" },
  ARCHIVED: { label: "Archiviato", variant: "secondary" },
}

const PLATFORMS_OAUTH = [
  { key: "instagram", label: "Instagram", icon: "IG", color: "bg-pink-500 text-white" },
  { key: "facebook", label: "Facebook", icon: "FB", color: "bg-blue-600 text-white" },
  { key: "linkedin", label: "LinkedIn", icon: "IN", color: "bg-sky-600 text-white" },
  { key: "tiktok", label: "TikTok", icon: "TT", color: "bg-black text-white" },
]

const STATUS_CAL: Record<string, string> = {
  DRAFT: "opacity-50",
  PENDING_APPROVAL: "border-l-2 border-yellow-500",
  SCHEDULED: "",
  PUBLISHED: "opacity-75",
  FAILED: "border-l-2 border-red-500",
}

const PERIODS = [
  { value: "7", label: "7 giorni" },
  { value: "30", label: "30 giorni" },
  { value: "90", label: "90 giorni" },
]

// === Main Component ===

export default function SocialClientHub() {
  const { contactId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const cid = parseInt(contactId!)

  const [loading, setLoading] = useState(true)
  const [contact, setContact] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [ideas, setIdeas] = useState<any[]>([])

  // URL-persisted tab state
  const tab = searchParams.get("tab") || "ced"
  const cedSubTab = (searchParams.get("sub") || "idee") as "idee" | "programmazione"
  const cedView = (searchParams.get("view") || "calendar") as "table" | "calendar"
  const focusPostId = searchParams.get("focus") ? parseInt(searchParams.get("focus")!) : null
  const focusMonth = searchParams.get("month") || null
  // Transient highlight: lasts a few seconds, then clears itself and the URL params
  const [highlightPostId, setHighlightPostId] = useState<number | null>(focusPostId)
  useEffect(() => {
    if (!focusPostId) { setHighlightPostId(null); return }
    setHighlightPostId(focusPostId)
    const t = setTimeout(() => {
      setHighlightPostId(null)
      setSearchParams(p => { p.delete("focus"); p.delete("month"); return p }, { replace: true })
    }, 4000)
    return () => clearTimeout(t)
  }, [focusPostId])
  const setTab = (v: string) => setSearchParams(p => { p.set("tab", v); return p }, { replace: true })
  const setCedSubTab = (v: string) => setSearchParams(p => { p.set("sub", v); return p }, { replace: true })
  const setCedView = (v: "table" | "calendar") => setSearchParams(p => { p.set("view", v); return p }, { replace: true })

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      contactsAPI.getContactById(cid).then(r => setContact(r.data)),
      socialAPI.getAccounts(cid).then(r => setAccounts(r.data)),
      socialAPI.getPosts({ contactId: cid, stage: 'PRODUCTION', limit: 200 }).then(r => setPosts(r.data.posts || r.data || [])),
      socialAPI.getPosts({ contactId: cid, stage: 'IDEA', limit: 200 }).then(r => setIdeas(r.data.posts || r.data || [])),
    ])
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [cid])

  useEffect(() => {
    fetchData()
    if (searchParams.get("success")) toast.success(`Account ${searchParams.get("platform") || ""} collegato!`)
    if (searchParams.get("error")) toast.error(`Errore OAuth: ${searchParams.get("error")}`)
  }, [cid])

  if (loading) {
    return (
      <BaseLayout title="Social Media">
        <div className="px-4 lg:px-6 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </BaseLayout>
    )
  }

  return (
    <BaseLayout title={contact?.name || "Cliente"} description="Gestione social media">
      <div className="px-4 lg:px-6 space-y-5">
        {/* Header — client identity + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0 -ml-2 text-muted-foreground" onClick={() => navigate("/social")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg shrink-0">
              {(contact?.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold truncate leading-tight">{contact?.name || "Cliente"}</h2>
              {contact?.email && <p className="text-xs text-muted-foreground truncate">{contact.email}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => navigate(`/social/${cid}/plan`)}>
              <CalendarDays className="h-4 w-4 mr-1" /> Piano
            </Button>
            <Button size="sm" className="shrink-0" onClick={() => navigate(`/social/${cid}/compose`)}>
              <Plus className="h-4 w-4 mr-1" /> Nuovo Post
            </Button>
          </div>
        </div>

        {/* Navigation tabs — physical buttons with thick border */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto w-full justify-start gap-2 bg-transparent p-0 overflow-x-auto">
            <TabsTrigger value="ced" className="gap-1.5 border-2 border-input rounded-xl px-4 py-2 font-medium text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground hover:bg-muted hover:text-foreground"><Lightbulb className="h-4 w-4" /> CED</TabsTrigger>
            <TabsTrigger value="brief" className="gap-1.5 border-2 border-input rounded-xl px-4 py-2 font-medium text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground hover:bg-muted hover:text-foreground"><Users className="h-4 w-4" /> Brief</TabsTrigger>
            <TabsTrigger value="accounts" className="gap-1.5 border-2 border-input rounded-xl px-4 py-2 font-medium text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground hover:bg-muted hover:text-foreground"><Globe className="h-4 w-4" /> Account</TabsTrigger>
            <TabsTrigger value="storico" className="gap-1.5 border-2 border-input rounded-xl px-4 py-2 font-medium text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground hover:bg-muted hover:text-foreground"><Clock className="h-4 w-4" /> Storico</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 border-2 border-input rounded-xl px-4 py-2 font-medium text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground hover:bg-muted hover:text-foreground"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
            <TabsTrigger value="report" className="gap-1.5 border-2 border-input rounded-xl px-4 py-2 font-medium text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground hover:bg-muted hover:text-foreground"><FileText className="h-4 w-4" /> Report</TabsTrigger>
          </TabsList>

          {/* === CED Tab === */}
          <TabsContent value="ced" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                <button
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${cedSubTab === "idee" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setCedSubTab("idee")}
                >
                  Idee
                </button>
                <button
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${cedSubTab === "programmazione" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setCedSubTab("programmazione")}
                >
                  Programmazione
                </button>
              </div>
              <div className="flex gap-1">
                <Button variant={cedView === "table" ? "default" : "ghost"} size="sm" onClick={() => setCedView("table")}>
                  <TableProperties className="h-4 w-4" />
                </Button>
                <Button variant={cedView === "calendar" ? "default" : "ghost"} size="sm" onClick={() => setCedView("calendar")}>
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {cedSubTab === "idee" ? (
              cedView === "calendar" ? (
                <CedIdeeCalendar ideas={ideas} cid={cid} onRefresh={fetchData} accounts={accounts} focusPostId={highlightPostId} focusMonth={focusMonth} />
              ) : (
                <CedIdeeTable ideas={ideas} cid={cid} onRefresh={fetchData} accounts={accounts} />
              )
            ) : cedView === "table" ? (
              <CedTable posts={posts} cid={cid} navigate={navigate} onRefresh={fetchData} accounts={accounts} />
            ) : (
              <CedCalendar posts={posts} cid={cid} navigate={navigate} onRefresh={fetchData} accounts={accounts} focusPostId={highlightPostId} focusMonth={focusMonth} />
            )}
          </TabsContent>

          {/* === Brief Tab === */}
          <TabsContent value="brief" className="animate-in fade-in duration-300">
            <BriefTab contactId={cid} contact={contact} />
          </TabsContent>

          {/* === Accounts Tab === */}
          <TabsContent value="accounts" className="animate-in fade-in duration-300">
            <AccountsTab contactId={cid} accounts={accounts} onRefresh={fetchData} />
          </TabsContent>

          {/* === Storico Tab === */}
          <TabsContent value="storico" className="animate-in fade-in duration-300">
            <StoricoTab posts={posts.filter(p => p.status === "PUBLISHED")} cid={cid} />
          </TabsContent>

          {/* === Analytics Tab === */}
          <TabsContent value="analytics" className="animate-in fade-in duration-300">
            <AnalyticsTab contactId={cid} />
          </TabsContent>

          {/* === Report Tab === */}
          <TabsContent value="report" className="animate-in fade-in duration-300">
            <ReportTab contactId={cid} />
          </TabsContent>
        </Tabs>

      </div>
    </BaseLayout>
  )
}

// === CED Master — Idee Table ===

const IDEA_STATUSES = ["Idea", "Da fare", "Programmato", "Pubblicato", "Archiviato"] as const
const IDEA_STATUS_COLORS: Record<string, string> = {
  "Idea": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  "Da fare": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  "Programmato": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "Pubblicato": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  "Archiviato": "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
}
const IDEA_CATEGORIES = ["Educativo", "Informativo", "Ispirazionale", "Promozionale", "Territoriale", "Testimonianza", "Intrattenimento"] as const
const IDEA_CATEGORY_COLORS: Record<string, string> = {
  "Educativo": "bg-blue-600 text-white",
  "Informativo": "bg-teal-600 text-white",
  "Ispirazionale": "bg-purple-600 text-white",
  "Promozionale": "bg-red-600 text-white",
  "Territoriale": "bg-amber-600 text-white",
  "Testimonianza": "bg-emerald-600 text-white",
  "Intrattenimento": "bg-pink-600 text-white",
}
const IDEA_STATUS_DOT: Record<string, string> = {
  "Idea": "bg-purple-500", "Da fare": "bg-yellow-500", "Programmato": "bg-blue-500", "Pubblicato": "bg-green-500", "Archiviato": "bg-gray-400",
}
const IDEA_STATUS_TEXT: Record<string, string> = {
  "Idea": "text-purple-600", "Da fare": "text-yellow-600", "Programmato": "text-blue-600", "Pubblicato": "text-green-600", "Archiviato": "text-gray-500",
}
const IDEA_TYPES: Record<string, string> = {
  POST: "POST SINGOLO", STORY: "STORIA", REEL: "REEL", CAROUSEL: "CAROSELLO", IMAGE: "IMMAGINE",
}
const IDEA_TYPES_EMOJI: Record<string, string> = {
  POST: "📸 Post singolo", STORY: "⏰ Storia", REEL: "🍿 Reel", CAROUSEL: "🎠 Carosello", IMAGE: "📷 Immagine",
}
const PLATFORM_BADGE: Record<string, string> = {
  FACEBOOK: "bg-blue-500 text-white",
  INSTAGRAM: "bg-gradient-to-r from-pink-500 to-purple-500 text-white",
  LINKEDIN: "bg-sky-600 text-white",
  TIKTOK: "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
}
const IDEA_PLATFORMS = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK"] as const
const PLATFORM_LABELS: Record<string, string> = { FACEBOOK: "Facebook", INSTAGRAM: "Instagram", LINKEDIN: "LinkedIn", TIKTOK: "TikTok" }
const IDEA_PHASES = ["Fase 1", "Fase 2", "Fase 3", "Fase 4"] as const

// Notion-style color palette for custom options
const NOTION_COLORS = [
  { name: "Grigio", class: "bg-gray-200/70 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  { name: "Marrone", class: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" },
  { name: "Arancione", class: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200" },
  { name: "Giallo", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200" },
  { name: "Verde", class: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200" },
  { name: "Blu", class: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200" },
  { name: "Viola", class: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200" },
  { name: "Rosa", class: "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200" },
  { name: "Rosso", class: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200" },
]

const FORMAT_DEFAULTS = [
  { label: "POST", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200" },
  { label: "STORY", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" },
  { label: "REEL", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200" },
  { label: "CAROUSEL", color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200" },
  { label: "IMAGE", color: "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200" },
]
const CATEGORY_DEFAULTS = IDEA_CATEGORIES.map(c => ({ label: c, color: IDEA_CATEGORY_COLORS[c] || NOTION_COLORS[0].class }))
const STATUS_DEFAULTS = [
  { label: "Idea", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200" },
  { label: "Da fare", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200" },
  { label: "Programmato", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200" },
  { label: "Pubblicato", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200" },
  { label: "Archiviato", color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200" },
]
const PHASE_DEFAULTS = IDEA_PHASES.map((f, i) => ({ label: f, color: NOTION_COLORS[i % NOTION_COLORS.length].class }))

// Shared helpers
const parseCategories = (cat: string | null) => {
  try { return JSON.parse(cat || "[]") } catch { return [] }
}
const parsePlatforms = (pc: any): string[] => {
  if (!pc) return []
  try {
    const p = typeof pc.platforms === "string" ? JSON.parse(pc.platforms) : pc.platforms
    return Array.isArray(p) ? p : []
  } catch { return [] }
}

type IdeaFormData = {
  content: string; postType: string; ideaCategory: string; ideaPhase: string; ideaStatus: string;
  platforms: string[]; scheduledAt: string;
  ideaScript: string; ideaCaption: string; ideaObiettivo: string; ideaCreativita: string; ideaNotes: string;
}
const emptyIdea = (date?: string): IdeaFormData => ({
  content: "", postType: "", ideaCategory: "[]", ideaPhase: "", ideaStatus: "", platforms: [], scheduledAt: date || "",
  ideaScript: "", ideaCaption: "", ideaObiettivo: "", ideaCreativita: "", ideaNotes: "",
})

// Shared idea actions
function useIdeaActions(cid: number, onRefresh: () => void) {
  const [creating, setCreating] = useState(false)

  const handleCreate = async (data: IdeaFormData, onDone: () => void) => {
    if (!data.content.trim()) return toast.error("Il nome è obbligatorio")

    setCreating(true)
    try {
      await socialAPI.createPost({
        contactId: cid, content: data.content, postType: data.postType, stage: "IDEA",
        ideaCategory: data.ideaCategory, ideaPhase: data.ideaPhase, ideaStatus: data.ideaStatus,
        scheduledAt: data.scheduledAt || undefined,
        platformContent: data.platforms.length ? { platforms: JSON.stringify(data.platforms) } : undefined,
        ideaScript: data.ideaScript || undefined, ideaCaption: data.ideaCaption || undefined,
        ideaObiettivo: data.ideaObiettivo || undefined, ideaCreativita: data.ideaCreativita || undefined,
        ideaNotes: data.ideaNotes || undefined,
      })
      toast.success("Idea creata")
      onDone()
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
    finally { setCreating(false) }
  }

  const handleUpdate = async (id: number, data: IdeaFormData, onDone: () => void) => {
    setCreating(true)
    try {
      await socialAPI.updatePost(id, {
        content: data.content, postType: data.postType,
        ideaCategory: data.ideaCategory, ideaPhase: data.ideaPhase, ideaStatus: data.ideaStatus,
        scheduledAt: data.scheduledAt || undefined,
        ideaScript: data.ideaScript, ideaCaption: data.ideaCaption,
        ideaObiettivo: data.ideaObiettivo, ideaCreativita: data.ideaCreativita, ideaNotes: data.ideaNotes,
      })
      toast.success("Idea aggiornata")
      onDone()
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
    finally { setCreating(false) }
  }

  const handleInlineStatus = async (id: number, newStatus: string) => {
    try {
      await socialAPI.updatePost(id, { ideaStatus: newStatus })
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDuplicate = async (id: number) => {
    try { await socialAPI.duplicatePost(id); toast.success("Idea duplicata"); onRefresh() }
    catch (err: any) { toast.error(err.message) }
  }

  const handleDelete = async (id: number) => {
    try { await socialAPI.deletePost(id); toast.success("Idea eliminata"); onRefresh() }
    catch (err: any) { toast.error(err.message) }
  }

  return { creating, handleCreate, handleUpdate, handleInlineStatus, handleDuplicate, handleDelete }
}

// Helper: DB idea record → IdeaFormData
const ideaToForm = (idea: any): IdeaFormData => ({
  content: idea.content || "",
  postType: idea.postType || "",
  ideaCategory: idea.ideaCategory || "[]",
  ideaPhase: idea.ideaPhase || "",
  ideaStatus: idea.ideaStatus || "",
  platforms: parsePlatforms(idea.platformContent),
  scheduledAt: idea.scheduledAt ? new Date(idea.scheduledAt).toISOString().slice(0, 19) : "",
  ideaScript: idea.ideaScript || "",
  ideaCaption: idea.ideaCaption || "",
  ideaObiettivo: idea.ideaObiettivo || "",
  ideaCreativita: idea.ideaCreativita || "",
  ideaNotes: idea.ideaNotes || "",
})

// Notion-style property row
function PropRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 px-1 hover:bg-muted/50 rounded-md -mx-1 group">
      <div className="flex items-center gap-2 min-w-[140px] shrink-0 text-muted-foreground mt-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// Notion-style select — Popover + Command (cmdk) for proper shadcn look
function NotionSelect({ mode = "single", value, onChange, storageKey, defaults, placeholder, fieldLabel, renderLabel }: {
  mode?: "single" | "multi"; value: string[]; onChange: (v: string[]) => void
  storageKey: string; defaults: { label: string; color: string }[]
  placeholder?: string; fieldLabel?: string; renderLabel?: (v: string) => string
}) {
  const [open, setOpen] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [renaming, setRenaming] = useState("")
  const [showColors, setShowColors] = useState(false)
  const [search, setSearch] = useState("")

  const [options, setOptions] = useState<{ label: string; color: string }[]>(() => {
    try { const s = localStorage.getItem(storageKey); return s ? JSON.parse(s) : [...defaults] } catch { return [...defaults] }
  })

  const save = useCallback((opts: { label: string; color: string }[]) => {
    setOptions(opts); localStorage.setItem(storageKey, JSON.stringify(opts))
  }, [storageKey])

  const canCreate = search.trim() && !options.some(o => o.label.toLowerCase() === search.trim().toLowerCase())

  const toggle = (label: string) => {
    if (mode === "single") { onChange(value.includes(label) ? [] : [label]); if (!value.includes(label)) setOpen(false) }
    else { onChange(value.includes(label) ? value.filter(v => v !== label) : [...value, label]) }
  }
  const create = () => {
    const label = search.trim(); if (!label) return
    save([...options, { label, color: NOTION_COLORS[options.length % NOTION_COLORS.length].class }])
    toggle(label); setSearch("")
  }
  const remove = (label: string) => { save(options.filter(o => o.label !== label)); if (value.includes(label)) onChange(value.filter(v => v !== label)); setMenuFor(null) }
  const doRename = (oldLabel: string) => {
    const nl = renaming.trim(); if (!nl || nl === oldLabel || options.some(o => o.label === nl)) return
    save(options.map(o => o.label === oldLabel ? { ...o, label: nl } : o))
    if (value.includes(oldLabel)) onChange(value.map(v => v === oldLabel ? nl : v)); setMenuFor(null)
  }
  const recolor = (label: string, color: string) => save(options.map(o => o.label === label ? { ...o, color } : o))
  const getColor = (label: string) => options.find(o => o.label === label)?.color || NOTION_COLORS[0].class
  const display = (label: string) => renderLabel?.(label) || label

  return (
    <Popover open={open} onOpenChange={v => { setOpen(v); if (!v) { setMenuFor(null); setSearch("") } }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" role="combobox" aria-expanded={open} type="button"
          className="justify-start h-auto min-h-[36px] px-2 py-1.5 font-normal gap-2 w-fit">
          <span className="flex flex-wrap gap-1.5 items-center">
            {value.length > 0 ? value.map(v => (
              <span key={v} className={`px-2 py-0.5 rounded text-xs font-medium ${getColor(v)}`}>{display(v)}</span>
            )) : <span className="text-muted-foreground">{placeholder || "Vuoto"}</span>}
          </span>
          <ChevronRight className="size-4 opacity-50 rotate-90 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cerca un'opzione..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Nessuna opzione trovata.</CommandEmpty>
            <CommandGroup heading={mode === "multi" ? "Seleziona opzioni" : "Seleziona un'opzione"}>
              {options
                .filter(o => !search.trim() || (renderLabel?.(o.label) || o.label).toLowerCase().includes(search.toLowerCase()))
                .map(opt => (
                <div key={opt.label}>
                  <CommandItem value={opt.label} onSelect={() => toggle(opt.label)} className="group">
                    {mode === "multi" && <Checkbox checked={value.includes(opt.label)} className="h-4 w-4 shrink-0 pointer-events-none" />}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>{display(opt.label)}</span>
                    {mode === "single" && value.includes(opt.label) && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                    <button type="button"
                      onClick={e => { e.stopPropagation(); setMenuFor(menuFor === opt.label ? null : opt.label); setRenaming(opt.label); setShowColors(false) }}
                      className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted-foreground/10 transition-opacity shrink-0">
                      <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </CommandItem>
                  {menuFor === opt.label && (
                    <div className="ml-8 mr-2 mb-1 p-2 rounded-md bg-muted/50 space-y-2 text-sm">
                      <div className="flex gap-1.5">
                        <Input value={renaming} onChange={e => setRenaming(e.target.value)} className="h-7 text-xs flex-1"
                          onKeyDown={e => { if (e.key === "Enter") doRename(opt.label) }} />
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs shrink-0" onClick={() => doRename(opt.label)}>Rinomina</Button>
                      </div>
                      <div>
                        <button type="button" className="text-xs text-muted-foreground hover:text-foreground mb-1.5" onClick={() => setShowColors(!showColors)}>
                          {showColors ? "▾ Nascondi colori" : "▸ Cambia colore"}
                        </button>
                        {showColors && (
                          <div className="flex flex-wrap gap-1.5">
                            {NOTION_COLORS.map(c => (
                              <button key={c.name} type="button" title={c.name}
                                className={`w-5 h-5 rounded-full ${c.class} ring-2 ${opt.color === c.class ? "ring-foreground" : "ring-transparent"} hover:ring-foreground/50 transition-all`}
                                onClick={() => recolor(opt.label, c.class)} />
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" className="text-xs text-destructive hover:underline" onClick={() => remove(opt.label)}>Elimina opzione</button>
                    </div>
                  )}
                </div>
              ))}
            </CommandGroup>
            {canCreate && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={create}>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    Crea {fieldLabel || "opzione"} <span className={`px-2 py-0.5 rounded text-xs font-medium ${NOTION_COLORS[options.length % NOTION_COLORS.length].class}`}>{search.trim()}</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Platform multi-select (fixed options, no custom — API constraint)
function PlatformMultiSelect({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const toggle = (p: string) => onChange(values.includes(p) ? values.filter(x => x !== p) : [...values, p])
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" role="combobox" aria-expanded={open} type="button"
          className="justify-start h-auto min-h-[36px] px-2 py-1.5 font-normal gap-2 w-fit">
          <span className="flex flex-wrap gap-1.5 items-center">
            {values.length > 0 ? values.map(p => (
              <span key={p} className={`px-2 py-0.5 rounded text-xs font-medium ${PLATFORM_BADGE[p] || "bg-muted text-foreground"}`}>{PLATFORM_LABELS[p] || p}</span>
            )) : <span className="text-muted-foreground">Vuoto</span>}
          </span>
          <ChevronRight className="size-4 opacity-50 rotate-90 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {IDEA_PLATFORMS.map(p => (
                <CommandItem key={p} value={p} onSelect={() => toggle(p)}>
                  <Checkbox checked={values.includes(p)} className="h-4 w-4 pointer-events-none" />
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLATFORM_BADGE[p]}`}>{PLATFORM_LABELS[p]}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function IdeaFormDialog({ open, onOpenChange, data, setData, onSubmit, creating, isEdit, cid, onDuplicate, onSchedule, canSchedule }: {
  open: boolean; onOpenChange: (v: boolean) => void; data: IdeaFormData; setData: (fn: (p: IdeaFormData) => IdeaFormData) => void
  onSubmit: () => void; creating: boolean; isEdit?: boolean; cid: number; onDuplicate?: () => void
  onSchedule?: () => void; canSchedule?: boolean
}) {
  const navigate = useNavigate()

  // Cmd+D to duplicate
  useEffect(() => {
    if (!open || !isEdit || !onDuplicate) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault()
        onDuplicate()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, isEdit, onDuplicate])

  const [aiSuggestLoading, setAiSuggestLoading] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const handleAiSuggest = async () => {
    setAiSuggestLoading(true)
    try {
      const res = await socialAPI.aiGenerateIdeas(cid, 1)
      const idea = res.data.ideas?.[0]
      if (!idea) { toast.error("Nessuna idea generata"); return }
      const caption = idea.hashtags?.length ? `${idea.caption || ""} ${idea.hashtags.join(" ")}`.trim() : (idea.caption || "")
      setData(p => ({
        ...p,
        content: idea.content || idea.title || p.content,
        postType: idea.postType || p.postType || "POST",
        ideaCaption: caption || p.ideaCaption,
        ideaStatus: p.ideaStatus || "Idea",
      }))
      toast.success("Idea suggerita da Mismo AI")
    } catch (err: any) { toast.error(err.message) }
    finally { setAiSuggestLoading(false) }
  }

  const [duplicateWarning, setDuplicateWarning] = useState<{ sameClient: { similar: boolean; matches: any[] }; otherClient: { similar: boolean; matches: any[] }; suggestion?: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState(false)
  const [aiHashtagsLoading, setAiHashtagsLoading] = useState(false)
  const [checkingSubmit, setCheckingSubmit] = useState(false)

  // Live duplicate check (debounced) while typing title / caption / script
  useEffect(() => {
    const text = `${data.content || ""} ${data.ideaCaption || ""} ${data.ideaScript || ""}`.trim()
    if (text.length < 3) { setDuplicateWarning(null); return }
    const t = setTimeout(async () => {
      try {
        const res = await socialAPI.aiCheckDuplicate(cid, text)
        setDuplicateWarning(res.data)
      } catch { /* keep previous warning on transient error */ }
    }, 500)
    return () => clearTimeout(t)
  }, [data.content, data.ideaCaption, data.ideaScript, cid])

  const handleAiHashtags = async () => {
    const base = data.ideaCaption?.replace(/#[\w\u00C0-\u024F]+/g, "").trim() || data.content
    if (!base) { toast.error("Scrivi prima una descrizione"); return }
    setAiHashtagsLoading(true)
    try {
      const res = await socialAPI.aiSuggestHashtags(base, cid)
      if (res.data.hashtags?.length) {
        setData(p => ({ ...p, ideaCaption: `${base} ${res.data.hashtags.join(" ")}`.trim() }))
        toast.success("Hashtag generati")
      }
    } catch (err: any) { toast.error(err.message) }
    finally { setAiHashtagsLoading(false) }
  }

  // Always re-check fresh on submit so a duplicate is caught even if the user
  // clicked "Crea Idea" before the debounced live check had finished.
  const handleSubmitWithCheck = async () => {
    const text = `${data.content || ""} ${data.ideaCaption || ""} ${data.ideaScript || ""}`.trim()
    if (text.length < 3) { onSubmit(); return }
    setCheckingSubmit(true)
    try {
      const res = await socialAPI.aiCheckDuplicate(cid, text)
      setDuplicateWarning(res.data)
      if (res.data.sameClient?.similar || res.data.otherClient?.similar) {
        setConfirmDialog(true)
      } else {
        onSubmit()
      }
    } catch {
      onSubmit() // never block saving if the check fails
    } finally {
      setCheckingSubmit(false)
    }
  }

  // Open the similar post in its client's calendar (at its month), highlighted
  const openSimilarPost = (m: any) => {
    const d = m.scheduledAt || m.publishedAt
    const month = d ? format(new Date(d), "yyyy-MM") : null
    const sub = m.stage === "IDEA" ? "idee" : "programmazione"
    const params = new URLSearchParams()
    params.set("tab", "ced")
    params.set("sub", sub)
    params.set("view", "calendar")
    if (month) params.set("month", month)
    params.set("focus", String(m.id))
    setConfirmDialog(false)
    onOpenChange(false)
    navigate(`/social/${m.contactId}?${params.toString()}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] w-full max-h-[96vh] overflow-y-auto p-0">
        {/* Title — large, auto-growing, no scrollbar */}
        <div className="px-16 pt-12 pb-4 relative">
          <div className="flex justify-end mb-2 gap-1">
            <UiTooltip>
              <UiTooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleAiSuggest} disabled={aiSuggestLoading}>
                  {aiSuggestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </UiTooltipTrigger>
              <UiTooltipContent side="top">Genera una nuova idea con il tono e i temi del cliente, evitando i contenuti già esistenti</UiTooltipContent>
            </UiTooltip>
            <UiTooltip>
              <UiTooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setShowReview(true)} disabled={!data.content.trim()}>
                  <Wand2 className="h-4 w-4" />
                </Button>
              </UiTooltipTrigger>
              <UiTooltipContent side="top">Riscrive e migliora il contenuto mantenendo tono e stile del cliente</UiTooltipContent>
            </UiTooltip>
          </div>
          <textarea
            value={data.content}
            onChange={e => setData(p => ({ ...p, content: e.target.value }))}
            placeholder="Titolo idea"
            className="w-full border-none text-4xl font-bold resize-none bg-transparent focus:outline-none placeholder:text-muted-foreground/30 min-h-[64px] overflow-hidden leading-tight"
            rows={1}
            ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px" } }}
            onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = t.scrollHeight + "px" }}
          />
        </div>

        {/* Live duplicate warning — red (same client) / yellow (other client) */}
        {(duplicateWarning?.sameClient?.similar || duplicateWarning?.otherClient?.similar) && (
          <div className={`mx-16 mb-2 rounded-lg border p-3 flex items-start gap-2.5 ${duplicateWarning.sameClient?.similar ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"}`}>
            <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${duplicateWarning.sameClient?.similar ? "text-red-600" : "text-amber-600"}`} />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${duplicateWarning.sameClient?.similar ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
                {duplicateWarning.sameClient?.similar ? "Duplicato di questo cliente" : "Contenuto simile di un altro cliente"}
              </p>
              {duplicateWarning.sameClient?.matches?.slice(0, 3).map((m: any, i: number) => (
                <button key={`s${i}`} type="button" onClick={() => openSimilarPost(m)}
                  className="block text-xs text-red-600 dark:text-red-400/80 mt-0.5 line-clamp-2 hover:underline text-left cursor-pointer">
                  Simile a: «{m.content}»
                </button>
              ))}
              {duplicateWarning.otherClient?.matches?.slice(0, 3).map((m: any, i: number) => (
                <button key={`o${i}`} type="button" onClick={() => openSimilarPost(m)}
                  className="block text-xs text-amber-600 dark:text-amber-400/80 mt-0.5 line-clamp-2 hover:underline text-left cursor-pointer">
                  Simile a: «{m.content}»{m.contactName ? ` — ${m.contactName}` : ""}
                </button>
              ))}
              {duplicateWarning.suggestion && (
                <p className="text-xs text-muted-foreground mt-1"><Sparkles className="h-3 w-3 inline mr-1" />Suggerimento: {duplicateWarning.suggestion}</p>
              )}
            </div>
          </div>
        )}

        {/* Properties */}
        <div className="px-16 pb-4 space-y-0.5">
          <PropRow icon={<CalendarIcon className="h-4 w-4" />} label="Data di pubbl.">
            <Input type="date" value={data.scheduledAt ? data.scheduledAt.slice(0, 10) : ""}
              onChange={e => setData(p => ({ ...p, scheduledAt: e.target.value ? `${e.target.value}T12:00:00` : "" }))}
              className="border-none h-8 p-0 focus-visible:ring-0 w-44" />
          </PropRow>

          <PropRow icon={<Users className="h-4 w-4" />} label="Piattaforma">
            <PlatformMultiSelect values={data.platforms} onChange={v => setData(p => ({ ...p, platforms: v }))} />
          </PropRow>

          <PropRow icon={<TableProperties className="h-4 w-4" />} label="Formato">
            <NotionSelect mode="single" value={data.postType ? [data.postType] : []} onChange={v => setData(p => ({ ...p, postType: v[0] || "" }))}
              storageKey={`social-${cid}-formato`} defaults={FORMAT_DEFAULTS} fieldLabel="formato" renderLabel={v => IDEA_TYPES_EMOJI[v] || v} />
          </PropRow>

          <PropRow icon={<Hash className="h-4 w-4" />} label="Categoria">
            <NotionSelect mode="multi"
              value={(() => { try { return JSON.parse(data.ideaCategory) as string[] } catch { return [] } })()}
              onChange={v => setData(p => ({ ...p, ideaCategory: JSON.stringify(v) }))}
              storageKey={`social-${cid}-categoria`} defaults={CATEGORY_DEFAULTS} fieldLabel="categoria" />
          </PropRow>

          <PropRow icon={<Sparkles className="h-4 w-4" />} label="Obiettivo">
            <Input value={data.ideaObiettivo} onChange={e => setData(p => ({ ...p, ideaObiettivo: e.target.value }))}
              placeholder="Vuoto" className="border-none h-8 p-0 focus-visible:ring-0 placeholder:text-muted-foreground/40" />
          </PropRow>

          <PropRow icon={<Clock className="h-4 w-4" />} label="Fase">
            <NotionSelect mode="single" value={data.ideaPhase ? [data.ideaPhase] : []} onChange={v => setData(p => ({ ...p, ideaPhase: v[0] || "" }))}
              storageKey={`social-${cid}-fase`} defaults={PHASE_DEFAULTS} fieldLabel="fase" />
          </PropRow>

          <PropRow icon={<CheckCircle2 className="h-4 w-4" />} label="Status">
            <NotionSelect mode="single" value={data.ideaStatus ? [data.ideaStatus] : []} onChange={v => setData(p => ({ ...p, ideaStatus: v[0] || "" }))}
              storageKey={`social-${cid}-status`} defaults={STATUS_DEFAULTS} fieldLabel="status" />
          </PropRow>

          <PropRow icon={<Lightbulb className="h-4 w-4" />} label="Creatività">
            <Textarea value={data.ideaCreativita} onChange={e => setData(p => ({ ...p, ideaCreativita: e.target.value }))}
              placeholder="Vuoto" className="border-none p-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 min-h-[32px] resize-none text-sm" rows={1} />
          </PropRow>

          <PropRow icon={<MessageCircle className="h-4 w-4" />} label="Note">
            <Textarea value={data.ideaNotes} onChange={e => setData(p => ({ ...p, ideaNotes: e.target.value }))}
              placeholder="Vuoto" className="border-none p-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 min-h-[32px] resize-none text-sm" rows={1} />
          </PropRow>
        </div>

        {/* Content sections — Notion-style toggles */}
        <div className="border-t mx-16" />

        <div className="px-16 py-4 space-y-2">
          <details open={!!data.ideaScript} className="group">
            <summary className="flex items-center gap-2 cursor-pointer select-none py-1.5 text-sm font-semibold hover:bg-muted/50 rounded-md px-1 -mx-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Script suggerito
              {data.ideaScript && <span className="text-[10px] font-normal text-muted-foreground ml-auto">compilato</span>}
            </summary>
            <div className="pl-6 pt-2 pb-1">
              <Textarea value={data.ideaScript} onChange={e => setData(p => ({ ...p, ideaScript: e.target.value }))}
                placeholder="Scrivi lo script del contenuto..." className="min-h-[120px] resize-y border-muted text-sm" rows={6} />
            </div>
          </details>

          <details open={!!data.ideaCaption} className="group">
            <summary className="flex items-center gap-2 cursor-pointer select-none py-1.5 text-sm font-semibold hover:bg-muted/50 rounded-md px-1 -mx-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              Didascalia e hashtag
              {data.ideaCaption && <span className="text-[10px] font-normal text-muted-foreground ml-auto">compilato</span>}
            </summary>
            <div className="pl-6 pt-2 pb-1 space-y-2">
              <Textarea value={data.ideaCaption} onChange={e => setData(p => ({ ...p, ideaCaption: e.target.value }))}
                placeholder="Scrivi la didascalia con gli hashtag..." className="min-h-[120px] resize-y border-muted text-sm" rows={6} />
              <UiTooltip>
                <UiTooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleAiHashtags} disabled={aiHashtagsLoading}>
                    {aiHashtagsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </UiTooltipTrigger>
                <UiTooltipContent side="top">Genera hashtag pertinenti e li aggiunge alla didascalia</UiTooltipContent>
              </UiTooltip>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="px-16 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          {isEdit && canSchedule && onSchedule && (
            <Button variant="secondary" onClick={() => { onSubmit(); setTimeout(onSchedule, 100) }}>
              <Send className="h-4 w-4 mr-1" /> Programma
            </Button>
          )}
          <Button onClick={handleSubmitWithCheck} disabled={creating || checkingSubmit}>
            {creating ? "Salvando..." : checkingSubmit ? "Controllo..." : isEdit ? "Salva" : "Crea Idea"}
          </Button>
        </div>

        {/* "Sei sicuro?" confirmation when duplicate */}
        <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${duplicateWarning?.sameClient?.similar ? "text-red-600" : "text-amber-600"}`}>
                <AlertTriangle className="h-5 w-5" /> Sei sicuro?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <p className="text-sm">
                {duplicateWarning?.sameClient?.similar
                  ? "Questa idea è già simile a un contenuto di QUESTO cliente. Vuoi comunque crearla?"
                  : "Questa idea è simile a un contenuto di un ALTRO cliente. Vuoi comunque crearla?"}
              </p>
              <div className="space-y-1.5">
                {duplicateWarning?.sameClient?.matches?.map((m: any, i: number) => (
                  <button key={`s${i}`} type="button" onClick={() => openSimilarPost(m)}
                    className="block w-full text-left text-xs text-muted-foreground bg-muted/50 rounded p-2 hover:bg-muted transition-colors cursor-pointer">
                    <span className="font-semibold text-red-600">Stesso cliente:</span>{' '}
                    <span className="underline decoration-dotted underline-offset-2">«{m.content}»</span>
                  </button>
                ))}
                {duplicateWarning?.otherClient?.matches?.map((m: any, i: number) => (
                  <button key={`o${i}`} type="button" onClick={() => openSimilarPost(m)}
                    className="block w-full text-left text-xs text-muted-foreground bg-muted/50 rounded p-2 hover:bg-muted transition-colors cursor-pointer">
                    <span className="font-semibold text-amber-600">Altro cliente{m.contactName ? ` (${m.contactName})` : ""}:</span>{' '}
                    <span className="underline decoration-dotted underline-offset-2">«{m.content}»</span>
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog(false)}>Annulla</Button>
              <Button onClick={() => { setConfirmDialog(false); onSubmit() }}>Crea comunque</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>

      <ReviewDialog
        open={showReview}
        onOpenChange={setShowReview}
        contactId={cid}
        content={data.content}
        caption={data.ideaCaption}
        onApply={rewritten => setData(p => ({
          ...p,
          content: rewritten.content || p.content,
          ideaCaption: rewritten.caption || p.ideaCaption,
        }))}
      />
    </Dialog>
  )
}

// === CED Idee — Table View ===

function CedIdeeTable({ ideas, cid, onRefresh, accounts }: { ideas: any[]; cid: number; onRefresh: () => void; accounts: any[] }) {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [newIdea, setNewIdea] = useState<IdeaFormData>(emptyIdea())
  const [editIdea, setEditIdea] = useState<{ id: number; data: IdeaFormData } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [reviewIdea, setReviewIdea] = useState<{ id: number; content: string; caption: string } | null>(null)
  const [showAiIdeas, setShowAiIdeas] = useState(false)
  const [aiIdeas, setAiIdeas] = useState<any[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [showBriefing, setShowBriefing] = useState(false)
  const actions = useIdeaActions(cid, onRefresh)

  const handleGenerateAiIdeas = async (answers?: string) => {
    setShowAiIdeas(true)
    setAiIdeas([])
    setAiLoading(true)
    try {
      const res = await socialAPI.aiGenerateIdeas(cid, 5, answers)
      setAiIdeas(res.data.ideas || [])
    } catch (err: any) { toast.error(err.message) }
    finally { setAiLoading(false) }
  }

  const handleAddAiIdea = (idea: any) => {
    actions.handleCreate({
      ...emptyIdea(),
      content: idea.content || idea.title || "",
      postType: idea.postType || "POST",
      ideaCaption: idea.caption || "",
      ideaCategory: "[]",
      ideaStatus: "Idea",
    }, () => {})
    toast.success("Idea aggiunta dal suggerimento AI")
  }

  const openReview = (idea: any) => {
    setReviewIdea({ id: idea.id, content: idea.content || "", caption: idea.ideaCaption || "" })
  }

  const applyReview = async (rewritten: { content: string; caption: string; hashtags: string[] }) => {
    if (!reviewIdea) return
    try {
      await socialAPI.updatePost(reviewIdea.id, { content: rewritten.content, ideaCaption: rewritten.caption })
      toast.success("Idea aggiornata")
      setReviewIdea(null)
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
  }

  // Bulk duplicate idea to other clients
  const [bulkDuplicateId, setBulkDuplicateId] = useState<number | null>(null)
  const [bulkClients, setBulkClients] = useState<any[]>([])
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const openBulkDuplicate = async (ideaId: number) => {
    setBulkDuplicateId(ideaId)
    setBulkSelected(new Set())
    if (bulkClients.length) return
    try {
      const res = await socialAPI.getDashboard()
      setBulkClients((res.data.clients || []).filter((c: any) => c.id !== cid))
    } catch {}
  }

  const toggleBulkClient = (id: number) => {
    setBulkSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const handleBulkDuplicate = async () => {
    if (!bulkDuplicateId || !bulkSelected.size) return
    setBulkLoading(true)
    try {
      await socialAPI.duplicatePostBulk(bulkDuplicateId, Array.from(bulkSelected))
      toast.success(`Idea duplicata su ${bulkSelected.size} clienti`)
      setBulkDuplicateId(null)
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
    finally { setBulkLoading(false) }
  }

  const filteredIdeas = useMemo(() => {
    let filtered = ideas
    if (statusFilter !== "all") filtered = filtered.filter(i => i.ideaStatus === statusFilter)
    if (categoryFilter !== "all") filtered = filtered.filter(i => {
      try { return JSON.parse(i.ideaCategory || "[]").includes(categoryFilter) } catch { return false }
    })
    return filtered
  }, [ideas, statusFilter, categoryFilter])

  return (
    <>
      {/* Filters + Create */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli status</SelectItem>
              {IDEA_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {IDEA_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <UiTooltip>
            <UiTooltipTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setShowBriefing(true)}>
                <Sparkles className="h-4 w-4" />
              </Button>
            </UiTooltipTrigger>
            <UiTooltipContent side="top">Prima ti fa qualche domanda, poi genera idee nuove evitando i contenuti già esistenti</UiTooltipContent>
          </UiTooltip>
          <Button size="sm" onClick={() => { setNewIdea(emptyIdea()); setShowCreate(true) }}>
            <Lightbulb className="h-4 w-4 mr-1" /> Nuova Idea
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Status</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-24">Data</TableHead>
              <TableHead className="w-28">Piattaforma</TableHead>
              <TableHead className="w-32">Tipologia</TableHead>
              <TableHead className="w-40">Categoria</TableHead>
              <TableHead className="w-24">Fase</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIdeas.length ? filteredIdeas.map((idea: any) => {
              const categories = parseCategories(idea.ideaCategory)
              const platforms = parsePlatforms(idea.platformContent)
              return (
                <TableRow key={idea.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setEditIdea({ id: idea.id, data: ideaToForm(idea) })}>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Select value={idea.ideaStatus || "Idea"} onValueChange={v => actions.handleInlineStatus(idea.id, v)}>
                      <SelectTrigger className="h-7 border-0 p-0 shadow-none focus:ring-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${IDEA_STATUS_COLORS[idea.ideaStatus || "Idea"] || ""}`}>
                          {idea.ideaStatus || "Idea"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {IDEA_STATUSES.map(s => (
                          <SelectItem key={s} value={s}>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${IDEA_STATUS_COLORS[s]}`}>{s}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{idea.content}</span>
                    {idea.promotedToId && (
                      <Badge variant="outline" className="ml-2 text-[10px] gap-1"><Sparkles className="h-3 w-3" />Programmato</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {idea.scheduledAt ? format(new Date(idea.scheduledAt), "dd/MM/yyyy") : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {platforms.map((p: string) => (
                        <span key={p} className={`w-2.5 h-2.5 rounded-full ${PLATFORM_STYLES[p]?.dot || "bg-gray-400"}`} title={p} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{IDEA_TYPES_EMOJI[idea.postType] || idea.postType}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {categories.map((c: string) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{idea.ideaPhase || "—"}</span>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {!idea.promotedToId && (idea.ideaStatus === "Idea" || idea.ideaStatus === "Da fare" || !idea.ideaStatus) && (
                        <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => navigate(`/social/${cid}/compose?idea=${idea.id}`)}>
                          <Send className="h-3 w-3 mr-1" /> Programma
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openReview(idea)}>
                            <Wand2 className="h-4 w-4 mr-2" /> Revisiona con AI
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openBulkDuplicate(idea.id)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplica su altri clienti
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => actions.handleDelete(idea.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            }) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nessuna idea. Crea la prima con il pulsante "Nuova Idea".
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <IdeaFormDialog open={showCreate} onOpenChange={setShowCreate} data={newIdea} setData={setNewIdea}
        onSubmit={() => actions.handleCreate(newIdea, () => { setShowCreate(false); setNewIdea(emptyIdea()) })} creating={actions.creating} cid={cid} />

      {/* AI ideas dialog */}
      <Dialog open={showAiIdeas} onOpenChange={setShowAiIdeas}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Idee generate con AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {aiLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : aiIdeas.length > 0 ? (
              aiIdeas.map((idea: any, i: number) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold flex-1">{idea.content || idea.title}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{idea.postType}</Badge>
                  </div>
                  {idea.caption && <p className="text-xs text-muted-foreground">{idea.caption}</p>}
                  {idea.hashtags?.length > 0 && (
                    <p className="text-xs text-primary">{idea.hashtags.join(" ")}</p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleAddAiIdea(idea)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Aggiungi idea
                    </Button>
                    <AiFeedback kind="ideas" content={`${idea.content || idea.title}${idea.caption ? " — " + idea.caption : ""}`} contactId={cid} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Nessuna idea generata. Verifica che l'AI sia configurata.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk duplicate idea to other clients */}
      <Dialog open={!!bulkDuplicateId} onOpenChange={(open) => { if (!open) setBulkDuplicateId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplica idea su altri clienti</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2 max-h-72 overflow-y-auto">
            {bulkClients.length > 0 ? (
              bulkClients.map((c: any) => (
                <label key={c.id} className="flex items-center gap-2.5 cursor-pointer rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                  <Checkbox checked={bulkSelected.has(c.id)} onCheckedChange={() => toggleBulkClient(c.id)} />
                  <span className="text-sm flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.totalPosts || 0} post</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Nessun altro cliente disponibile</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDuplicateId(null)}>Annulla</Button>
            <Button onClick={handleBulkDuplicate} disabled={!bulkSelected.size || bulkLoading}>
              {bulkLoading ? "Duplicando..." : `Duplica su ${bulkSelected.size || 0} clienti`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editIdea && (() => {
        const rawIdea = ideas.find(i => i.id === editIdea.id)
        const canSched = rawIdea && !rawIdea.promotedToId && (!rawIdea.ideaStatus || rawIdea.ideaStatus === "Idea" || rawIdea.ideaStatus === "Da fare")
        return (
          <IdeaFormDialog open={true} onOpenChange={v => { if (!v) setEditIdea(null) }}
            data={editIdea.data} setData={fn => setEditIdea(prev => prev ? { ...prev, data: fn(prev.data) } : null)}
            onSubmit={() => actions.handleUpdate(editIdea.id, editIdea.data, () => setEditIdea(null))}
            creating={actions.creating} isEdit cid={cid}
            onDuplicate={() => { actions.handleDuplicate(editIdea.id); setEditIdea(null) }}
            canSchedule={!!canSched}
            onSchedule={() => { setEditIdea(null); navigate(`/social/${cid}/compose?idea=${rawIdea.id}`) }} />
        )
      })()}

      <ReviewDialog
        open={!!reviewIdea}
        onOpenChange={v => { if (!v) setReviewIdea(null) }}
        contactId={cid}
        content={reviewIdea?.content || ""}
        caption={reviewIdea?.caption || ""}
        onApply={applyReview}
      />

      <ClarifyingQuestionsDialog
        open={showBriefing}
        onOpenChange={setShowBriefing}
        contactId={cid}
        mode="ideas"
        title="Prima di generare: qualche domanda"
        generateLabel="Genera idee"
        onGenerate={async answers => { await handleGenerateAiIdeas(answers) }}
      />
    </>
  )
}

// === CED Idee — Calendar View ===

function CedIdeeCalendar({ ideas, cid, onRefresh, accounts, focusPostId, focusMonth }: { ideas: any[]; cid: number; onRefresh: () => void; accounts: any[]; focusPostId?: number | null; focusMonth?: string | null }) {
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Jump to the requested month when navigating from a duplicate alert
  useEffect(() => {
    if (focusMonth) {
      const [y, m] = focusMonth.split("-").map(Number)
      if (y && m) setCurrentMonth(new Date(y, m - 1, 1))
    }
  }, [focusMonth])
  const [showCreate, setShowCreate] = useState(false)
  const [newIdea, setNewIdea] = useState<IdeaFormData>(emptyIdea())
  const [editIdea, setEditIdea] = useState<{ id: number; data: IdeaFormData } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ idea: any; x: number; y: number } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const actions = useIdeaActions(cid, onRefresh)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) { days.push(day); day = addDays(day, 1) }
    return days
  }, [currentMonth])

  const getIdeasForDay = (day: Date) =>
    ideas.filter(i =>
      i.scheduledAt && isSameDay(new Date(i.scheduledAt), day) &&
      (statusFilter === "all" || (i.ideaStatus || "Idea") === statusFilter)
    )

  const openCreateForDate = (day: Date) => {
    setNewIdea(emptyIdea(format(day, "yyyy-MM-dd") + "T12:00:00"))
    setShowCreate(true)
  }

  const openEdit = (idea: any) => {
    setEditIdea({ id: idea.id, data: ideaToForm(idea) })
  }

  const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold capitalize min-w-32 text-center">
              {format(currentMonth, "MMMM yyyy", { locale: it })}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentMonth(new Date())}>Oggi</Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli status</SelectItem>
                {IDEA_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setNewIdea(emptyIdea()); setShowCreate(true) }}>
              <Lightbulb className="h-4 w-4 mr-1" /> Nuova Idea
            </Button>
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {weekDays.map(d => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground tracking-wide">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayIdeas = getIdeasForDay(day)
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)
              return (
                <div key={i}
                  className={`min-h-[140px] p-1.5 border-b border-r cursor-pointer transition-colors ${!inMonth ? "bg-muted/20" : "bg-card"} ${today ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""} hover:bg-muted/40`}
                  onClick={() => openCreateForDate(day)}
                >
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${today ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/40"}`}>
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayIdeas.map((idea: any) => {
                      const platforms = parsePlatforms(idea.platformContent)
                      const categories = parseCategories(idea.ideaCategory)
                      const status = idea.ideaStatus || "Idea"
                      const isFocused = idea.id === focusPostId
                      return (
                        <div key={idea.id}
                          ref={isFocused ? el => { if (el) setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 250) } : undefined}
                          className={`rounded-md p-1.5 cursor-pointer hover:brightness-95 transition-all border ${isFocused ? "border-primary ring-2 ring-primary bg-primary/10 animate-in zoom-in-95 duration-500" : "border-border/40"}`}
                          onClick={e => { e.stopPropagation(); openEdit(idea) }}
                          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ idea, x: e.clientX, y: e.clientY }) }}
                        >
                          {/* Title with icon */}
                          <div className="flex items-start gap-1 mb-1">
                            <Copy className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                            <span className="font-semibold text-[11px] leading-tight line-clamp-2">{idea.content}</span>
                          </div>
                          {/* Type */}
                          <div className="mb-1">
                            <span className="text-[10px] text-muted-foreground">{IDEA_TYPES_EMOJI[idea.postType] || idea.postType}</span>
                          </div>
                          {/* Categories */}
                          {categories.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 mb-1">
                              {categories.slice(0, 2).map((c: string) => (
                                <span key={c} className={`px-1.5 py-0 rounded text-[9px] font-medium ${IDEA_CATEGORY_COLORS[c] || "bg-muted text-muted-foreground"}`}>{c}</span>
                              ))}
                            </div>
                          )}
                          {/* Platforms */}
                          {platforms.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 mb-1">
                              {platforms.map((pl: string, j: number) => (
                                <span key={j} className={`px-1.5 py-0 rounded text-[9px] font-medium ${PLATFORM_BADGE[pl] || "bg-muted text-muted-foreground"}`}>
                                  {PLATFORM_LABELS[pl] || pl}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Status + content indicators */}
                          <div className="flex items-center gap-1 justify-between">
                            <div className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${IDEA_STATUS_DOT[status] || "bg-gray-400"}`} />
                              <span className={`text-[9px] font-medium ${IDEA_STATUS_TEXT[status] || "text-muted-foreground"}`}>{status}</span>
                            </div>
                            <div className="flex gap-0.5">
                              {idea.ideaScript && <span title="Ha script"><BarChart3 className="h-2.5 w-2.5 text-muted-foreground" /></span>}
                              {idea.ideaCaption && <span title="Ha didascalia"><Megaphone className="h-2.5 w-2.5 text-muted-foreground" /></span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} onContextMenu={e => { e.preventDefault(); setContextMenu(null) }} />
          <div className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md" style={{ left: contextMenu.x, top: contextMenu.y }}>
            {!contextMenu.idea.promotedToId && (contextMenu.idea.ideaStatus === "Idea" || contextMenu.idea.ideaStatus === "Da fare" || !contextMenu.idea.ideaStatus) && (
              <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent font-medium" onClick={() => { navigate(`/social/${cid}/compose?idea=${contextMenu.idea.id}`); setContextMenu(null) }}>
                <Send className="h-4 w-4" /> Programma
              </button>
            )}
            <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent" onClick={() => { actions.handleDuplicate(contextMenu.idea.id); setContextMenu(null) }}>
              <Copy className="h-4 w-4" /> Duplica
            </button>
            <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent" onClick={() => { actions.handleDelete(contextMenu.idea.id); setContextMenu(null) }}>
              <Trash2 className="h-4 w-4" /> Elimina
            </button>
          </div>
        </>
      )}

      {/* Create dialog */}
      <IdeaFormDialog open={showCreate} onOpenChange={setShowCreate} data={newIdea} setData={setNewIdea}
        onSubmit={() => actions.handleCreate(newIdea, () => { setShowCreate(false); setNewIdea(emptyIdea()) })} creating={actions.creating} cid={cid} />

      {/* Edit dialog */}
      {editIdea && (() => {
        const rawIdea = ideas.find(i => i.id === editIdea.id)
        const canSched = rawIdea && !rawIdea.promotedToId && (!rawIdea.ideaStatus || rawIdea.ideaStatus === "Idea" || rawIdea.ideaStatus === "Da fare")
        return (
          <IdeaFormDialog open={true} onOpenChange={v => { if (!v) setEditIdea(null) }}
            data={editIdea.data} setData={fn => setEditIdea(prev => prev ? { ...prev, data: fn(prev.data) } : null)}
            onSubmit={() => actions.handleUpdate(editIdea.id, editIdea.data, () => setEditIdea(null))}
            creating={actions.creating} isEdit cid={cid}
            onDuplicate={() => { actions.handleDuplicate(editIdea.id); setEditIdea(null) }}
            canSchedule={!!canSched}
            onSchedule={() => { setEditIdea(null); navigate(`/social/${cid}/compose?idea=${rawIdea.id}`) }} />
        )
      })()}
    </>
  )
}

// === Post Form Dialog (Programmazione popup) ===

const PLATFORM_LIMITS: Record<string, number> = { INSTAGRAM: 2200, FACEBOOK: 63206, LINKEDIN: 3000, TIKTOK: 2200 }
const PLATFORM_META: Record<string, { icon: string; color: string; label: string }> = {
  INSTAGRAM: { icon: "IG", color: "bg-gradient-to-br from-pink-500 to-purple-600 text-white", label: "Instagram" },
  FACEBOOK: { icon: "FB", color: "bg-gradient-to-br from-blue-500 to-blue-700 text-white", label: "Facebook" },
  LINKEDIN: { icon: "IN", color: "bg-gradient-to-br from-sky-500 to-sky-700 text-white", label: "LinkedIn" },
  TIKTOK: { icon: "TT", color: "bg-gradient-to-br from-gray-700 to-gray-900 text-white", label: "TikTok" },
}
const EDITABLE_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED"]

// === Platform media specs ===
const PLATFORM_SPECS: Record<string, {
  label: string
  imageFormats: string[]
  videoFormats: string[]
  extraFormats?: string[]
  maxImageMB: number
  maxVideoMB: number
  maxExtraMB?: number
  imageDims: string
  videoDims: string
  aspectRatios: string
  maxCarousel?: number
  maxVideoDuration?: string
  notes?: string
}> = {
  INSTAGRAM: {
    label: "Instagram",
    imageFormats: ["image/jpeg", "image/png"],
    videoFormats: ["video/mp4", "video/quicktime"],
    maxImageMB: 30,
    maxVideoMB: 1024, // 1GB for reels via API
    imageDims: "1080×1350 (4:5), 1080×1080 (1:1), 1080×608 (1.91:1)",
    videoDims: "1080×1920 (9:16 reel/story), 1080×1350 (4:5 feed)",
    aspectRatios: "4:5, 1:1, 1.91:1, 9:16",
    maxCarousel: 10,
    maxVideoDuration: "90s reel, 60s feed/story",
  },
  FACEBOOK: {
    label: "Facebook",
    imageFormats: ["image/jpeg", "image/png"],
    videoFormats: ["video/mp4", "video/quicktime"],
    maxImageMB: 30,
    maxVideoMB: 4096,
    imageDims: "1080×1350 (4:5), 1200×630 (1.91:1)",
    videoDims: "1920×1080 (16:9), 1080×1920 (9:16)",
    aspectRatios: "4:5, 1:1, 1.91:1, 9:16, 16:9",
    maxVideoDuration: "240 min",
  },
  LINKEDIN: {
    label: "LinkedIn",
    imageFormats: ["image/jpeg", "image/png", "image/gif"],
    videoFormats: ["video/mp4", "video/quicktime"],
    extraFormats: ["application/pdf"],
    maxImageMB: 5,
    maxVideoMB: 5120,
    maxExtraMB: 100,
    imageDims: "1200×627 (1.91:1), 1080×1080 (1:1)",
    videoDims: "1920×1080 (16:9), 1080×1080 (1:1)",
    aspectRatios: "1.91:1, 1:1, 16:9, 9:16",
    maxVideoDuration: "30 min",
    notes: "PDF supportato (max 300 pagine). Max 20 immagini per post.",
  },
  TIKTOK: {
    label: "TikTok",
    imageFormats: ["image/jpeg", "image/webp"],
    videoFormats: ["video/mp4", "video/quicktime"],
    maxImageMB: 20,
    maxVideoMB: 4096,
    imageDims: "1080×1920 (9:16)",
    videoDims: "1080×1920 (9:16)",
    aspectRatios: "9:16",
    maxVideoDuration: "10 min",
  },
}

function validateFileForPlatforms(file: File, platforms: string[]): string[] {
  const warnings: string[] = []
  const sizeMB = file.size / (1024 * 1024)
  const isVideo = file.type.startsWith("video/")
  const isImage = file.type.startsWith("image/")
  const isPdf = file.type === "application/pdf"

  for (const p of platforms) {
    const spec = PLATFORM_SPECS[p]
    if (!spec) continue

    // Format check
    const allFormats = [...spec.imageFormats, ...spec.videoFormats, ...(spec.extraFormats || [])]
    if (!allFormats.includes(file.type)) {
      warnings.push(`${spec.label}: formato ${file.type.split("/")[1] || file.type} non supportato`)
      continue
    }

    // Size check
    if (isImage && sizeMB > spec.maxImageMB) {
      warnings.push(`${spec.label}: immagine troppo grande (${sizeMB.toFixed(1)} MB, max ${spec.maxImageMB} MB)`)
    }
    if (isVideo && sizeMB > spec.maxVideoMB) {
      warnings.push(`${spec.label}: video troppo grande (${sizeMB.toFixed(1)} MB, max ${spec.maxVideoMB} MB)`)
    }
    if (isPdf && spec.maxExtraMB && sizeMB > spec.maxExtraMB) {
      warnings.push(`${spec.label}: PDF troppo grande (${sizeMB.toFixed(1)} MB, max ${spec.maxExtraMB} MB)`)
    }
  }
  return warnings
}

/** Check image dimensions via browser Image API */
function checkImageDimensions(file: File, platforms: string[]): Promise<string[]> {
  return new Promise(resolve => {
    if (!file.type.startsWith("image/")) return resolve([])
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      const warnings: string[] = []
      const ratio = w / h

      for (const p of platforms) {
        switch (p) {
          case "INSTAGRAM":
            if (w < 320 || w > 1440) warnings.push(`Instagram: larghezza ${w}px (consigliata 1080px)`)
            if (ratio < 0.56 || ratio > 1.91) warnings.push(`Instagram: proporzioni ${ratio.toFixed(2)} fuori range (0.8:1 - 1.91:1)`)
            break
          case "TIKTOK":
            if (ratio > 0.7 || ratio < 0.5) warnings.push(`TikTok: consigliato formato verticale 9:16`)
            break
          case "LINKEDIN":
            if (w * h > 36_152_320) warnings.push(`LinkedIn: immagine troppo grande (max 36MP)`)
            break
        }
      }
      URL.revokeObjectURL(img.src)
      resolve(warnings)
    }
    img.onerror = () => resolve([])
    img.src = URL.createObjectURL(file)
  })
}

function PostFormDialog({ open, onOpenChange, post, accounts, cid, onDone, initialScheduledAt }: {
  open: boolean; onOpenChange: (v: boolean) => void; post: any | null
  accounts: any[]; cid: number; onDone: () => void; initialScheduledAt?: string
}) {
  const isEdit = !!post
  const isEditable = !isEdit || EDITABLE_STATUSES.includes(post?.status)

  // Form state
  const [content, setContent] = useState("")
  const [platformContent, setPlatformContent] = useState<Record<string, string>>({})
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([])
  const [hashtags, setHashtags] = useState("")
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState("")
  const [shareToFeed, setShareToFeed] = useState(true)
  const [files, setFiles] = useState<File[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [metrics, setMetrics] = useState<any>(null)
  const [mediaWarnings, setMediaWarnings] = useState<string[]>([])

  // Populate form from post
  useEffect(() => {
    if (!open) return
    if (post) {
      setContent(post.content || "")
      setPlatformContent(post.platformContent || {})
      setSelectedAccounts(post.targets?.map((t: any) => t.socialAccountId) || [])
      setHashtags(post.hashtags?.map((h: any) => h.hashtag).join(" ") || "")
      setScheduledAt(post.scheduledAt ? format(new Date(post.scheduledAt), "yyyy-MM-dd'T'HH:mm") : "")
      setScheduleEnabled(!!post.scheduledAt)
      setShareToFeed(post.shareToFeed ?? true)
      setFiles([])
      setCoverFile(null)
      // Fetch metrics for published posts
      if (post.status === "PUBLISHED") {
        socialAPI.getPostMetrics(post.id).then(r => setMetrics(r.data)).catch(() => {})
      } else {
        setMetrics(null)
      }
    } else {
      setContent("")
      setPlatformContent({})
      setSelectedAccounts([])
      setHashtags("")
      setScheduledAt(initialScheduledAt || "")
      setScheduleEnabled(!!initialScheduledAt)
      setShareToFeed(true)
      setFiles([])
      setCoverFile(null)
      setMetrics(null)
    }
  }, [open, post, initialScheduledAt])

  const isReel = isEdit ? post?.postType === "REEL" : (files.length > 0 && files[0].type.startsWith("video/"))
  const postType = isReel ? "REEL" : "POST"

  const selectedPlatforms = useMemo(() =>
    [...new Set(accounts.filter(a => selectedAccounts.includes(a.id)).map(a => a.platform as string))],
    [accounts, selectedAccounts]
  )

  const toggleAccount = (id: number) =>
    setSelectedAccounts(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])

  const addFiles = useCallback(async (newFiles: File[]) => {
    const allWarnings: string[] = []
    for (const f of newFiles) {
      const formatWarns = validateFileForPlatforms(f, selectedPlatforms)
      allWarnings.push(...formatWarns)
      if (f.type.startsWith("image/")) {
        const dimWarns = await checkImageDimensions(f, selectedPlatforms)
        allWarnings.push(...dimWarns)
      }
    }
    // Carousel limit check
    if (selectedPlatforms.includes("INSTAGRAM")) {
      const total = files.length + newFiles.length
      if (total > 10) allWarnings.push(`Instagram: max 10 file per carousel (selezionati ${total})`)
    }
    setMediaWarnings(allWarnings)
    if (allWarnings.some(w => w.includes("non supportato"))) {
      toast.error(allWarnings.find(w => w.includes("non supportato"))!)
    }
    setFiles(prev => [...prev, ...newFiles])
  }, [selectedPlatforms, files.length])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setMediaWarnings([]) // clear warnings on removal
  }

  const filePreviews = useMemo(() =>
    files.map(f => ({ file: f, url: f.type === "application/pdf" ? "" : URL.createObjectURL(f), isVideo: f.type.startsWith("video/"), isPdf: f.type === "application/pdf" })),
    [files]
  )
  useEffect(() => () => filePreviews.forEach(p => p.url && URL.revokeObjectURL(p.url)), [filePreviews])

  const handleSave = async (action: "draft" | "schedule" | "publish" | "save" | "approve") => {
    if (!content.trim()) return toast.error("Inserisci il contenuto del post")
    if (!selectedAccounts.length) return toast.error("Seleziona almeno un account")
    if (action === "schedule" && !scheduledAt) return toast.error("Seleziona una data di programmazione")

    setSubmitting(true)
    try {
      const hashtagList = hashtags.split(/[\s,]+/).filter(h => h.length > 0).map(h => h.startsWith("#") ? h : `#${h}`)
      const allFiles = [...files]
      if (coverFile) allFiles.push(coverFile)

      if (isEdit) {
        await socialAPI.updatePost(post.id, {
          content,
          platformContent: Object.keys(platformContent).length ? platformContent : undefined,
          postType,
          targetAccountIds: selectedAccounts,
          hashtags: hashtagList.length ? hashtagList : undefined,
          scheduledAt: scheduleEnabled && scheduledAt ? scheduledAt : undefined,
          shareToFeed: isReel ? shareToFeed : undefined,
          files: allFiles.length ? allFiles : undefined,
        })
        if (action === "approve") {
          await socialAPI.approvePost(post.id)
          toast.success("Post approvato")
        } else if (action === "schedule" && scheduledAt) {
          await socialAPI.schedulePost(post.id, scheduledAt)
          toast.success("Post programmato")
        } else if (action === "publish") {
          await socialAPI.publishNow(post.id)
          toast.success("Pubblicazione avviata")
        } else {
          toast.success("Post aggiornato")
        }
      } else {
        const res = await socialAPI.createPost({
          contactId: cid,
          content,
          platformContent: Object.keys(platformContent).length ? platformContent : undefined,
          postType,
          targetAccountIds: selectedAccounts,
          hashtags: hashtagList.length ? hashtagList : undefined,
          scheduledAt: action === "schedule" && scheduledAt ? scheduledAt : undefined,
          shareToFeed: isReel ? shareToFeed : undefined,
          files: allFiles.length ? allFiles : undefined,
        })
        if (action === "schedule" && scheduledAt) {
          await socialAPI.schedulePost(res.data.id, scheduledAt)
          toast.success("Post programmato!")
        } else if (action === "publish") {
          await socialAPI.publishNow(res.data.id)
          toast.success("Pubblicazione avviata!")
        } else {
          toast.success("Bozza salvata!")
        }
      }
      onOpenChange(false)
      onDone()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDuplicate = async () => {
    if (!post) return
    try {
      await socialAPI.duplicatePost(post.id)
      toast.success("Post duplicato")
      onOpenChange(false)
      onDone()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDelete = async () => {
    if (!post || !confirm("Eliminare questo post?")) return
    try {
      await socialAPI.deletePost(post.id)
      toast.success("Post eliminato")
      onOpenChange(false)
      onDone()
    } catch (err: any) { toast.error(err.message) }
  }

  // Preview helper
  const getPreviewText = (platform: string) => {
    const key = platform.toLowerCase()
    return platformContent[key]?.trim() ? platformContent[key] : content
  }
  const getPreviewAccount = (platform: string) =>
    accounts.find(a => a.platform === platform && selectedAccounts.includes(a.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] w-full max-h-[96vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{isEdit ? (isEditable ? "Modifica Post" : "Dettaglio Post") : "Nuovo Post"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 px-6 pb-2">
          {/* Left — Form (col-span-3) */}
          <div className="lg:col-span-3 space-y-4 overflow-y-auto max-h-[60vh] pr-1">
            {/* Content */}
            <section className="space-y-2">
              <Label className="text-xs font-semibold">Contenuto</Label>
              <Textarea
                placeholder="Scrivi il tuo post..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                className="resize-y"
                disabled={!isEditable}
              />
              <p className="text-xs text-muted-foreground">{content.length} caratteri</p>
            </section>

            {/* Account selection */}
            <section className="space-y-2">
              <Label className="text-xs font-semibold">Pubblica su</Label>
              {accounts.length > 0 ? (
                <div className="space-y-1.5">
                  {accounts.map((acc: any) => {
                    const pm = PLATFORM_META[acc.platform] || { icon: "?", color: "bg-gray-500 text-white", label: acc.platform }
                    return (
                      <label key={acc.id} className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                        <Checkbox checked={selectedAccounts.includes(acc.id)} onCheckedChange={() => isEditable && toggleAccount(acc.id)} disabled={!isEditable} />
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${pm.color}`}>{pm.icon}</span>
                        <span className="text-sm">{acc.platformName}</span>
                        <span className="text-xs text-muted-foreground">{pm.label}</span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nessun account collegato.</p>
              )}
            </section>

            {/* Media upload — only for editable */}
            {isEditable && (
              <section className="space-y-2">
                <Label className="text-xs font-semibold">Media</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("postdlg-file-input")?.click()}
                >
                  <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Trascina file o clicca</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">JPG, PNG, MP4, MOV{selectedPlatforms.includes("LINKEDIN") ? ", PDF" : ""}</p>
                  <input id="postdlg-file-input" type="file" multiple
                    accept={`image/*,video/*${selectedPlatforms.includes("LINKEDIN") ? ",application/pdf" : ""}`}
                    className="hidden"
                    onChange={e => e.target.files && addFiles(Array.from(e.target.files!))} />
                </div>

                {/* Warnings */}
                {mediaWarnings.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-2 space-y-0.5">
                    {mediaWarnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* File previews */}
                {filePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {filePreviews.map((p, i) => {
                      const f = files[i]
                      const sizeMB = f ? (f.size / (1024 * 1024)).toFixed(1) : ""
                      const isPdf = f?.type === "application/pdf"
                      return (
                        <div key={i} className="relative group aspect-square rounded-md overflow-hidden bg-muted">
                          {isPdf ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/30">
                              <FileText className="h-6 w-6 text-red-500" />
                              <span className="text-[9px] text-muted-foreground mt-1 truncate max-w-full px-1">{f.name}</span>
                            </div>
                          ) : p.isVideo ? (
                            <video src={p.url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={p.url} alt="" className="w-full h-full object-cover" />
                          )}
                          <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[8px] px-1 rounded">{sizeMB} MB</span>
                          <button className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFile(i)}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Platform specs info */}
                {selectedPlatforms.length > 0 && (
                  <details className="text-[10px] text-muted-foreground">
                    <summary className="cursor-pointer flex items-center gap-1 hover:text-foreground transition-colors">
                      <Info className="h-3 w-3" /> Specifiche per piattaforma
                    </summary>
                    <div className="mt-1.5 space-y-1.5 pl-4">
                      {selectedPlatforms.map(p => {
                        const s = PLATFORM_SPECS[p]
                        if (!s) return null
                        return (
                          <div key={p}>
                            <p className="font-semibold text-foreground">{s.label}</p>
                            <p>Immagini: {s.imageDims} — max {s.maxImageMB} MB</p>
                            <p>Video: {s.videoDims} — max {s.maxVideoMB >= 1024 ? `${(s.maxVideoMB / 1024).toFixed(0)} GB` : `${s.maxVideoMB} MB`}{s.maxVideoDuration ? ` — ${s.maxVideoDuration}` : ""}</p>
                            <p>Proporzioni: {s.aspectRatios}</p>
                            {s.maxCarousel && <p>Carousel: max {s.maxCarousel} file</p>}
                            {s.notes && <p className="italic">{s.notes}</p>}
                          </div>
                        )
                      })}
                    </div>
                  </details>
                )}
              </section>
            )}

            {/* Existing media (edit mode) */}
            {isEdit && (post?.mediaUrls as string[] || []).length > 0 && (
              <section className="space-y-2">
                <Label className="text-xs font-semibold">Media esistenti</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(post.mediaUrls as string[]).map((url: string, i: number) => (
                    <div key={i} className="relative aspect-square rounded-md overflow-hidden border">
                      {url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                        ? <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                        : <video src={url} className="w-full h-full object-cover" />}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Hashtags */}
            <section className="space-y-2">
              <Label className="text-xs font-semibold">Hashtag</Label>
              <Input placeholder="#marketing #social" value={hashtags} onChange={e => setHashtags(e.target.value)} disabled={!isEditable} />
            </section>

            {/* Schedule */}
            {isEditable && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Programma pubblicazione</Label>
                  <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
                </div>
                {scheduleEnabled && (
                  <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                )}
              </section>
            )}

            {/* Reel options */}
            {isReel && isEditable && (
              <section className="space-y-2">
                <div>
                  <Label className="text-xs">Immagine di copertina</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {coverFile ? (
                      <div className="flex items-center gap-2 bg-muted rounded px-2 py-1 text-xs">
                        <span className="truncate max-w-32">{coverFile.name}</span>
                        <button onClick={() => setCoverFile(null)}><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && setCoverFile(e.target.files[0])} />
                        <Button variant="outline" size="sm" asChild><span><ImageIcon className="h-3.5 w-3.5 mr-1" />Seleziona</span></Button>
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Condividi nel feed</Label>
                  <Switch checked={shareToFeed} onCheckedChange={setShareToFeed} />
                </div>
              </section>
            )}
          </div>

          {/* Right — Preview + Info (col-span-2) */}
          <div className="lg:col-span-2 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* Live preview */}
            <section>
              <Label className="text-xs font-semibold mb-2 block">Anteprima</Label>
              {selectedPlatforms.length === 0 ? (
                <div className="border rounded-lg p-6 text-center text-xs text-muted-foreground">
                  Seleziona un account
                </div>
              ) : (() => {
                const p = selectedPlatforms[0]
                const acc = getPreviewAccount(p)
                const previewText = getPreviewText(p)
                const hashtagStr = hashtags.split(/[\s,]+/).filter(h => h.length > 0).map(h => h.startsWith("#") ? h : `#${h}`).join(" ")
                const previewFiles = filePreviews.filter(fp => !fp.isPdf).map(fp => ({ url: fp.url, isVideo: fp.isVideo }))
                return (
                  <div className="flex justify-center rounded-xl bg-muted/40 p-4">
                    <PlatformPreview
                      platform={p}
                      account={acc}
                      content={previewText}
                      hashtagStr={hashtagStr}
                      postType={postType}
                      filePreviews={previewFiles}
                      files={files}
                      scheduleLabel={scheduleEnabled && scheduledAt ? formatScheduleLabel(scheduledAt, false) : (post ? STATUS_BADGE[post.status]?.label || "Bozza" : "Bozza")}
                    />
                  </div>
                )
              })()}
            </section>

            {/* Metrics (published posts) */}
            {isEdit && post?.status === "PUBLISHED" && metrics && (
              <section className="space-y-2">
                <Label className="text-xs font-semibold">Metriche</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Like", value: metrics.likes ?? "—", icon: Heart },
                    { label: "Commenti", value: metrics.comments ?? "—", icon: MessageCircle },
                    { label: "Condivisioni", value: metrics.shares ?? "—", icon: Share2 },
                    { label: "Copertura", value: metrics.reach ?? "—", icon: Eye },
                  ].map(m => (
                    <div key={m.label} className="border rounded-md p-2 text-center">
                      <m.icon className="h-3.5 w-3.5 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="text-lg font-bold leading-tight">{m.value}</p>
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Publish logs */}
            {isEdit && post?.publishLogs?.length > 0 && (
              <section className="space-y-2">
                <Label className="text-xs font-semibold">Log Pubblicazione</Label>
                <div className="space-y-1">
                  {post.publishLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-1.5 text-xs">
                      <Badge variant={log.action === "SUCCESS" ? "default" : log.action === "FAIL" ? "destructive" : "secondary"} className="text-[10px] px-1 py-0">
                        {log.action}
                      </Badge>
                      <span className="text-muted-foreground">{format(new Date(log.createdAt), "dd/MM HH:mm", { locale: it })}</span>
                      {log.message && <span className="truncate">{log.message}</span>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t flex items-center justify-end gap-2">
          {!isEdit ? (
            <>
              <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={submitting}>
                <Save className="h-4 w-4 mr-1" /> Salva bozza
              </Button>
              {scheduleEnabled && scheduledAt && (
                <Button variant="secondary" size="sm" onClick={() => handleSave("schedule")} disabled={submitting}>
                  <Clock className="h-4 w-4 mr-1" /> Programma
                </Button>
              )}
              <Button size="sm" onClick={() => handleSave("publish")} disabled={submitting}>
                <Send className="h-4 w-4 mr-1" /> Pubblica ora
              </Button>
            </>
          ) : isEditable ? (
            <>
              <Button variant="outline" size="sm" onClick={() => handleSave("save")} disabled={submitting}>
                <Save className="h-4 w-4 mr-1" /> Salva
              </Button>
              {post?.status === "PENDING_APPROVAL" && (
                <Button variant="secondary" size="sm" onClick={() => handleSave("approve")} disabled={submitting}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approva
                </Button>
              )}
              {scheduleEnabled && scheduledAt && (
                <Button variant="secondary" size="sm" onClick={() => handleSave("schedule")} disabled={submitting}>
                  <Clock className="h-4 w-4 mr-1" /> Programma
                </Button>
              )}
              <Button size="sm" onClick={() => handleSave("publish")} disabled={submitting}>
                <Send className="h-4 w-4 mr-1" /> Pubblica ora
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-1" /> Duplica
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Elimina
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// === CED Table (TanStack) ===

const columnHelper = createColumnHelper<any>()

function CedTable({ posts, cid, navigate, onRefresh, accounts }: { posts: any[]; cid: number; navigate: any; onRefresh: () => void; accounts: any[] }) {
  const [editPost, setEditPost] = useState<any | null>(null)
  const [transferPost, setTransferPost] = useState<any>(null)
  const [allClients, setAllClients] = useState<any[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

  const openTransfer = async (post: any) => {
    setTransferPost(post)
    if (allClients.length) return
    setLoadingClients(true)
    try {
      const res = await socialAPI.getDashboard()
      setAllClients((res.data.clients || []).filter((c: any) => c.id !== cid))
    } catch {} finally { setLoadingClients(false) }
  }

  const handleDuplicate = async (postId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await socialAPI.duplicatePost(postId)
      toast.success("Post duplicato")
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleTransfer = async (postId: number, targetContactId: number) => {
    try {
      await socialAPI.duplicatePost(postId, targetContactId)
      await socialAPI.deletePost(postId)
      toast.success("Post trasferito")
      setTransferPost(null)
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
  }

  const columns = useMemo(() => [
    columnHelper.accessor("status", {
      header: "Stato",
      cell: info => {
        const s = STATUS_BADGE[info.getValue()] || { label: info.getValue(), variant: "secondary" as const }
        return <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
      },
    }),
    columnHelper.accessor("content", {
      header: "Contenuto",
      cell: info => {
        const row = info.row.original
        const thumb = row.coverImageUrl || (row.mediaUrls as string[] | null)?.[0]
        return (
          <div className="flex items-center gap-2">
            {thumb ? (
              <img src={thumb} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center shrink-0">
                <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
              </div>
            )}
            <span className="text-sm line-clamp-1 max-w-xs">{info.getValue()}</span>
          </div>
        )
      },
    }),
    columnHelper.accessor("postType", {
      header: "Tipo",
      cell: info => <Badge variant="outline" className="text-xs">{info.getValue()}</Badge>,
    }),
    columnHelper.accessor("targets", {
      header: "Piattaforme",
      cell: info => (
        <div className="flex gap-1">
          {(info.getValue() || []).map((t: any) => (
            <span key={t.socialAccount?.platform || t.id} className={`w-2.5 h-2.5 rounded-full ${PLATFORM_STYLES[t.socialAccount?.platform]?.dot || "bg-gray-400"}`} />
          ))}
        </div>
      ),
    }),
    columnHelper.accessor(row => row.scheduledAt || row.publishedAt || row.createdAt, {
      id: "date",
      header: "Data",
      cell: info => info.getValue() ? (
        <span className="text-xs text-muted-foreground">{format(new Date(info.getValue()), "dd MMM HH:mm", { locale: it })}</span>
      ) : "—",
    }),
    columnHelper.accessor("createdBy", {
      header: "Autore",
      cell: info => {
        const u = info.getValue()
        return u ? <span className="text-xs text-muted-foreground">{u.firstName} {u.lastName}</span> : "—"
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: info => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditPost(info.row.original) }}>
              <Eye className="h-4 w-4 mr-2" /> Apri in popup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={e => handleDuplicate(info.row.original.id, e)}>
              <Copy className="h-4 w-4 mr-2" /> Duplica
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openTransfer(info.row.original)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Trasferisci a...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ], [])

  const visiblePosts = useMemo(() =>
    posts.filter(p => p.status === "SCHEDULED" || p.status === "PUBLISHED"),
  [posts])
  const table = useReactTable({ data: visiblePosts, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <>
      <div className="flex justify-end mb-2">
        <Button size="sm" variant="outline" onClick={() => navigate(`/social/${cid}/compose`)}>
          <Plus className="h-4 w-4 mr-1" /> Nuovo Post
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setEditPost(row.original)}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  Nessun post. Crea il primo con i pulsanti qui sopra.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Transfer dialog */}
      <Dialog open={!!transferPost} onOpenChange={open => { if (!open) setTransferPost(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trasferisci post a...</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2 max-h-64 overflow-y-auto">
            {loadingClients ? (
              <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
            ) : allClients.length > 0 ? (
              allClients.map((c: any) => (
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

      {/* Edit post dialog (create goes to /compose) */}
      <PostFormDialog open={!!editPost} onOpenChange={v => { if (!v) setEditPost(null) }}
        post={editPost} accounts={accounts} cid={cid} onDone={onRefresh} />
    </>
  )
}

// === CED Calendar ===

function CedCalendar({ posts, cid, navigate, onRefresh, accounts, focusPostId, focusMonth }: { posts: any[]; cid: number; navigate: any; onRefresh: () => void; accounts: any[]; focusPostId?: number | null; focusMonth?: string | null }) {
  const [editPost, setEditPost] = useState<any | null>(null)
  const [contextMenu, setContextMenu] = useState<{ post: any; x: number; y: number } | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Jump to the requested month when navigating from a duplicate alert
  useEffect(() => {
    if (focusMonth) {
      const [y, m] = focusMonth.split("-").map(Number)
      if (y && m) setCurrentMonth(new Date(y, m - 1, 1))
    }
  }, [focusMonth])
  const [transferPost, setTransferPost] = useState<any>(null)
  const [allClients, setAllClients] = useState<any[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const openTransfer = async (post: any) => {
    setTransferPost(post)
    if (allClients.length) return
    setLoadingClients(true)
    try {
      const res = await socialAPI.getDashboard()
      setAllClients((res.data.clients || []).filter((c: any) => c.id !== cid))
    } catch {} finally { setLoadingClients(false) }
  }

  const handleDuplicate = async (postId: number) => {
    try {
      await socialAPI.duplicatePost(postId)
      toast.success("Post duplicato")
      setContextMenu(null)
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm("Eliminare questo post?")) return
    try {
      await socialAPI.deletePost(postId)
      toast.success("Post eliminato")
      setContextMenu(null)
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleTransfer = async (postId: number, targetContactId: number) => {
    try {
      await socialAPI.duplicatePost(postId, targetContactId)
      await socialAPI.deletePost(postId)
      toast.success("Post trasferito")
      setTransferPost(null)
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
  }

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const days: Date[] = []
    let day = calStart
    while (day <= calEnd) { days.push(day); day = addDays(day, 1) }
    return days
  }, [currentMonth])

  const visiblePosts = useMemo(() =>
    posts.filter(p =>
      (p.status === "SCHEDULED" || p.status === "PUBLISHED") &&
      (statusFilter === "all" || p.status === statusFilter)
    ),
  [posts, statusFilter])

  const getPostsForDay = (day: Date) =>
    visiblePosts.filter(p => {
      const d = p.scheduledAt || p.publishedAt
      return d && isSameDay(new Date(d), day)
    })

  const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold capitalize min-w-32 text-center">
            {format(currentMonth, "MMMM yyyy", { locale: it })}
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentMonth(new Date())}>Oggi</Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Stato" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="SCHEDULED">Programmati</SelectItem>
              <SelectItem value="PUBLISHED">Pubblicati</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {weekDays.map(d => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground tracking-wide">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayPosts = getPostsForDay(day)
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)
              return (
                <div key={i} className={`min-h-[140px] p-1.5 border-b border-r transition-colors cursor-pointer ${!inMonth ? "bg-muted/20" : "bg-card hover:bg-muted/30"} ${today ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`}
                  onClick={() => { if (dayPosts.length === 0) navigate(`/social/${cid}/compose?at=${encodeURIComponent(format(day, "yyyy-MM-dd'T'12:00"))}`) }}>
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${today ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/40"}`}>
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((p: any) => {
                      const platforms = p.targets?.map((t: any) => t.socialAccount?.platform) || []
                      const s = STATUS_BADGE[p.status] || { label: p.status, variant: "secondary" }
                      const thumb = p.coverImageUrl || (p.mediaUrls as string[] | null)?.[0]
                      const hasMedia = !!thumb
                      const isFocused = p.id === focusPostId
                      return (
                        <div key={p.id}
                          ref={isFocused ? el => { if (el) setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 250) } : undefined}
                          className={`rounded-md overflow-hidden cursor-pointer hover:brightness-95 transition-all border ${isFocused ? "border-primary ring-2 ring-primary animate-in zoom-in-95 duration-500" : "border-border/40"} ${STATUS_CAL[p.status] || ""}`}
                          onClick={e => { e.stopPropagation(); setEditPost(p) }}
                          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setContextMenu({ post: p, x: e.clientX, y: e.clientY }) }}
                        >
                          {hasMedia ? (
                            <div className="relative">
                              <img src={thumb} alt="" className="w-full h-16 object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-1">
                                <span className="font-semibold text-[10px] leading-tight line-clamp-1 text-white drop-shadow-sm">{p.content?.slice(0, 40)}</span>
                              </div>
                              {p.postType === "REEL" || p.postType === "VIDEO" ? (
                                <div className="absolute top-0.5 right-0.5"><Film className="h-3 w-3 text-white drop-shadow" /></div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="p-1.5 bg-muted/30">
                              <div className="flex items-start gap-1 mb-0.5">
                                <ImageIcon className="h-3 w-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                                <span className="font-semibold text-[11px] leading-tight line-clamp-2">{p.content?.slice(0, 50)}</span>
                              </div>
                            </div>
                          )}
                          <div className="px-1.5 py-1 flex items-center gap-1">
                            {platforms.length > 0 && (
                              <div className="flex gap-0.5">
                                {platforms.map((pl: string, j: number) => (
                                  <span key={j} className={`px-1 py-0 rounded text-[8px] font-medium ${PLATFORM_BADGE[pl] || "bg-muted text-muted-foreground"}`}>
                                    {PLATFORM_LABELS[pl] || pl}
                                  </span>
                                ))}
                              </div>
                            )}
                            <span className="ml-auto flex items-center gap-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${p.status === "PUBLISHED" ? "bg-green-500" : "bg-blue-500"}`} />
                              {p.scheduledAt && <span className="text-[9px] text-muted-foreground">{format(new Date(p.scheduledAt), "HH:mm")}</span>}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {dayPosts.length > 3 && <div className="text-[10px] text-muted-foreground pl-1">+{dayPosts.length - 3}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} onContextMenu={e => { e.preventDefault(); setContextMenu(null) }} />
          <div className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent" onClick={() => handleDuplicate(contextMenu.post.id)}>
              <Copy className="h-4 w-4" /> Duplica
            </button>
            <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent" onClick={() => { setContextMenu(null); openTransfer(contextMenu.post) }}>
              <ArrowRightLeft className="h-4 w-4" /> Trasferisci a...
            </button>
            <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent" onClick={() => handleDeletePost(contextMenu.post.id)}>
              <Trash2 className="h-4 w-4" /> Elimina
            </button>
          </div>
        </>
      )}

      {/* Transfer dialog */}
      <Dialog open={!!transferPost} onOpenChange={open => { if (!open) setTransferPost(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trasferisci post a...</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2 max-h-64 overflow-y-auto">
            {loadingClients ? (
              <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
            ) : allClients.length > 0 ? (
              allClients.map((c: any) => (
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

      {/* Edit post dialog (create goes to /compose) */}
      <PostFormDialog
        open={!!editPost}
        onOpenChange={v => { if (!v) setEditPost(null) }}
        post={editPost}
        accounts={accounts}
        cid={cid}
        onDone={onRefresh}
      />
    </>
  )
}

// === Brief Tab ===

function BriefTab({ contactId, contact }: { contactId: number; contact: any }) {
  const [brief, setBrief] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiBriefLoading, setAiBriefLoading] = useState(false)
  const [aiRefreshLoading, setAiRefreshLoading] = useState(false)

  const handleAiBrief = async () => {
    setAiBriefLoading(true)
    try {
      const res = await socialAPI.aiGenerateBrief(contactId)
      const b = res.data
      setBrief((p: any) => ({ ...(p || {}), tone: b.tone, audience: b.audience, goals: b.goals }))
      if (b.notes && editor) editor.commands.setContent(b.notes)
      await socialAPI.updateBrief(contactId, { tone: b.tone, audience: b.audience, goals: b.goals, notes: b.notes })
      toast.success("Brief generato con AI")
    } catch (err: any) { toast.error(err.message) }
    finally { setAiBriefLoading(false) }
  }

  const handleAiRefresh = async () => {
    setAiRefreshLoading(true)
    try {
      const res = await socialAPI.aiRefreshBrief(contactId)
      setBrief((p: any) => ({ ...(p || {}), aiData: res.data.aiData, aiUpdatedAt: res.data.aiUpdatedAt, notes: res.data.notes ?? p?.notes }))
      if (res.data.notes && editor) editor.commands.setContent(res.data.notes)
      toast.success("Conoscenza AI aggiornata")
    } catch (err: any) { toast.error(err.message) }
    finally { setAiRefreshLoading(false) }
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Note sul cliente, linee guida, referenze..." }),
    ],
    content: "",
    onBlur: ({ editor }) => {
      saveBrief({ notes: editor.getHTML() })
    },
  })

  useEffect(() => {
    socialAPI.getBrief(contactId)
      .then(r => {
        setBrief(r.data)
        if (r.data.notes && editor) editor.commands.setContent(r.data.notes)
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [contactId])

  // Update editor content when brief loads and editor becomes available
  useEffect(() => {
    if (brief?.notes && editor) editor.commands.setContent(brief.notes)
  }, [editor, brief])

  const saveBrief = async (partial: Record<string, any>) => {
    setSaving(true)
    try {
      const res = await socialAPI.updateBrief(contactId, { ...brief, ...partial })
      setBrief(res.data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Contact card header — stile scheda contatto */}
      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xl shrink-0">
            {(contact?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold truncate">{contact?.name || "Cliente"}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              {contact?.email && (
                <span className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5 shrink-0" /> {contact.email}</span>
              )}
              {contact?.phone && (
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" /> {contact.phone}</span>
              )}
              {contact?.city && (
                <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 shrink-0" /> {contact.city}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {contact?.type && <Badge variant="secondary" className="shrink-0">{contact.type}</Badge>}
            <UiTooltip>
              <UiTooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleAiBrief} disabled={aiBriefLoading}>
                  {aiBriefLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </UiTooltipTrigger>
              <UiTooltipContent side="top">Genera il brief del cliente (tono, audience, obiettivi) da nome e note</UiTooltipContent>
            </UiTooltip>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informazioni Social</CardTitle>
            <CardDescription className="mt-1">Tono, audience e obiettivi del piano editoriale</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5 text-muted-foreground" /> Tono di voce</Label>
              <Textarea
                value={brief?.tone || ""}
                onChange={e => setBrief((p: any) => ({ ...p, tone: e.target.value }))}
                onBlur={e => saveBrief({ tone: e.target.value })}
                placeholder="Es: Professionale ma accessibile, amichevole..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-muted-foreground" /> Target audience</Label>
              <Textarea
                value={brief?.audience || ""}
                onChange={e => setBrief((p: any) => ({ ...p, audience: e.target.value }))}
                onBlur={e => saveBrief({ audience: e.target.value })}
                placeholder="Es: Donne 25-45, interessate a moda e lifestyle..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-muted-foreground" /> Obiettivi</Label>
              <Textarea
                value={brief?.goals || ""}
                onChange={e => setBrief((p: any) => ({ ...p, goals: e.target.value }))}
                onBlur={e => saveBrief({ goals: e.target.value })}
                placeholder="Es: Aumentare awareness, generare lead..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-muted-foreground" /> Indicazioni fisse per l'AI</Label>
              <Textarea
                value={brief?.aiInstructions || ""}
                onChange={e => setBrief((p: any) => ({ ...p, aiInstructions: e.target.value }))}
                onBlur={e => saveBrief({ aiInstructions: e.target.value })}
                placeholder={"Regole che l'AI deve SEMPRE seguire nella generazione dei contenuti.\nEs:\n- Target: coppie 30-45 che cercano casa in Valpolicella\n- Non usare mai parole come \"lusso sfrenato\"\n- Menziona sempre la zona (Negrar, San Pietro in Cariano...)\n- Tono sobrio, mai ironico"}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Queste indicazioni vengono rispettate in tutte le generazioni: idee, caption, hashtag, revisioni e piani.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Note</CardTitle>
              {saving && <span className="text-xs text-muted-foreground">Salvando...</span>}
            </div>
            <CardDescription className="mt-1">Linee guida, referenze e appunti sul cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md p-3 min-h-48 prose prose-sm max-w-none dark:prose-invert [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-40 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none">
              <EditorContent editor={editor} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contesti & Eventi — local events/seasons the AI uses as context */}
      <ContextEventsCard contactId={contactId} />

      {/* === Conoscenza Mismo AI (aggiornata ogni settimana) === */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Conoscenza Mismo AI</CardTitle>
              <CardDescription className="mt-1">
                Dati raccolti dai reel e dai post: persone nei video, temi, tendenza del profilo e orari migliori
                {brief?.aiUpdatedAt && <span className="block mt-0.5 text-xs">Ultimo aggiornamento: {format(new Date(brief.aiUpdatedAt), "dd/MM/yy HH:mm")}</span>}
              </CardDescription>
            </div>
            <UiTooltip>
              <UiTooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleAiRefresh} disabled={aiRefreshLoading}>
                  {aiRefreshLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </UiTooltipTrigger>
              <UiTooltipContent side="top">Rilegge i post del cliente e aggiorna la conoscenza AI (temi, attori, orari migliori)</UiTooltipContent>
            </UiTooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!brief?.aiData ? (
            <p className="text-sm text-muted-foreground">
              Nessun dato AI ancora raccolto. Carica un reel o clicca "Aggiorna ora" per generare la conoscenza del cliente.
            </p>
          ) : (
            <>
              {!!brief.aiData.actors?.length && (
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5"><Users className="h-3.5 w-3.5 text-muted-foreground" /> Persone nei video</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.aiData.actors.map((a: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {!!brief.aiData.themes?.length && (
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5"><Lightbulb className="h-3.5 w-3.5 text-muted-foreground" /> Temi ricorrenti</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.aiData.themes.map((t: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {!!brief.aiData.trends?.length && (
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5"><TrendingUp className="h-3.5 w-3.5 text-muted-foreground" /> Tendenza del profilo</Label>
                  <ul className="space-y-1">
                    {brief.aiData.trends.slice(0, 4).map((t: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2"><span className="text-primary mt-0.5">▸</span>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!!brief.aiData.bestTimes?.length && (
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Orari migliori</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.aiData.bestTimes.map((h: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs font-mono">{String(h.hour).padStart(2, "0")}:00</Badge>
                    ))}
                  </div>
                </div>
              )}

              {!!brief.aiData.topHashtags?.length && (
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5"><Hash className="h-3.5 w-3.5 text-muted-foreground" /> Top hashtag</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.aiData.topHashtags.slice(0, 8).map((h: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{h.hashtag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {!!brief.aiData.crossClient?.bestHours?.length && (
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5"><TrendingUp className="h-3.5 w-3.5 text-muted-foreground" /> Orari che funzionano su altri clienti</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.aiData.crossClient.bestHours.map((h: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs font-mono">{String(h.hour).padStart(2, "0")}:00 <span className="ml-1 text-muted-foreground">({h.source})</span></Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// === Accounts Tab ===

// Browser publishing (Playwright automation) works for TikTok + Instagram.
// Browser login (session save) works for all platforms.
const BROWSER_PUBLISH_PLATFORMS = ["TIKTOK", "INSTAGRAM"]

function AccountsTab({ contactId, accounts, onRefresh }: { contactId: number; accounts: any[]; onRefresh: () => void }) {
  const [browserStatuses, setBrowserStatuses] = useState<Record<number, { active: boolean; hasSavedProfile: boolean }>>({})
  const [loadingBrowser, setLoadingBrowser] = useState<number | null>(null)
  const [connectDialog, setConnectDialog] = useState<{ open: boolean; platform: string }>({ open: false, platform: "" })
  const [connectName, setConnectName] = useState("")
  const [connectLoading, setConnectLoading] = useState(false)
  const [previewAccount, setPreviewAccount] = useState<any>(null)
  const [browserOnlyPrompt, setBrowserOnlyPrompt] = useState<any>(null)
  const [browserOnlyPassword, setBrowserOnlyPassword] = useState("")
  const [moveTarget, setMoveTarget] = useState<any>(null)
  const [allClients, setAllClients] = useState<any[]>([])

  // Fetch browser status for all accounts
  useEffect(() => {
    accounts.forEach(acc => {
      socialAPI.browserStatus(acc.id)
        .then(r => setBrowserStatuses(prev => ({ ...prev, [acc.id]: r.data })))
        .catch(() => {})
    })
  }, [accounts])

  const refreshBrowserStatus = (id: number) => {
    socialAPI.browserStatus(id)
      .then(r => setBrowserStatuses(prev => ({ ...prev, [id]: r.data })))
      .catch(() => {})
  }

  const openConnectDialog = (platform: string) => {
    setConnectDialog({ open: true, platform })
    setConnectName("")
  }

  const handleBrowserConnect = async () => {
    if (!connectName.trim()) return toast.error("Inserisci il nome dell'account")
    setConnectLoading(true)
    try {
      await socialAPI.browserConnect(contactId, connectDialog.platform, connectName.trim())
      toast.success("Browser aperto — effettua il login, poi chiudi il browser quando hai finito")
      setConnectDialog({ open: false, platform: "" })
      setTimeout(onRefresh, 5000)
    } catch (err: any) { toast.error(err.message) }
    finally { setConnectLoading(false) }
  }

  const handleConnect = async (platform: string) => {
    try {
      const res = await socialAPI.startOAuth(platform, contactId)
      window.location.href = res.data.authUrl
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDisconnect = async (id: number) => {
    try { await socialAPI.disconnectAccount(id); toast.success("Account disconnesso"); onRefresh() }
    catch (err: any) { toast.error(err.message) }
  }

  const handleRefreshToken = async (id: number) => {
    try { await socialAPI.refreshToken(id); toast.success("Token aggiornato"); onRefresh() }
    catch (err: any) { toast.error(err.message) }
  }

  const handleBrowserLogin = async (id: number) => {
    setLoadingBrowser(id)
    try {
      await socialAPI.browserLogin(id)
      toast.success("Browser aperto — effettua il login, poi chiudi il browser")
      setTimeout(() => refreshBrowserStatus(id), 3000)
    } catch (err: any) { toast.error(err.message) }
    finally { setLoadingBrowser(null) }
  }

  const handleBrowserDelete = async (id: number) => {
    try {
      await socialAPI.browserDeleteSession(id)
      setBrowserStatuses(prev => ({ ...prev, [id]: { active: false, hasSavedProfile: false } }))
      toast.success("Sessione browser eliminata")
    } catch (err: any) { toast.error(err.message) }
  }

  const handleToggleMeta = async (accId: number, field: "browserFallback" | "browserOnly", value: boolean) => {
    const acc = accounts.find(a => a.id === accId)
    // Enabling "Solo Browser" is dangerous (ban risk) — require a confirmation password
    if (field === "browserOnly" && value) {
      setBrowserOnlyPrompt(acc)
      setBrowserOnlyPassword("")
      return
    }
    try {
      const meta = { ...(acc?.metadata || {}), [field]: value }
      if (field === "browserOnly" && value) meta.browserFallback = false
      if (field === "browserFallback" && value) meta.browserOnly = false
      await socialAPI.updateAccountMetadata(accId, meta)
      toast.success("Configurazione aggiornata")
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
  }

  const confirmBrowserOnly = async () => {
    if (browserOnlyPassword !== "1258") {
      toast.error("Password errata")
      return
    }
    const acc = browserOnlyPrompt
    if (!acc) return
    try {
      const meta = { ...(acc?.metadata || {}), browserOnly: true, browserFallback: false }
      await socialAPI.updateAccountMetadata(acc.id, meta)
      toast.success("Modalità Solo Browser attivata")
      setBrowserOnlyPrompt(null)
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
  }

  const openMove = async (acc: any) => {
    setMoveTarget(acc)
    if (allClients.length) return
    try {
      const res = await socialAPI.getDashboard()
      setAllClients(res.data.clients || [])
    } catch {}
  }

  const confirmMove = async (targetContactId: number) => {
    if (!moveTarget) return
    try {
      await socialAPI.moveAccount(moveTarget.id, targetContactId)
      toast.success("Account spostato")
      setMoveTarget(null)
      setPreviewAccount(null)
      onRefresh()
    } catch (err: any) { toast.error(err.message) }
  }

  const connectPlatformInfo = PLATFORMS_OAUTH.find(p => p.key === connectDialog.platform)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Account Collegati</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Collega via OAuth (API ufficiali, consigliato) o Browser (fallback)</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Collega Account</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Via OAuth (API) — consigliato</div>
            {PLATFORMS_OAUTH.map(p => (
              <DropdownMenuItem key={`oauth-${p.key}`} onClick={() => handleConnect(p.key)}>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold mr-2 ${p.color}`}>{p.icon}</span>
                {p.label}
              </DropdownMenuItem>
            ))}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Via Browser (fallback)</div>
            {PLATFORMS_OAUTH.map(p => (
              <DropdownMenuItem key={`browser-${p.key}`} onClick={() => openConnectDialog(p.key)}>
                <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold mr-2 ${p.color}`}>{p.icon}</span>
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Account list — one row per account, click to preview */}
      {accounts.length > 0 ? (
        <div className="space-y-2 animate-in fade-in duration-300">
          {accounts.map((acc: any) => {
            const platform = PLATFORMS_OAUTH.find(p => p.key === acc.platform.toLowerCase())
            const isExpiring = acc.tokenExpiresAt && new Date(acc.tokenExpiresAt) < new Date(Date.now() + 7 * 86400_000)
            const noToken = !acc.accessToken
            const bs = browserStatuses[acc.id]
            const accMeta = acc.metadata || {}
            return (
              <div
                key={acc.id}
                className="rounded-xl border p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setPreviewAccount(acc)}
              >
                <div className="relative shrink-0">
                  {acc.profilePicUrl ? (
                    <img src={acc.profilePicUrl} alt={acc.platformName} className="w-10 h-10 rounded-full object-cover border" />
                  ) : (
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${platform?.color || "bg-gray-500 text-white"}`}>{platform?.icon || "?"}</span>
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${PLATFORM_STYLES[acc.platform]?.dot || "bg-gray-400"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{acc.platformName}</p>
                    {accMeta.browserOnly && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">⚠ Solo Browser</Badge>}
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                    {noToken ? (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">No API</Badge>
                    ) : isExpiring ? (
                      <Badge variant="destructive" className="text-[10px]">Token in scadenza</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">API</Badge>
                    )}
                    {bs?.hasSavedProfile ? (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Browser attivo</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Nessuna sessione browser</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="animate-in fade-in duration-300">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex gap-2 mb-4">
              {PLATFORMS_OAUTH.map(p => (
                <span key={p.key} className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold opacity-30 ${p.color}`}>{p.icon}</span>
              ))}
            </div>
            <p className="text-muted-foreground font-medium">Nessun account social collegato</p>
            <p className="text-sm text-muted-foreground mt-1">Collega Instagram, Facebook, LinkedIn o TikTok per iniziare</p>
          </CardContent>
        </Card>
      )}

      {/* Browser Connect Dialog */}
      <Dialog open={connectDialog.open} onOpenChange={(open) => { if (!open) setConnectDialog({ open: false, platform: "" }) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {connectPlatformInfo && (
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${connectPlatformInfo.color}`}>{connectPlatformInfo.icon}</span>
              )}
              Collega {connectPlatformInfo?.label} via Browser
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="account-name">Nome account</Label>
              <Input
                id="account-name"
                placeholder={`es. @nomeutente`}
                value={connectName}
                onChange={(e) => setConnectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBrowserConnect()}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Inserisci il nome/handle dell'account per identificarlo nel CRM</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
              <p className="text-xs font-medium">Come funziona:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Si apre una finestra del browser sulla pagina di login</li>
                <li>Effettui il login col tuo account normalmente</li>
                <li>Chiudi il browser quando hai finito</li>
                <li>La sessione resta salvata per pubblicare in automatico</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog({ open: false, platform: "" })}>Annulla</Button>
            <Button onClick={handleBrowserConnect} disabled={connectLoading || !connectName.trim()}>
              {connectLoading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Apertura...</> : <><Globe className="h-4 w-4 mr-2" /> Apri Browser</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account preview dialog */}
      <Dialog open={!!previewAccount} onOpenChange={(open) => { if (!open) setPreviewAccount(null) }}>
        <DialogContent className="sm:max-w-md">
          {previewAccount && (() => {
            const acc = previewAccount
            const platform = PLATFORMS_OAUTH.find(p => p.key === acc.platform.toLowerCase())
            const noToken = !acc.accessToken
            const bs = browserStatuses[acc.id]
            const accMeta = acc.metadata || {}
            const canBrowserPublish = BROWSER_PUBLISH_PLATFORMS.includes(acc.platform)
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {acc.profilePicUrl ? (
                        <img src={acc.profilePicUrl} alt={acc.platformName} className="w-12 h-12 rounded-full object-cover border" />
                      ) : (
                        <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold ${platform?.color || "bg-gray-500 text-white"}`}>{platform?.icon || "?"}</span>
                      )}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${PLATFORM_STYLES[acc.platform]?.dot || "bg-gray-400"}`} />
                    </div>
                    <div>
                      <p className="text-base">{acc.platformName}</p>
                      <p className="text-xs text-muted-foreground">{acc.platform}</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {noToken ? <Badge variant="outline">No API</Badge> : <Badge variant="secondary">API</Badge>}
                    {bs?.hasSavedProfile ? <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Browser attivo</Badge> : <Badge variant="outline">Nessuna sessione browser</Badge>}
                  </div>

                  {canBrowserPublish && (
                    <div className="border rounded-lg p-3 space-y-2.5 bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground">Modalità pubblicazione</p>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5 text-red-500" /> Solo Browser</p>
                          <p className="text-[10px] text-red-500 font-medium">Super pericoloso — rischio ban account</p>
                        </div>
                        <Switch checked={accMeta.browserOnly === true} onCheckedChange={(v) => handleToggleMeta(acc.id, "browserOnly", v)} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium">Browser Fallback</p>
                          <p className="text-[10px] text-muted-foreground">Usa browser se l'API fallisce</p>
                        </div>
                        <Switch checked={accMeta.browserFallback === true} onCheckedChange={(v) => handleToggleMeta(acc.id, "browserFallback", v)} disabled={accMeta.browserOnly === true} />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {!noToken && <Button variant="outline" size="sm" onClick={() => handleRefreshToken(acc.id)}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Rinnova Token</Button>}
                    <Button variant="outline" size="sm" onClick={() => handleBrowserLogin(acc.id)}><Globe className="h-3.5 w-3.5 mr-1" /> {bs?.hasSavedProfile ? "Re-login Browser" : "Login Browser"}</Button>
                    {bs?.hasSavedProfile && <Button variant="outline" size="sm" onClick={() => handleBrowserDelete(acc.id)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Elimina Sessione</Button>}
                    <Button variant="outline" size="sm" onClick={() => openMove(acc)}><ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Sposta a...</Button>
                    <Button variant="destructive" size="sm" onClick={() => { handleDisconnect(acc.id); setPreviewAccount(null) }}><Unplug className="h-3.5 w-3.5 mr-1" /> Disconnetti</Button>
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Browser-only password prompt */}
      <Dialog open={!!browserOnlyPrompt} onOpenChange={(open) => { if (!open) setBrowserOnlyPrompt(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><ShieldAlert className="h-5 w-5" /> Rischi il ban dell'account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">La modalità "Solo Browser" pubblica sempre tramite automazione browser. Instagram/Facebook possono rilevarla e <strong className="text-red-600">sospendere o bannare l'account</strong>.</p>
            <div className="space-y-1.5">
              <Label>Inserisci la password per confermare</Label>
              <Input type="password" value={browserOnlyPassword} onChange={e => setBrowserOnlyPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && confirmBrowserOnly()} autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrowserOnlyPrompt(null)}>Annulla</Button>
            <Button variant="destructive" onClick={confirmBrowserOnly}>Conferma (pericoloso)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move account to another client */}
      <Dialog open={!!moveTarget} onOpenChange={(open) => { if (!open) setMoveTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sposta account a un cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2 max-h-64 overflow-y-auto">
            {allClients.filter((c: any) => c.id !== contactId).length > 0 ? (
              allClients.filter((c: any) => c.id !== contactId).map((c: any) => (
                <button key={c.id} className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-sm" onClick={() => confirmMove(c.id)}>
                  {c.name}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nessun altro cliente disponibile</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// === Storico Tab ===

function StoricoTab({ posts, cid }: { posts: any[]; cid: number }) {
  const navigate = useNavigate()
  if (!posts.length) {
    return (
      <Card className="animate-in fade-in duration-300">
        <CardContent className="py-16 text-center">
          <Send className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground font-medium">Nessun post pubblicato ancora</p>
          <p className="text-sm text-muted-foreground mt-1">I post pubblicati appariranno qui con anteprima e metriche</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {posts.map((post: any) => {
        const platforms = post.targets?.map((t: any) => t.socialAccount?.platform).filter(Boolean) || []
        const thumb = post.coverImageUrl || (post.mediaUrls as string[] | null)?.[0]
        const likes = post.postMetrics?.reduce((s: number, m: any) => s + (m.likes || 0), 0) || 0
        const comments = post.postMetrics?.reduce((s: number, m: any) => s + (m.comments || 0), 0) || 0
        return (
          <Card key={post.id} className="cursor-pointer hover:bg-muted/30 hover:-translate-y-px transition-all duration-200"
            onClick={() => navigate(`/social/${cid}/posts/${post.id}`)}>
            <CardContent className="py-3 flex items-center gap-3">
              {thumb ? (
                <img src={thumb} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 border" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-2">{post.content}</p>
                <div className="flex items-center flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">{IDEA_TYPES_EMOJI[post.postType] || post.postType}</Badge>
                  <div className="flex gap-1">
                    {[...new Set(platforms)].map((p: any) => (
                      <span key={p} className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${PLATFORM_BADGE[p] || "bg-muted text-muted-foreground"}`}>
                        {PLATFORM_LABELS[p] || p}
                      </span>
                    ))}
                  </div>
                  {post.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(post.publishedAt), "dd MMM HH:mm", { locale: it })}
                    </span>
                  )}
                </div>
              </div>
              {(likes > 0 || comments > 0) && (
                <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-pink-500" />{likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{comments}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// === Analytics Tab ===

function KpiCard({ title, value, delta, icon: Icon }: { title: string; value: string | number; delta?: number; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardDescription className="text-sm font-medium">{title}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString("it-IT") : value}</div>
        {delta !== undefined && delta !== 0 && (
          <div className={`flex items-center text-xs mt-1 ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
            {delta > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {delta > 0 ? "+" : ""}{delta.toLocaleString("it-IT")}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AnalyticsTab({ contactId }: { contactId: number }) {
  const [period, setPeriod] = useState("30")
  const [data, setData] = useState<any>(null)
  const [benchmark, setBenchmark] = useState<any>(null)
  const [postAnalytics, setPostAnalytics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [analyticsView, setAnalyticsView] = useState<"overview" | "platform">("overview")
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [compareMetric, setCompareMetric] = useState<"reach" | "engagement" | "growth" | "followers">("engagement")
  const [insights, setInsights] = useState<{ summary: string; recommendations: string[]; hasData?: boolean } | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [smartSuggestions, setSmartSuggestions] = useState<{ suggestions: { type: string; title: string; detail: string }[]; hasData?: boolean } | null>(null)
  const [smartLoading, setSmartLoading] = useState(false)

  const handleAiInsights = async () => {
    setInsightsLoading(true)
    try {
      const res = await socialAPI.aiInsights(contactId)
      setInsights(res.data)
    } catch (err: any) { toast.error(err.message) }
    finally { setInsightsLoading(false) }
  }

  const handleSmartSuggestions = async () => {
    setSmartLoading(true)
    try {
      const res = await socialAPI.aiSmartSuggestions(contactId)
      setSmartSuggestions(res.data)
    } catch (err: any) { toast.error(err.message) }
    finally { setSmartLoading(false) }
  }

  useEffect(() => {
    const endDate = new Date().toISOString()
    const startDate = subDays(new Date(), parseInt(period)).toISOString()
    setLoading(true)
    Promise.all([
      socialAPI.getAnalytics(contactId, { startDate, endDate }),
      socialAPI.getBenchmark(contactId),
      socialAPI.getPostAnalytics(contactId),
    ])
      .then(([a, b, p]) => { setData(a.data); setBenchmark(b.data); setPostAnalytics(p.data || []) })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [contactId, period])

  // Comparative chart data — one bar per platform per metric
  const compareData = useMemo(() => {
    if (!data?.summary?.length) return []
    return data.summary.map((s: any) => ({
      platform: s.platformName || s.platform,
      platformKey: s.platform,
      followers: s.followers || 0,
      growth: s.followersGrowth || 0,
      reach: s.totalReach || 0,
      impressions: s.totalImpressions || 0,
      engagement: s.totalEngagement || 0,
    }))
  }, [data])

  // Time-series chart data
  const chartData = useMemo(() => {
    if (!data?.analytics?.length) return []
    const byDate: Record<string, any> = {}
    for (const a of data.analytics) {
      const dateKey = format(new Date(a.date), "dd/MM")
      if (!byDate[dateKey]) byDate[dateKey] = { date: dateKey }
      const suffix = a.socialAccount ? ` (${a.socialAccount.platform})` : ""
      byDate[dateKey][`followers${suffix}`] = a.followers
      byDate[dateKey][`engagement${suffix}`] = a.engagement
      byDate[dateKey][`reach${suffix}`] = a.reach
    }
    return Object.values(byDate)
  }, [data])

  const kpis = useMemo(() => {
    if (!data?.summary?.length) return { followers: 0, growth: 0, reach: 0, engagement: 0 }
    return data.summary.reduce((acc: any, s: any) => ({
      followers: acc.followers + (s.followers || 0),
      growth: acc.growth + (s.followersGrowth || 0),
      reach: acc.reach + (s.totalReach || 0),
      engagement: acc.engagement + (s.totalEngagement || 0),
    }), { followers: 0, growth: 0, reach: 0, engagement: 0 })
  }, [data])

  // Filter posts by selected platform
  const filteredPosts = useMemo(() => {
    if (!selectedPlatform) return postAnalytics
    return postAnalytics.filter(p => p.platforms?.includes(selectedPlatform))
  }, [postAnalytics, selectedPlatform])

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>

  return (
    <div className="space-y-4">
      {/* Header: view toggle + period */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${analyticsView === "overview" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setAnalyticsView("overview"); setSelectedPlatform(null) }}
          >
            Panoramica
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${analyticsView === "platform" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setAnalyticsView("platform")}
          >
            Per Piattaforma
          </button>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {analyticsView === "overview" ? (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard title="Follower Totali" value={kpis.followers} delta={kpis.growth} icon={Users} />
            <KpiCard title="Reach Totale" value={kpis.reach} icon={Megaphone} />
            <KpiCard title="Engagement Totale" value={kpis.engagement} icon={Heart} />
            <KpiCard title="Post Pubblicati" value={postAnalytics.length} icon={BarChart3} />
            <KpiCard title="Engagement Rate" value={kpis.followers > 0 ? `${((kpis.engagement / kpis.followers) * 100).toFixed(1)}%` : "—"} icon={TrendingUp} />
          </div>

          {/* Comparative chart — platform vs platform */}
          {compareData.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">Confronto Piattaforme</CardTitle>
                    <CardDescription>Un bar per piattaforma — seleziona la metrica da confrontare</CardDescription>
                  </div>
                  <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                    {([["engagement", "Engagement"], ["reach", "Reach"], ["followers", "Follower"], ["growth", "Crescita"]] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${compareMetric === key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => setCompareMetric(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={compareData} margin={{ top: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => v.toLocaleString("it-IT")} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                    <Bar dataKey={compareMetric} name={compareMetric === "growth" ? "Crescita" : compareMetric === "followers" ? "Follower" : compareMetric === "reach" ? "Reach" : "Engagement"} radius={[6, 6, 0, 0]}>
                      {compareData.map((p: any) => (
                        <Cell key={p.platformKey} fill={PLATFORM_COLORS[p.platformKey] || "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Per-platform KPI cards — clickable to drill down */}
          {compareData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Dettaglio per piattaforma</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {compareData.map((p: any) => {
                  const style = PLATFORM_STYLES[p.platformKey]
                  return (
                    <Card key={p.platformKey} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                      onClick={() => { setAnalyticsView("platform"); setSelectedPlatform(p.platformKey) }}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`w-3 h-3 rounded-full ${style?.dot || "bg-gray-400"}`} />
                          <span className="text-sm font-semibold">{p.platform}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Follower</span>
                            <div className="font-semibold">{p.followers.toLocaleString("it-IT")}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Crescita</span>
                            <div className={`font-semibold ${p.growth > 0 ? "text-green-600" : p.growth < 0 ? "text-red-600" : ""}`}>
                              {p.growth > 0 ? "+" : ""}{p.growth.toLocaleString("it-IT")}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Reach</span>
                            <div className="font-semibold">{p.reach.toLocaleString("it-IT")}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Engagement</span>
                            <div className="font-semibold">{p.engagement.toLocaleString("it-IT")}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Follower trend chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Andamento Follower</CardTitle></CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {data?.accounts?.map((acc: any) => (
                      <Line key={acc.id} type="monotone" dataKey={`followers (${acc.platform})`} stroke={PLATFORM_COLORS[acc.platform] || "#666"} strokeWidth={2} dot={false} name={acc.platformName} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Benchmark section */}
          {benchmark && (
            <div className="grid gap-4 sm:grid-cols-2">
              {benchmark.postTypeStats?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Distribuzione Contenuti</CardTitle></CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={benchmark.postTypeStats.map((s: any) => ({ type: IDEA_TYPES[s.type] || s.type, count: s.count }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" name="Post" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              {benchmark.topHashtags?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Top Hashtag</CardTitle></CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex flex-wrap gap-1.5">
                      {benchmark.topHashtags.map((h: any) => (
                        <Badge key={h.hashtag} variant="secondary" className="text-xs">
                          {h.hashtag} <span className="ml-1 text-muted-foreground">({h.count})</span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Best time to post */}
          {benchmark?.postsByHour && Object.keys(benchmark.postsByHour).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Orari Migliori</CardTitle>
                <CardDescription>Distribuzione post pubblicati per ora del giorno</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Array.from({ length: 24 }, (_, h) => ({ hour: `${h.toString().padStart(2, "0")}:00`, count: benchmark.postsByHour[h] || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Post" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {!chartData.length && !compareData.length && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nessun dato analytics disponibile. I dati vengono raccolti automaticamente ogni notte.</CardContent></Card>
          )}

          {/* AI Insights */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Assistente Mismo</CardTitle>
                {!insights && (
                  <UiTooltip>
                    <UiTooltipTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleAiInsights} disabled={insightsLoading}>
                        {insightsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      </Button>
                    </UiTooltipTrigger>
                    <UiTooltipContent side="top">Analizza i post pubblicati e le performance per darti raccomandazioni</UiTooltipContent>
                  </UiTooltip>
                )}
              </div>
            </CardHeader>
            {insights && (
              <CardContent className="pt-2 space-y-3">
                <p className={`text-sm ${insights.hasData === false ? "text-muted-foreground italic" : ""}`}>{insights.summary}</p>
                {insights.recommendations?.length > 0 && (
                  <ul className="space-y-1.5">
                    {insights.recommendations.map((r: string, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">▸</span>{r}
                      </li>
                    ))}
                  </ul>
                )}
                {insights.hasData !== false && (
                  <div className="flex items-center justify-end border-t pt-2">
                    <span className="text-xs text-muted-foreground mr-2">Utile?</span>
                    <AiFeedback kind="insights" content={`${insights.summary} ${insights.recommendations?.join(" ") || ""}`} contactId={contactId} />
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Smart suggestions (cross-client) */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-primary" /> Suggerimenti intelligenti</CardTitle>
                {!smartSuggestions && (
                  <UiTooltip>
                    <UiTooltipTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleSmartSuggestions} disabled={smartLoading}>
                        {smartLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      </Button>
                    </UiTooltipTrigger>
                    <UiTooltipContent side="top">Suggerimenti cross-cliente: orari, hashtag e formati che funzionano su altri clienti</UiTooltipContent>
                  </UiTooltip>
                )}
              </div>
              <CardDescription className="mt-1">Confronto con gli altri clienti: orari e formati che stanno funzionando altrove</CardDescription>
            </CardHeader>
            {smartSuggestions && (
              <CardContent className="pt-2 space-y-2.5">
                {smartSuggestions.suggestions?.length > 0 ? (
                  smartSuggestions.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-md border p-2.5 bg-muted/30">
                      {s.type === "time" && <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                      {s.type === "hashtags" && <Hash className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                      {s.type === "format" && <Film className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{s.title}</p>
                        <p className="text-sm text-muted-foreground">{s.detail}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nessun suggerimento disponibile: servono più dati reali di performance (like, commenti, reach) prima di consigliare orari o formati.</p>
                )}
                <div className="flex items-center justify-end border-t pt-2">
                  <span className="text-xs text-muted-foreground mr-2">Utili?</span>
                  <AiFeedback kind="suggestions" content={smartSuggestions.suggestions?.map(s => `${s.title}: ${s.detail}`).join(" ") || ""} contactId={contactId} />
                </div>
              </CardContent>
            )}
          </Card>
        </>
      ) : (
        /* === Per-Platform View === */
        <>
          {/* Platform selector */}
          <div className="flex gap-2 flex-wrap">
            <button
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${!selectedPlatform ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
              onClick={() => setSelectedPlatform(null)}
            >Tutti</button>
            {(data?.accounts || []).map((acc: any) => {
              const style = PLATFORM_STYLES[acc.platform]
              return (
                <button key={acc.id}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors flex items-center gap-1.5 ${selectedPlatform === acc.platform ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                  onClick={() => setSelectedPlatform(acc.platform)}
                >
                  <span className={`w-2 h-2 rounded-full ${style?.dot || "bg-gray-400"}`} />
                  {acc.platformName}
                </button>
              )
            })}
          </div>

          {/* Platform KPIs */}
          {selectedPlatform && data?.summary && (() => {
            const ps = data.summary.find((s: any) => s.platform === selectedPlatform)
            if (!ps) return null
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Follower" value={ps.followers || 0} delta={ps.followersGrowth} icon={Users} />
                <KpiCard title="Reach" value={ps.totalReach || 0} icon={Megaphone} />
                <KpiCard title="Impressions" value={ps.totalImpressions || 0} icon={Eye} />
                <KpiCard title="Engagement" value={ps.totalEngagement || 0} icon={Heart} />
              </div>
            )
          })()}

          {/* Platform trend */}
          {chartData.length > 0 && selectedPlatform && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Andamento</CardTitle></CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey={`followers (${selectedPlatform})`} stroke={PLATFORM_COLORS[selectedPlatform] || "#666"} strokeWidth={2} dot={false} name="Follower" />
                    <Line type="monotone" dataKey={`reach (${selectedPlatform})`} stroke="#10b981" strokeWidth={2} dot={false} name="Reach" />
                    <Line type="monotone" dataKey={`engagement (${selectedPlatform})`} stroke="#f59e0b" strokeWidth={2} dot={false} name="Engagement" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Post-level metrics table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance Post {selectedPlatform ? `(${selectedPlatform})` : ""}</CardTitle>
              <CardDescription>{filteredPosts.length} post pubblicati</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {filteredPosts.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contenuto</TableHead>
                        <TableHead className="w-20">Tipo</TableHead>
                        <TableHead className="w-24">Data</TableHead>
                        <TableHead className="w-16 text-right"><Heart className="h-3.5 w-3.5 inline" /></TableHead>
                        <TableHead className="w-16 text-right"><MessageCircle className="h-3.5 w-3.5 inline" /></TableHead>
                        <TableHead className="w-16 text-right"><Share2 className="h-3.5 w-3.5 inline" /></TableHead>
                        <TableHead className="w-16 text-right"><Bookmark className="h-3.5 w-3.5 inline" /></TableHead>
                        <TableHead className="w-20 text-right">Reach</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPosts.map((post: any) => (
                        <TableRow key={post.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {(post.platforms || []).map((pl: string) => (
                                  <span key={pl} className={`w-2 h-2 rounded-full ${PLATFORM_STYLES[pl]?.dot || "bg-gray-400"}`} />
                                ))}
                              </div>
                              <span className="text-sm line-clamp-1 max-w-xs">{post.content}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{IDEA_TYPES[post.postType] || post.postType}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {post.publishedAt ? format(new Date(post.publishedAt), "dd/MM/yy") : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">{post.metrics?.likes || 0}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{post.metrics?.comments || 0}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{post.metrics?.shares || 0}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{post.metrics?.saves || 0}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{(post.metrics?.reach || 0).toLocaleString("it-IT")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">Nessun post pubblicato{selectedPlatform ? ` su ${selectedPlatform}` : ""}.</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// === Report Tab ===

function ReportTab({ contactId }: { contactId: number }) {
  const [reports, setReports] = useState<any[]>([])
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newFrequency, setNewFrequency] = useState("MONTHLY")
  const [newRecipients, setNewRecipients] = useState("")

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      socialAPI.getReports(contactId).then(r => setReports(r.data)),
      socialAPI.getClientConfig(contactId).then(r => setConfig(r.data)),
    ])
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [contactId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    if (!newName.trim() || !newRecipients.trim()) return toast.error("Nome e destinatari sono obbligatori")
    try {
      await socialAPI.createReport({ contactId, name: newName, frequency: newFrequency, recipients: newRecipients.split(",").map(e => e.trim()) })
      toast.success("Report creato")
      setShowCreate(false); setNewName(""); setNewRecipients("")
      fetchData()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDelete = async (id: number) => {
    try { await socialAPI.deleteReport(id); toast.success("Report eliminato"); fetchData() }
    catch (err: any) { toast.error(err.message) }
  }

  const handleConfigUpdate = async (field: string, value: any) => {
    try {
      await socialAPI.updateClientConfig(contactId, { [field]: value })
      setConfig((prev: any) => ({ ...prev, [field]: value }))
      toast.success("Configurazione aggiornata")
    } catch (err: any) { toast.error(err.message) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Report Schedulati</CardTitle>
                <CardDescription className="mt-1">Invio automatico report analytics via email</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Nuovo</Button>
            </div>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Frequenza</TableHead>
                      <TableHead className="hidden sm:table-cell">Prossimo Invio</TableHead>
                      <TableHead>Attivo</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell><Badge variant="secondary">{r.frequency === "WEEKLY" ? "Settimanale" : r.frequency === "BIWEEKLY" ? "Bisettimanale" : "Mensile"}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {r.nextSendAt ? format(new Date(r.nextSendAt), "dd MMM yyyy", { locale: it }) : "—"}
                        </TableCell>
                        <TableCell>
                          <Switch checked={r.isActive} onCheckedChange={() => socialAPI.updateReport(r.id, { isActive: !r.isActive }).then(fetchData)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">Nessun report configurato</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Configurazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Approvazione Richiesta</Label>
                <p className="text-xs text-muted-foreground">I post richiedono approvazione</p>
              </div>
              <Switch checked={config?.requireApproval || false} onCheckedChange={v => handleConfigUpdate("requireApproval", v)} />
            </div>
            {config?.requireApproval && (
              <div className="space-y-2">
                <Label>Modalità Approvazione</Label>
                <Select value={config?.approvalMode || "internal"} onValueChange={v => handleConfigUpdate("approvalMode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Interna (team)</SelectItem>
                    <SelectItem value="client">Portale cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={config?.defaultTimezone || "Europe/Rome"} onValueChange={v => handleConfigUpdate("defaultTimezone", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Rome">Europe/Rome</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="America/New_York">America/New York</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo Report</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Report Mensile Instagram" />
            </div>
            <div className="space-y-2">
              <Label>Frequenza</Label>
              <Select value={newFrequency} onValueChange={setNewFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Settimanale</SelectItem>
                  <SelectItem value="BIWEEKLY">Bisettimanale</SelectItem>
                  <SelectItem value="MONTHLY">Mensile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destinatari (email separate da virgola)</Label>
              <Input value={newRecipients} onChange={e => setNewRecipients(e.target.value)} placeholder="cliente@email.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annulla</Button>
            <Button onClick={handleCreate}>Crea Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
