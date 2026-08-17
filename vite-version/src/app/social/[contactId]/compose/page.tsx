import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft, X, Send, Clock, Film, Image as ImageIcon, Plus, GripVertical,
  AlertTriangle, FileText, Upload, Loader2,
} from "lucide-react"
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { socialAPI } from "@/lib/social-api"
import { contactsAPI } from "@/lib/contacts-api"
import { toast } from "sonner"
import { PlatformPreview, PLATFORM_META, formatScheduleLabel } from "../components/platform-preview"
import { AiFeedback } from "../components/ai-feedback"
import { AiIconButton } from "../components/ai-icon-button"


const parsePlatforms = (pc: any): string[] => {
  if (!pc) return []
  try {
    const p = typeof pc.platforms === "string" ? JSON.parse(pc.platforms) : pc.platforms
    return Array.isArray(p) ? p : []
  } catch { return [] }
}

type PostType = "POST" | "CAROUSEL" | "REEL"

function SortableSlide({ id, url, index, onRemove }: { id: string; url: string; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="relative group aspect-[4/5] rounded-lg overflow-hidden bg-muted border">
      <img src={url} alt="" className="w-full h-full object-cover" />
      <div className="absolute top-1 left-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">{index + 1}</div>
      <button {...attributes} {...listeners} className="absolute top-1 right-7 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 cursor-grab">
        <GripVertical className="h-3 w-3" />
      </button>
      <button className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100" onClick={onRemove}>
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}


export default function Compose() {
  const { contactId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cid = parseInt(contactId!)
  const ideaId = searchParams.get("idea")
  const atParam = searchParams.get("at")

  const [contact, setContact] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [idea, setIdea] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [postType, setPostType] = useState<PostType>("POST")
  const [content, setContent] = useState("")
  const [contentMode, setContentMode] = useState<"same" | "different">("same")
  const [platformContent, setPlatformContent] = useState<Record<string, string>>({})
  const [mediaMode, setMediaMode] = useState<"same" | "different">("same")
  const [platformMediaFiles, setPlatformMediaFiles] = useState<Record<string, { file?: File; coverFile?: File }>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [lastAiCaption, setLastAiCaption] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [fileIds, setFileIds] = useState<string[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverFromFrame, setCoverFromFrame] = useState<string | null>(null)
  const [shareToFeed, setShareToFeed] = useState(true)
  const [publishNow, setPublishNow] = useState(false)
  const [masterSchedule, setMasterSchedule] = useState("")
  const [accountSchedules, setAccountSchedules] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previewPlatform, setPreviewPlatform] = useState<string>("")
  const [carouselSlide, setCarouselSlide] = useState(0)
  const [mediaWarnings, setMediaWarnings] = useState<string[]>([])
  const fileCounter = useRef(0)

  useEffect(() => {
    const fetches: Promise<any>[] = [
      contactsAPI.getContactById(cid).then(r => setContact(r.data)),
      socialAPI.getAccounts(cid).then(r => setAccounts(r.data)),
    ]
    if (ideaId) fetches.push(socialAPI.getPost(parseInt(ideaId)).then(r => setIdea(r.data)))
    Promise.all(fetches)
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [cid, ideaId])

  useEffect(() => {
    if (!idea || !accounts.length) return
    const caption = idea.ideaCaption || idea.content || ""
    const hashtagMatch = caption.match(/#[\w\u00C0-\u024F]+/g) || []
    setContent(caption.replace(/#[\w\u00C0-\u024F]+/g, "").trim())
    setHashtags(hashtagMatch.join(" "))
    setContentMode("same")
    setPlatformContent({})
    if (idea.postType === "REEL") setPostType("REEL")
    else if (idea.postType === "CAROUSEL") setPostType("CAROUSEL")
    else setPostType("POST")

    const ideaPlatforms = parsePlatforms(idea.platformContent)
    const defaultDate = idea.scheduledAt ? new Date(idea.scheduledAt).toISOString().slice(0, 16) : ""
    const initial: Record<number, string> = {}
    accounts.forEach(acc => {
      if (ideaPlatforms.length === 0 || ideaPlatforms.includes(acc.platform)) {
        initial[acc.id] = defaultDate
      }
    })
    setAccountSchedules(initial)
    const first = accounts.find(a => a.id in initial)
    if (first) setPreviewPlatform(first.platform)
  }, [idea, accounts])

  // New post (no idea): preselect FB/IG if present
  useEffect(() => {
    if (ideaId || !accounts.length || Object.keys(accountSchedules).length) return
    const preferred = accounts.filter(a => a.platform === "FACEBOOK" || a.platform === "INSTAGRAM")
    const pick = preferred.length ? preferred : accounts
    const defaultAt = atParam || ""
    const initial: Record<number, string> = {}
    pick.forEach(a => { initial[a.id] = defaultAt })
    setAccountSchedules(initial)
    if (pick[0]) setPreviewPlatform(pick[0].platform)
  }, [accounts, ideaId, atParam])

  const selectedPlatforms = useMemo(
    () => [...new Set(accounts.filter(a => a.id in accountSchedules).map((a: any) => a.platform as string))],
    [accounts, accountSchedules],
  )
  const hasLinkedIn = selectedPlatforms.includes("LINKEDIN")
  const charLimit = useMemo(() => {
    if (!selectedPlatforms.length) return 2200
    return Math.min(...selectedPlatforms.map(p => PLATFORM_META[p]?.limit || 2200))
  }, [selectedPlatforms])

  const addFiles = useCallback((newFiles: File[]) => {
    const filtered = postType === "REEL"
      ? newFiles.filter(f => f.type.startsWith("video/")).slice(0, 1)
      : postType === "POST"
        ? newFiles.filter(f => f.type.startsWith("image/") || f.type === "application/pdf").slice(0, 1)
        : newFiles.filter(f => f.type.startsWith("image/"))

    const warnings: string[] = []
    for (const f of filtered) {
      const sizeMB = f.size / (1024 * 1024)
      if (f.type.startsWith("image/") && sizeMB > 30) warnings.push(`Immagine ${sizeMB.toFixed(1)} MB (consigliato ≤ 30 MB)`)
      if (f.type.startsWith("video/") && sizeMB > 100) warnings.push(`Video ${sizeMB.toFixed(1)} MB (max upload 100 MB)`)
    }
    setMediaWarnings(warnings)

    if (postType === "POST" || postType === "REEL") {
      setFiles(filtered)
      setFileIds(filtered.map(() => `f-${++fileCounter.current}`))
    } else {
      setFiles(prev => [...prev, ...filtered].slice(0, 10))
      setFileIds(prev => [...prev, ...filtered.map(() => `f-${++fileCounter.current}`)].slice(0, 10))
    }
  }, [postType])

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setFileIds(prev => prev.filter((_, i) => i !== idx))
    setCarouselSlide(s => Math.min(s, Math.max(0, files.length - 2)))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const handleTypeChange = (t: PostType) => {
    setPostType(t)
    setFiles([])
    setFileIds([])
    setCoverFile(null)
    setCoverFromFrame(null)
    setCarouselSlide(0)
    setMediaWarnings([])
    setMediaMode("same")
    setPlatformMediaFiles({})
  }

  const filePreviews = useMemo(
    () => files.map(f => ({ file: f, url: URL.createObjectURL(f), isVideo: f.type.startsWith("video/") })),
    [files],
  )
  useEffect(() => () => filePreviews.forEach(p => URL.revokeObjectURL(p.url)), [filePreviews])

  // Per-platform media overrides (different video/cover per social)
  const platformPreviews = useMemo(() => {
    const out: Record<string, { url: string; isVideo: boolean }> = {}
    for (const [platform, m] of Object.entries(platformMediaFiles)) {
      if (m.file) out[platform] = { url: URL.createObjectURL(m.file), isVideo: m.file.type.startsWith("video/") }
    }
    return out
  }, [platformMediaFiles])
  useEffect(() => () => { Object.values(platformPreviews).forEach(p => URL.revokeObjectURL(p.url)) }, [platformPreviews])

  const setPlatformMedia = (platform: string, key: "file" | "coverFile", file: File | null) =>
    setPlatformMediaFiles(prev => {
      const next = { ...prev }
      const cur = next[platform] || {}
      if (file) next[platform] = { ...cur, [key]: file }
      else {
        const { [key]: _drop, ...rest } = cur
        next[platform] = rest
      }
      if (!next[platform].file && !next[platform].coverFile) delete next[platform]
      return next
    })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIdx = fileIds.indexOf(active.id as string)
      const newIdx = fileIds.indexOf(over.id as string)
      setFiles(prev => arrayMove(prev, oldIdx, newIdx))
      setFileIds(prev => arrayMove(prev, oldIdx, newIdx))
    }
  }

  const selectedAccountIds = Object.keys(accountSchedules).map(Number)
  const selectedAccounts = useMemo(
    () => accounts.filter(a => selectedAccountIds.includes(a.id)),
    [accounts, selectedAccountIds],
  )
  const previewAccount = useMemo(() => {
    if (previewPlatform) {
      return selectedAccounts.find(a => a.platform === previewPlatform) || selectedAccounts[0] || null
    }
    return selectedAccounts[0] || null
  }, [previewPlatform, selectedAccounts])

  const toggleAccount = (id: number) => {
    setAccountSchedules(prev => {
      const next = { ...prev }
      if (id in next) delete next[id]
      else next[id] = ""
      return next
    })
  }
  const setAccountTime = (id: number, dt: string) => setAccountSchedules(prev => ({ ...prev, [id]: dt }))
  const applyToAll = (dt: string) => {
    setAccountSchedules(prev => {
      const next = { ...prev }
      for (const id of Object.keys(next)) next[Number(id)] = dt
      return next
    })
  }

  const handleCaptureFrame = () => {
    const video = document.getElementById("compose-video-preview") as HTMLVideoElement
    if (!video) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")!.drawImage(video, 0, 0)
    setCoverFromFrame(canvas.toDataURL("image/jpeg", 0.9))
    setCoverFile(null)
  }

  const hashtagList = useMemo(
    () => hashtags.split(/[\s,]+/).filter(h => h.length > 0).map(h => h.startsWith("#") ? h : `#${h}`),
    [hashtags],
  )
  const hashtagStr = hashtagList.join(" ")
  const fullTextLen = content.length + (hashtagStr ? 1 + hashtagStr.length : 0)
  const getContentFor = (platform: string) =>
    contentMode === "different" && platformContent[platform]?.trim() ? platformContent[platform] : content

  const handleAiEnhance = async () => {
    setAiLoading(true)
    const cidNum = parseInt(cid || "0") || undefined
    try {
      if (content.trim()) {
        const res = await socialAPI.aiEnhanceCaption(content, undefined, cidNum)
        setContent(res.data.caption || content)
        if (res.data.hashtags?.length) setHashtags(res.data.hashtags.join(" "))
        setLastAiCaption(`${res.data.caption || content} ${res.data.hashtags?.join(" ") || ""}`.trim())
        toast.success("Caption migliorata con AI")
      } else {
        const topic = idea?.content || "vendita immobiliare in Valpolicella"
        const res = await socialAPI.aiGenerateCaption(topic, undefined, cidNum)
        setContent(res.data.caption || "")
        if (res.data.hashtags?.length) setHashtags(res.data.hashtags.join(" "))
        setLastAiCaption(`${res.data.caption || ""} ${res.data.hashtags?.join(" ") || ""}`.trim())
        toast.success("Caption generata con AI")
      }
    } catch (err: any) { toast.error(err.message) }
    finally { setAiLoading(false) }
  }

  const missingMsg = !files.length
    ? (postType === "CAROUSEL" ? "Carica almeno 2 slide" : "Carica un file media")
    : postType === "CAROUSEL" && files.length < 2
      ? "Servono almeno 2 slide"
      : !content.trim()
        ? "Inserisci la descrizione"
        : !selectedAccountIds.length
          ? "Seleziona almeno un account"
          : !publishNow && Object.values(accountSchedules).some(dt => !dt)
            ? "Imposta data/ora per ogni account selezionato"
            : fullTextLen > charLimit
              ? `Testo troppo lungo (max ${charLimit} caratteri sulle piattaforme selezionate)`
              : ""
  const canSubmit = !missingMsg

  const backUrl = `/social/${cid}?tab=ced&sub=${ideaId ? "idee" : "programmazione"}`
  const doneUrl = `/social/${cid}?tab=ced&sub=programmazione`

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      let finalCoverFile = coverFile
      if (coverFromFrame && !coverFile) {
        const blob = await (await fetch(coverFromFrame)).blob()
        finalCoverFile = new File([blob], "cover.jpg", { type: "image/jpeg" })
      }

      const schedules: Record<string, string> = {}
      for (const [id, dt] of Object.entries(accountSchedules)) schedules[id] = dt

      const platformContentPayload = contentMode === "different" && Object.keys(platformContent).length
        ? platformContent
        : undefined
      const platformMediaPayload = mediaMode === "different" && Object.keys(platformMediaFiles).length
        ? platformMediaFiles
        : undefined

      if (ideaId) {
        await socialAPI.promoteIdea(parseInt(ideaId), {
          content,
          hashtags: hashtagList,
          postType,
          accountSchedules: schedules,
          files,
          coverFile: finalCoverFile || undefined,
          shareToFeed: postType === "REEL" ? shareToFeed : undefined,
          publishNow,
          platformContent: platformContentPayload,
          platformMediaFiles: platformMediaPayload,
        })
      } else {
        await socialAPI.createPost({
          contactId: cid,
          content,
          platformContent: platformContentPayload,
          postType,
          targetAccountIds: selectedAccountIds,
          hashtags: hashtagList.length ? hashtagList : undefined,
          shareToFeed: postType === "REEL" ? shareToFeed : undefined,
          files,
          coverFile: finalCoverFile || undefined,
          accountSchedules: schedules,
          publishNow,
          platformMediaFiles: platformMediaPayload,
        })
      }

      toast.success(publishNow ? "Pubblicazione avviata" : "Post programmato")
      navigate(doneUrl)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <BaseLayout title="Programma Post">
        <div className="px-4 lg:px-6 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </BaseLayout>
    )
  }

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) },
    onDragLeave: () => setDragOver(false),
    onDrop: handleDrop,
  }

  return (
    <BaseLayout title="Programma Post" description={contact?.name}>
      <div className="px-4 lg:px-6 flex flex-col h-[calc(100vh-7rem)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 shrink-0 border-b mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" className="-ml-2 shrink-0" onClick={() => navigate(backUrl)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">
                {idea ? "Programma da idea" : "Nuovo post"}
              </h1>
              {idea?.content && (
                <p className="text-xs text-muted-foreground truncate">{idea.content}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate(backUrl)}>Annulla</Button>
            <Button size="sm" disabled={!canSubmit || submitting} onClick={handleSubmit} className={submitting ? "animate-pulse" : ""}>
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> {publishNow ? "Pubblicazione..." : "Programmazione..."}</>
              ) : publishNow ? (
                <><Send className="h-4 w-4 mr-1" /> Pubblica ora</>
              ) : (
                <><Clock className="h-4 w-4 mr-1" /> Programma</>
              )}
            </Button>
          </div>
        </div>

        {/* Meta-like: form left, sticky preview right */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 min-h-0 overflow-hidden">

          {/* LEFT — composer */}
          <div className="overflow-y-auto pr-1 space-y-5 pb-6">
            {/* Type */}
            <section>
              <Label className="text-xs font-semibold mb-2 block">Formato</Label>
              <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
                {(["POST", "CAROUSEL", "REEL"] as PostType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${postType === t ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
                    onClick={() => handleTypeChange(t)}
                  >
                    {t === "POST" ? "Post" : t === "CAROUSEL" ? "Carosello" : "Reel / Video"}
                  </button>
                ))}
              </div>
            </section>

            {/* Accounts + per-platform schedule */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Dove e quando</Label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={publishNow} onCheckedChange={(v) => setPublishNow(!!v)} />
                  Pubblica ora
                </label>
              </div>

              {/* Master schedule — quick setter for all selected accounts */}
              {!publishNow && accounts.length > 0 && selectedAccountIds.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <Label className="text-[11px] text-muted-foreground block">Data e ora di pubblicazione</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="datetime-local"
                      className="h-8 text-xs flex-1"
                      value={masterSchedule}
                      onChange={e => setMasterSchedule(e.target.value)}
                    />
                    <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => { if (masterSchedule) applyToAll(masterSchedule) }}>
                      Imposta per tutti
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Imposta un orario unico per tutti i social, poi modifica i singoli per sfalsare le uscite.
                  </p>
                </div>
              )}

              {accounts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Nessun account collegato</p>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/social/${cid}?tab=accounts`)}>
                    Collega account
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {accounts.map(acc => {
                    const pm = PLATFORM_META[acc.platform] || { icon: "?", color: "bg-gray-500 text-white", label: acc.platform, limit: 2200 }
                    const selected = acc.id in accountSchedules
                    const meta = typeof acc.metadata === "string" ? (() => { try { return JSON.parse(acc.metadata) } catch { return {} } })() : (acc.metadata || {})
                    const browserOnly = !acc.accessToken || meta.browserOnly
                    return (
                      <div
                        key={acc.id}
                        className={`rounded-lg border p-3 transition-colors ${selected ? "border-primary/40 bg-primary/[0.03]" : "border-border opacity-70"}`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <Checkbox checked={selected} onCheckedChange={() => {
                            toggleAccount(acc.id)
                            if (!selected) setPreviewPlatform(acc.platform)
                          }} />
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-[10px] font-bold ${pm.color}`}>{pm.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{acc.platformName || pm.label}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {pm.label}{browserOnly ? " · sessione browser" : " · API"}
                            </p>
                          </div>
                          {selected && (
                            <button
                              type="button"
                              className="text-[10px] text-primary hover:underline"
                              onClick={(e) => { e.preventDefault(); setPreviewPlatform(acc.platform) }}
                            >
                              Anteprima
                            </button>
                          )}
                        </label>
                        {selected && !publishNow && (
                          <div className="mt-2.5 pl-9 flex items-center gap-2">
                            <Input
                              type="datetime-local"
                              className="h-8 text-xs flex-1"
                              value={accountSchedules[acc.id] || ""}
                              onChange={e => setAccountTime(acc.id, e.target.value)}
                            />
                            {selectedAccountIds.length > 1 && accountSchedules[acc.id] && (
                              <button
                                type="button"
                                className="text-[10px] text-primary whitespace-nowrap hover:underline"
                                onClick={() => applyToAll(accountSchedules[acc.id])}
                              >
                                Applica a tutti
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {!publishNow && selectedAccountIds.length > 1 && (
                <p className="text-[11px] text-muted-foreground">
                  Ogni social può uscire in un giorno/ora diverso — verranno creati post separati per orario.
                </p>
              )}
            </section>

            {/* Caption */}
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold">Descrizione</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] tabular-nums ${fullTextLen > charLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {fullTextLen}/{charLimit}
                  </span>
                  <AiIconButton
                    onClick={handleAiEnhance}
                    loading={aiLoading}
                    title={content.trim() ? "Migliora con AI" : "Genera con AI"}
                  />
                  {lastAiCaption && (
                    <AiFeedback kind="caption" content={lastAiCaption} contactId={parseInt(cid || "0") || undefined} className="border rounded-md" />
                  )}
                </div>
              </div>

              {/* Same vs different content toggle */}
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2">
                  <Switch checked={contentMode === "different"} onCheckedChange={(v) => setContentMode(v ? "different" : "same")} />
                  <span className="text-xs font-medium">Contenuto diverso per ogni social</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {contentMode === "different" ? "Ogni social ha la sua descrizione" : "Stessa descrizione per tutti"}
                </span>
              </div>

              {contentMode === "same" ? (
                <>
                  <Textarea
                    placeholder="Scrivi la caption che vedranno sui social..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={5}
                    className="resize-y text-[15px] leading-relaxed"
                  />
                  <Input
                    placeholder="#hashtag #campagne"
                    value={hashtags}
                    onChange={e => setHashtags(e.target.value)}
                    className="text-sm"
                  />
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">Descrizione di base (fallback)</Label>
                    <Textarea
                      placeholder="Descrizione usata dove non c'è un override..."
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      rows={3}
                      className="resize-y text-sm"
                    />
                  </div>
                  {selectedAccounts.map(acc => {
                    const pm = PLATFORM_META[acc.platform] || { icon: "?", color: "bg-gray-500 text-white", label: acc.platform, limit: 2200 }
                    const val = platformContent[acc.platform] || ""
                    const len = val.length + (hashtagStr ? 1 + hashtagStr.length : 0)
                    return (
                      <div key={acc.id}>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[11px] flex items-center gap-1.5">
                            <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-bold ${pm.color}`}>{pm.icon}</span>
                            Descrizione {pm.label}
                          </Label>
                          <span className={`text-[10px] tabular-nums ${len > pm.limit ? "text-destructive font-medium" : "text-muted-foreground"}`}>{len}/{pm.limit}</span>
                        </div>
                        <Textarea
                          placeholder={`Override per ${pm.label} (vuoto = usa la descrizione di base)`}
                          value={val}
                          onChange={e => setPlatformContent(prev => ({ ...prev, [acc.platform]: e.target.value }))}
                          rows={3}
                          className="resize-y text-sm"
                        />
                      </div>
                    )
                  })}
                  <Input
                    placeholder="#hashtag #campagne (uguali per tutti)"
                    value={hashtags}
                    onChange={e => setHashtags(e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}
            </section>

            {/* Media */}
            <section className="space-y-2">
              <Label className="text-xs font-semibold">Media</Label>

              {postType === "POST" && (
                files.length === 0 ? (
                  <div
                    className={`border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20 bg-muted/20"}`}
                    {...dropHandlers}
                    onClick={() => document.getElementById("compose-file-input")?.click()}
                  >
                    <Upload className="h-7 w-7 mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Trascina immagine{hasLinkedIn ? " o PDF" : ""}</p>
                    <input id="compose-file-input" type="file" accept={`image/*${hasLinkedIn ? ",application/pdf" : ""}`} className="hidden"
                      onChange={e => e.target.files && addFiles(Array.from(e.target.files))} />
                  </div>
                ) : (
                  <div className="relative group rounded-xl overflow-hidden bg-muted aspect-[4/5] max-h-72 w-full max-w-xs">
                    {files[0]?.type === "application/pdf" ? (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <FileText className="h-10 w-10 text-red-500" />
                        <span className="text-xs mt-2 truncate max-w-[80%]">{files[0].name}</span>
                      </div>
                    ) : (
                      <img src={filePreviews[0]?.url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button type="button" className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1" onClick={() => { setFiles([]); setFileIds([]) }}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              )}

              {postType === "CAROUSEL" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{files.length}/10 slide · min 2</p>
                  {files.length === 0 ? (
                    <div
                      className={`border-2 border-dashed rounded-xl h-36 flex flex-col items-center justify-center cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"}`}
                      {...dropHandlers}
                      onClick={() => document.getElementById("compose-carousel-input")?.click()}
                    >
                      <Upload className="h-6 w-6 mb-1 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Aggiungi slide</p>
                      <input id="compose-carousel-input" type="file" accept="image/*" multiple className="hidden"
                        onChange={e => e.target.files && addFiles(Array.from(e.target.files))} />
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={fileIds} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {fileIds.map((id, i) => (
                            <SortableSlide key={id} id={id} url={filePreviews[i]?.url || ""} index={i} onRemove={() => removeFile(i)} />
                          ))}
                          {files.length < 10 && (
                            <div
                              className="aspect-[4/5] rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-muted-foreground/40"
                              onClick={() => document.getElementById("compose-carousel-input2")?.click()}
                            >
                              <Plus className="h-5 w-5 text-muted-foreground/40" />
                              <input id="compose-carousel-input2" type="file" accept="image/*" multiple className="hidden"
                                onChange={e => e.target.files && addFiles(Array.from(e.target.files))} />
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}

              {postType === "REEL" && (
                <div className="space-y-3">
                  {files.length === 0 ? (
                    <div
                      className={`border-2 border-dashed rounded-xl aspect-[9/16] max-h-72 w-auto mx-auto flex flex-col items-center justify-center cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"}`}
                      {...dropHandlers}
                      onClick={() => document.getElementById("compose-reel-input")?.click()}
                    >
                      <Film className="h-7 w-7 mb-2 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Trascina video</p>
                      <input id="compose-reel-input" type="file" accept="video/*" className="hidden"
                        onChange={e => e.target.files && addFiles(Array.from(e.target.files))} />
                    </div>
                  ) : (
                    <>
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-72 w-auto mx-auto">
                        <video id="compose-video-preview" src={filePreviews[0]?.url} className="w-full h-full object-contain" controls muted />
                        <button type="button" className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1" onClick={() => { setFiles([]); setFileIds([]) }}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" type="button" onClick={handleCaptureFrame}>
                          <Film className="h-3 w-3 mr-1" /> Cattura cover
                        </Button>
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                            if (e.target.files?.[0]) { setCoverFile(e.target.files[0]); setCoverFromFrame(null) }
                          }} />
                          <Button variant="outline" size="sm" asChild><span><ImageIcon className="h-3 w-3 mr-1" /> Carica cover</span></Button>
                        </label>
                        {(coverFromFrame || coverFile) && (
                          <button type="button" className="text-xs text-muted-foreground flex items-center gap-1" onClick={() => { setCoverFile(null); setCoverFromFrame(null) }}>
                            {coverFromFrame && <img src={coverFromFrame} alt="" className="w-8 h-8 object-cover rounded border" />}
                            {coverFile?.name}
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <Label className="text-xs">Condividi anche nel feed</Label>
                        <Switch checked={shareToFeed} onCheckedChange={setShareToFeed} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {mediaWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-2 space-y-1">
                  {mediaWarnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Per-platform media override (reel: different video/cover per social) */}
            {postType === "REEL" && selectedAccounts.length >= 2 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mediaMode === "different"}
                      onCheckedChange={(v) => { setMediaMode(v ? "different" : "same"); if (!v) setPlatformMediaFiles({}) }}
                    />
                    <span className="text-xs font-medium">Video/cover diverso per social</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {mediaMode === "different" ? "Ogni social ha il suo video" : "Stesso video per tutti"}
                  </span>
                </div>

                {mediaMode === "different" && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-muted-foreground">
                      Per i social senza override viene usato il video principale (es. Instagram e Facebook con formati diversi).
                    </p>
                    {selectedAccounts.map(acc => {
                      const pm = PLATFORM_META[acc.platform] || { icon: "?", color: "bg-gray-500 text-white", label: acc.platform, limit: 2200 }
                      const m = platformMediaFiles[acc.platform] || {}
                      return (
                        <div key={acc.id} className="rounded-lg border p-3 space-y-2">
                          <Label className="text-[11px] flex items-center gap-1.5">
                            <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-bold ${pm.color}`}>{pm.icon}</span>
                            {pm.label}
                          </Label>
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="cursor-pointer">
                              <input type="file" accept="video/*" className="hidden"
                                onChange={e => e.target.files?.[0] && setPlatformMedia(acc.platform, "file", e.target.files[0])} />
                              <Button variant="outline" size="sm" asChild><span><Film className="h-3 w-3 mr-1" /> Video</span></Button>
                            </label>
                            <label className="cursor-pointer">
                              <input type="file" accept="image/*" className="hidden"
                                onChange={e => e.target.files?.[0] && setPlatformMedia(acc.platform, "coverFile", e.target.files[0])} />
                              <Button variant="outline" size="sm" asChild><span><ImageIcon className="h-3 w-3 mr-1" /> Cover</span></Button>
                            </label>
                            {(m.file || m.coverFile) && (
                              <button
                                type="button"
                                className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
                                onClick={() => setPlatformMediaFiles(prev => { const n = { ...prev }; delete n[acc.platform]; return n })}
                              >
                                <X className="h-3 w-3" /> Rimuovi override
                              </button>
                            )}
                          </div>
                          {(m.file || m.coverFile) && (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {m.file && <span className="truncate max-w-[160px]">Video: {m.file.name}</span>}
                              {m.coverFile && <span className="truncate max-w-[160px]">Cover: {m.coverFile.name}</span>}
                              <span className="text-[10px] text-primary">→ l&apos;anteprima usa questo media</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {missingMsg && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> {missingMsg}
              </p>
            )}
          </div>

          {/* RIGHT — sticky live preview */}
          <div className="hidden lg:flex flex-col min-h-0 border-l pl-6">
            <div className="shrink-0 mb-3">
              <Label className="text-xs font-semibold mb-2 block">Anteprima live</Label>
              {selectedAccounts.length > 0 ? (
                <div className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto">
                  {selectedAccounts.map(acc => {
                    const pm = PLATFORM_META[acc.platform]
                    const active = (previewAccount?.id === acc.id)
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setPreviewPlatform(acc.platform)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${active ? "bg-background shadow-sm" : "hover:bg-background/50 text-muted-foreground"}`}
                      >
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-bold ${pm?.color || "bg-gray-500 text-white"}`}>{pm?.icon}</span>
                        {pm?.label || acc.platform}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Seleziona un account per l&apos;anteprima</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto flex justify-center items-start pt-2 pb-6 bg-muted/30 rounded-xl px-3">
              {previewAccount ? (
                <div key={previewAccount.id} className="w-full max-w-full animate-in fade-in zoom-in-95 duration-300 flex justify-center">
                  <PlatformPreview
                    platform={previewAccount.platform}
                    account={previewAccount}
                    content={getContentFor(previewAccount.platform)}
                    hashtagStr={hashtagStr}
                    postType={postType}
                    filePreviews={
                      mediaMode === "different" && platformPreviews[previewAccount.platform]
                        ? [platformPreviews[previewAccount.platform]]
                        : filePreviews
                    }
                    files={files}
                    carouselSlide={carouselSlide}
                    setCarouselSlide={setCarouselSlide}
                    scheduleLabel={formatScheduleLabel(accountSchedules[previewAccount.id] || "", publishNow)}
                  />
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-16">
                  Seleziona Facebook o Instagram<br />per vedere l&apos;anteprima stile Meta
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
