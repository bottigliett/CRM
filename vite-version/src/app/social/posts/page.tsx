import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Eye, Copy, Trash2, CheckCircle, Send, FileText, Image as ImageIcon } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"
import { format } from "date-fns"
import { it } from "date-fns/locale"

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

const PLATFORM_DOT: Record<string, string> = {
  INSTAGRAM: "bg-pink-500",
  FACEBOOK: "bg-blue-600",
  LINKEDIN: "bg-sky-600",
  TIKTOK: "bg-gray-800",
}

export default function GeneralSocialPosts() {
  const navigate = useNavigate()

  const [posts, setPosts] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    socialAPI.getDashboard()
      .then(res => setClients(res.data.clients || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    socialAPI.getPosts({
      contactId: filterClient !== "all" ? parseInt(filterClient) : undefined,
      status: filterStatus !== "all" ? filterStatus : undefined,
      page,
      limit,
    })
      .then(res => {
        setPosts(res.data.posts || res.data || [])
        setTotal(res.data.total || 0)
      })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [filterClient, filterStatus, page])

  const handleDelete = async (id: number) => {
    if (!confirm("Eliminare questo post?")) return
    try {
      await socialAPI.deletePost(id)
      toast.success("Post eliminato")
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDuplicate = async (id: number) => {
    try {
      await socialAPI.duplicatePost(id)
      toast.success("Post duplicato")
      setPage(1)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await socialAPI.approvePost(id)
      toast.success("Post approvato")
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "APPROVED" } : p))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handlePublishNow = async (id: number) => {
    try {
      await socialAPI.publishNow(id)
      toast.success("Pubblicazione avviata")
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "PUBLISHING" } : p))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <BaseLayout title="Tutti i Post" description="Gestisci i contenuti social di tutti i clienti">
      <div className="px-4 lg:px-6 space-y-6 animate-in fade-in duration-300">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Select value={filterClient} onValueChange={v => { setFilterClient(v); setPage(1) }}>
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
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tutti gli stati" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">{total} post totali</span>
        </div>

        {/* Posts Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : posts.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contenuto</TableHead>
                      <TableHead className="hidden md:table-cell">Piattaforme</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((p: any) => {
                      const platforms = p.targets?.map((t: any) => t.socialAccount?.platform).filter(Boolean) || []
                      const statusInfo = STATUS_LABELS[p.status] || { label: p.status, variant: "secondary" as const }
                      const postDate = p.scheduledAt || p.publishedAt || p.createdAt

                      return (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/social/${p.contactId}/posts/${p.id}`)}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                                {(p.contact?.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-sm">{p.contact?.name || `#${p.contactId}`}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="flex items-center gap-2">
                              {p.coverImageUrl || (p.mediaUrls as string[] | null)?.[0] ? (
                                <img src={p.coverImageUrl || (p.mediaUrls as string[])[0]} alt="" className="w-10 h-10 rounded object-cover shrink-0 border" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center shrink-0">
                                  <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                                </div>
                              )}
                              <span className="text-sm truncate">{p.content}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex gap-1">
                              {[...new Set(platforms)].map((pl: any) => (
                                <span key={pl} className={`inline-block w-2.5 h-2.5 rounded-full ${PLATFORM_DOT[pl] || "bg-gray-400"}`} title={pl} />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                            {postDate ? format(new Date(postDate), "dd MMM HH:mm", { locale: it }) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                              {p.status === "PENDING_APPROVAL" && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleApprove(p.id)} title="Approva">
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                              )}
                              {(p.status === "APPROVED" || p.status === "DRAFT") && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handlePublishNow(p.id)} title="Pubblica ora">
                                  <Send className="h-3.5 w-3.5 text-blue-600" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDuplicate(p.id)} title="Duplica">
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(p.id)} title="Elimina">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-medium">Nessun post trovato</p>
                <p className="text-sm text-muted-foreground mt-1">Prova a modificare i filtri</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Precedente
            </Button>
            <span className="text-sm text-muted-foreground">
              Pagina {page} di {Math.ceil(total / limit)}
            </span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>
              Successiva
            </Button>
          </div>
        )}
      </div>
    </BaseLayout>
  )
}
