import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, X, Clock, Send } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function portalRequest(url: string, token: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE_URL}${url}${url.includes('?') ? '&' : '?'}token=${token}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  const json = await res.json()
  if (!res.ok || !json.success) throw new Error(json.message || 'Errore')
  return json
}

export default function ClientSocialPortal() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") || ""

  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState("")

  const fetchPosts = () => {
    if (!token) { setError("Link non valido"); setLoading(false); return }
    setLoading(true)
    portalRequest('/social/client-portal/posts', token)
      .then(r => setPosts(r.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPosts() }, [token])

  const handleApprove = async (id: number) => {
    try {
      await portalRequest(`/social/client-portal/posts/${id}/approve`, token, { method: 'POST' })
      toast.success("Post approvato!")
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (err: any) { toast.error(err.message) }
  }

  const handleReject = async (id: number) => {
    try {
      await portalRequest(`/social/client-portal/posts/${id}/reject`, token, {
        method: 'POST',
        body: JSON.stringify({ note: rejectNote }),
      })
      toast.success("Post rifiutato")
      setPosts(prev => prev.filter(p => p.id !== id))
      setRejectingId(null)
      setRejectNote("")
    } catch (err: any) { toast.error(err.message) }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <X className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Il link potrebbe essere scaduto o non valido.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold">Approvazione Post</h1>
          <p className="text-sm text-muted-foreground">Rivedi e approva i contenuti in attesa</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="font-medium">Tutto approvato!</p>
              <p className="text-sm text-muted-foreground mt-1">Non ci sono post in attesa di approvazione.</p>
            </CardContent>
          </Card>
        ) : (
          posts.map(post => (
            <Card key={post.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{post.postType}</Badge>
                    {post.targets?.map((t: any) => (
                      <Badge key={t.id} variant="secondary" className="text-xs">{t.socialAccount?.platform}</Badge>
                    ))}
                  </div>
                  {post.scheduledAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(post.scheduledAt), "dd MMM HH:mm", { locale: it })}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>

                {post.mediaUrls && (post.mediaUrls as string[]).length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {(post.mediaUrls as string[]).map((url, i) => (
                      <img key={i} src={url} alt="" className="h-24 w-24 rounded-md object-cover shrink-0" />
                    ))}
                  </div>
                )}

                {post.hashtags?.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {post.hashtags.map((h: any) => h.hashtag).join(" ")}
                  </p>
                )}

                {rejectingId === post.id ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Motivo del rifiuto (opzionale)..."
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => handleReject(post.id)}>Conferma Rifiuto</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectNote("") }}>Annulla</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(post.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Approva
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectingId(post.id)}>
                      <X className="h-4 w-4 mr-1" /> Rifiuta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
