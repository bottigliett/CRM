"use client"

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CalendarDays, Clapperboard, Loader2, Sparkles, Plus, Check, HelpCircle } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { contactsAPI } from "@/lib/contacts-api"
import { toast } from "sonner"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { ClarifyingQuestionsDialog } from "../components/clarifying-questions-dialog"

interface PlanItem {
  date?: string
  content: string
  caption: string
  hashtags: string[]
  postType: string
  note?: string
}

const IDEA_TYPES_EMOJI: Record<string, string> = {
  POST: "📷 Post",
  STORY: "⏱️ Storia",
  REEL: "🎬 Reel",
  CAROUSEL: "🖼️ Carosello",
}

export default function SocialPlanPage() {
  const { contactId } = useParams()
  const navigate = useNavigate()
  const cid = parseInt(contactId!)
  const [contact, setContact] = useState<any>(null)
  const [mode, setMode] = useState<"calendar" | "shoot">("calendar")
  const [count, setCount] = useState(4)
  const [showBriefing, setShowBriefing] = useState(false)
  const [items, setItems] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState<Set<number>>(new Set())

  useEffect(() => {
    contactsAPI.getContactById(cid).then(r => setContact(r.data)).catch(() => {})
  }, [cid])

  const handleGenerate = async (answers?: string) => {
    setLoading(true)
    setItems([])
    try {
      const res = await socialAPI.aiPostGroup(cid, mode, answers, count)
      setItems(res.data.items || [])
      if (!res.data.items?.length) toast.error("Nessun contenuto generato. Riprova.")
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  const handleCreateAsIdea = async (item: PlanItem, index: number) => {
    setCreating(prev => { const n = new Set(prev); n.add(index); return n })
    try {
      await socialAPI.createPost({
        contactId: cid,
        content: item.content,
        postType: item.postType,
        stage: "IDEA",
        ideaCaption: `${item.caption} ${item.hashtags?.join(" ") || ""}`.trim(),
        ideaStatus: "Idea",
        ideaCategory: "[]",
        scheduledAt: item.date ? `${item.date}T12:00:00` : undefined,
      })
      toast.success(`"${item.content}" creata come idea`)
    } catch (err: any) { toast.error(err.message) }
    finally {
      setCreating(prev => { const n = new Set(prev); n.delete(index); return n })
    }
  }

  return (
    <BaseLayout title={contact?.name || "Piano contenuti"} description="Calendario mensile o piano video">
      <div className="px-4 lg:px-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 -ml-2 text-muted-foreground" onClick={() => navigate(`/social/${cid}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Piano contenuti {contact?.name ? `— ${contact.name}` : ""}</h1>
            <p className="text-sm text-muted-foreground">Ipotizza un calendario mensile o un piano video per lo shooting, in base al contesto del cliente</p>
          </div>
        </div>

        {/* Mode + count selector */}
        <Card>
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setMode("calendar"); setItems([]) }}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${mode === "calendar" ? "border-primary bg-primary/5" : "border-input hover:bg-muted"}`}
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span className="font-semibold">Calendario mensile</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Distribuisce i post sulle prossime settimane</p>
              </button>
              <button
                type="button"
                onClick={() => { setMode("shoot"); setItems([]) }}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${mode === "shoot" ? "border-primary bg-primary/5" : "border-input hover:bg-muted"}`}
              >
                <div className="flex items-center gap-2">
                  <Clapperboard className="h-4 w-4" />
                  <span className="font-semibold">Piano video (shooting)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Concept, location e persone per ogni video</p>
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Quantità:</span>
                <div className="flex gap-1">
                  {[2, 4, 6, 8].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${count === n ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="shrink-0" onClick={() => setShowBriefing(true)}>
                <Sparkles className="h-4 w-4 mr-1" /> Genera piano
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Mismo AI sta generando il piano...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && items.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{items.length} contenuti proposti</h2>
            {items.map((item, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.date && (
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {format(new Date(item.date), "EEEE dd MMM", { locale: it })}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">{IDEA_TYPES_EMOJI[item.postType] || item.postType}</Badge>
                      </div>
                      <p className="text-sm font-semibold">{item.content}</p>
                      {item.note && (
                        <p className="text-xs text-muted-foreground"><Clapperboard className="h-3 w-3 inline mr-1" />{item.note}</p>
                      )}
                      {item.caption && <p className="text-xs text-muted-foreground line-clamp-3">{item.caption}</p>}
                      {item.hashtags?.length > 0 && (
                        <p className="text-xs text-primary">{item.hashtags.join(" ")}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCreateAsIdea(item, i)}
                      disabled={creating.has(i)}
                      className="shrink-0"
                    >
                      {creating.has(i) ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                      Idea
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !items.length && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Scegli modalità e quantità, poi clicca "Genera piano". L'AI ti farà qualche domanda per capire meglio.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <ClarifyingQuestionsDialog
        open={showBriefing}
        onOpenChange={setShowBriefing}
        contactId={cid}
        mode={mode}
        title={mode === "calendar" ? "Piano calendario: qualche domanda" : "Piano video: qualche domanda"}
        generateLabel="Genera piano"
        onGenerate={async answers => { await handleGenerate(answers) }}
      />
    </BaseLayout>
  )
}
