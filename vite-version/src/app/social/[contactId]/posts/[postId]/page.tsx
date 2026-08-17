import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, Send, Clock, ArrowLeft, Trash2, CheckCircle, Copy } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const POST_TYPES = [
  { value: "POST", label: "Post" },
  { value: "STORY", label: "Story" },
  { value: "REEL", label: "Reel" },
  { value: "CAROUSEL", label: "Carousel" },
]

const PLATFORM_LIMITS: Record<string, number> = {
  INSTAGRAM: 2200,
  FACEBOOK: 63206,
  LINKEDIN: 3000,
  TIKTOK: 2200,
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Bozza", variant: "secondary" },
  PENDING_APPROVAL: { label: "In attesa", variant: "outline" },
  APPROVED: { label: "Approvato", variant: "default" },
  SCHEDULED: { label: "Programmato", variant: "default" },
  PUBLISHING: { label: "Pubblicando...", variant: "default" },
  PUBLISHED: { label: "Pubblicato", variant: "default" },
  FAILED: { label: "Fallito", variant: "destructive" },
  ARCHIVED: { label: "Archiviato", variant: "secondary" },
}

export default function PostDetail() {
  const { contactId, postId } = useParams()
  const navigate = useNavigate()
  const cid = parseInt(contactId!)
  const pid = parseInt(postId!)

  const [post, setPost] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Editable fields
  const [content, setContent] = useState("")
  const [platformContent, setPlatformContent] = useState<Record<string, string>>({})
  const [postType, setPostType] = useState("POST")
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([])
  const [hashtags, setHashtags] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")

  useEffect(() => {
    Promise.all([
      socialAPI.getPost(pid),
      socialAPI.getAccounts(cid),
    ])
      .then(([postRes, accRes]) => {
        const p = postRes.data
        setPost(p)
        setContent(p.content || "")
        setPlatformContent(p.platformContent || {})
        setPostType(p.postType || "POST")
        setSelectedAccounts(p.targets?.map((t: any) => t.socialAccountId) || [])
        setHashtags(p.hashtags?.map((h: any) => h.hashtag).join(" ") || "")
        setScheduledAt(p.scheduledAt ? format(new Date(p.scheduledAt), "yyyy-MM-dd'T'HH:mm") : "")
        setAccounts(accRes.data)
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [pid, cid])

  const isEditable = post && ["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(post.status)

  const toggleAccount = (id: number) => {
    setSelectedAccounts(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const handleUpdate = async () => {
    if (!content.trim()) return toast.error("Inserisci il contenuto del post")
    setSubmitting(true)
    try {
      const hashtagList = hashtags
        .split(/[\s,]+/)
        .filter(h => h.length > 0)
        .map(h => h.startsWith("#") ? h : `#${h}`)

      await socialAPI.updatePost(pid, {
        content,
        platformContent: Object.keys(platformContent).length ? platformContent : undefined,
        postType,
        targetAccountIds: selectedAccounts,
        hashtags: hashtagList.length ? hashtagList : undefined,
      })
      toast.success("Post aggiornato")
      navigate(`/social/${cid}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSchedule = async () => {
    if (!scheduledAt) return toast.error("Seleziona data e ora")
    try {
      await socialAPI.schedulePost(pid, scheduledAt)
      toast.success("Post programmato")
      navigate(`/social/${cid}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleApprove = async () => {
    try {
      await socialAPI.approvePost(pid)
      toast.success("Post approvato")
      setPost((p: any) => ({ ...p, status: "APPROVED" }))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handlePublish = async () => {
    try {
      await socialAPI.publishNow(pid)
      toast.success("Pubblicazione avviata")
      navigate(`/social/${cid}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDuplicate = async () => {
    try {
      const res = await socialAPI.duplicatePost(pid)
      toast.success("Post duplicato")
      navigate(`/social/${cid}/posts/${res.data.id}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Eliminare questo post?")) return
    try {
      await socialAPI.deletePost(pid)
      toast.success("Post eliminato")
      navigate(`/social/${cid}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <BaseLayout title="Dettaglio Post">
        <div className="px-4 lg:px-6 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </BaseLayout>
    )
  }

  if (!post) {
    return (
      <BaseLayout title="Post non trovato">
        <div className="px-4 lg:px-6">
          <p className="text-muted-foreground">Il post richiesto non esiste.</p>
        </div>
      </BaseLayout>
    )
  }

  const statusInfo = STATUS_LABELS[post.status] || { label: post.status, variant: "secondary" as const }
  const selectedPlatforms = [...new Set(accounts.filter(a => selectedAccounts.includes(a.id)).map(a => a.platform.toLowerCase()))]

  return (
    <BaseLayout title="Dettaglio Post">
      <div className="px-4 lg:px-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(`/social/${cid}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Torna
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {post.createdAt && (
            <span className="text-xs text-muted-foreground">
              Creato {format(new Date(post.createdAt), "dd MMM yyyy HH:mm", { locale: it })}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contenuto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="main">
                <TabsList>
                  <TabsTrigger value="main">Testo principale</TabsTrigger>
                  {selectedPlatforms.map(p => (
                    <TabsTrigger key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="main">
                  <Textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={6}
                    className="resize-y"
                    disabled={!isEditable}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{content.length} caratteri</p>
                </TabsContent>
                {selectedPlatforms.map(p => (
                  <TabsContent key={p} value={p}>
                    <Textarea
                      placeholder={`Override per ${p}`}
                      value={platformContent[p] || ""}
                      onChange={e => setPlatformContent(prev => ({ ...prev, [p]: e.target.value }))}
                      rows={6}
                      className="resize-y"
                      disabled={!isEditable}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {(platformContent[p] || content).length}/{PLATFORM_LIMITS[p.toUpperCase()] || "∞"}
                    </p>
                  </TabsContent>
                ))}
              </Tabs>

              <div>
                <Label>Hashtag</Label>
                <Input
                  value={hashtags}
                  onChange={e => setHashtags(e.target.value)}
                  disabled={!isEditable}
                />
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          {(post.mediaUrls as string[] || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Media</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {(post.mediaUrls as string[]).map((url: string, i: number) => (
                    <div key={i} className="relative aspect-square rounded-md overflow-hidden border">
                      {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <video src={url} className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Publish Logs */}
          {post.publishLogs?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Log Pubblicazione</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {post.publishLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-2 text-sm">
                      <Badge variant={log.action === "SUCCESS" ? "default" : log.action === "FAIL" ? "destructive" : "secondary"}>
                        {log.action}
                      </Badge>
                      <span className="text-muted-foreground">
                        {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: it })}
                      </span>
                      {log.message && <span className="truncate">{log.message}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={postType} onValueChange={setPostType} disabled={!isEditable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {accounts.map((acc: any) => (
                  <label key={acc.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedAccounts.includes(acc.id)}
                      onCheckedChange={() => isEditable && toggleAccount(acc.id)}
                      disabled={!isEditable}
                    />
                    <Badge variant="outline" className="text-xs">{acc.platform}</Badge>
                    <span className="text-sm">{acc.platformName}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {isEditable && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Programmazione</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                />
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              {isEditable && (
                <Button className="w-full" variant="outline" onClick={handleUpdate} disabled={submitting}>
                  <Save className="h-4 w-4 mr-2" /> Salva Modifiche
                </Button>
              )}
              {post.status === "PENDING_APPROVAL" && (
                <Button className="w-full" variant="secondary" onClick={handleApprove}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Approva
                </Button>
              )}
              {isEditable && scheduledAt && (
                <Button className="w-full" variant="secondary" onClick={handleSchedule} disabled={submitting}>
                  <Clock className="h-4 w-4 mr-2" /> Programma
                </Button>
              )}
              {isEditable && (
                <Button className="w-full" onClick={handlePublish} disabled={submitting}>
                  <Send className="h-4 w-4 mr-2" /> Pubblica Ora
                </Button>
              )}
              <Button className="w-full" variant="outline" onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" /> Duplica
              </Button>
              <Button className="w-full" variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Elimina
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </BaseLayout>
  )
}
