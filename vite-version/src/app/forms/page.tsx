"use client"

import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ClipboardList, Plus, MoreHorizontal, Trash2, Pencil, Send, Eye, Copy, RotateCcw, Ban, CheckCircle2 } from "lucide-react"
import { formsAPI, type Form } from "@/lib/forms-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"

export default function FormsPage() {
  const navigate = useNavigate()
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [nameSearch, setNameSearch] = useState("")
  const [slugSearch, setSlugSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")

  const load = async () => {
    try { setLoading(true); const res = await formsAPI.list(); setForms(res.data) } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let f = forms
    if (statusFilter !== 'all') f = f.filter(x => x.status === statusFilter)
    if (nameSearch) { const q = nameSearch.toLowerCase(); f = f.filter(x => x.name.toLowerCase().includes(q)) }
    if (slugSearch) { const q = slugSearch.toLowerCase(); f = f.filter(x => x.slug.toLowerCase().includes(q)) }
    return f
  }, [forms, nameSearch, slugSearch, statusFilter])

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      const res = await formsAPI.create({ name, slug: slug.trim() || undefined, description, schema: { fields: [], pages: [{ title: "Pagina 1" }], settings: { reviewBeforeSubmit: false, emailRecipients: [] } } })
      setCreateOpen(false); setName(""); setSlug(""); setDescription("")
      navigate(`/forms/builder/${res.data.id}`)
    } catch (e: any) { toast.error(e.message) }
  }

  const setStatus = async (form: Form, status: 'DRAFT' | 'PUBLISHED' | 'DISABLED') => {
    try { await formsAPI.update(form.id, { status }); toast.success('Stato aggiornato'); load() } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async (form: Form) => {
    if (!confirm(`Eliminare il form "${form.name}"?`)) return
    try { await formsAPI.remove(form.id); toast.success('Form eliminato'); load() } catch (e: any) { toast.error(e.message) }
  }

  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/form/${slug}`)
    toast.success('Link pubblico copiato')
  }

  const statusBadge = (s: string) => {
    if (s === 'PUBLISHED') return <Badge>Pubblicato</Badge>
    if (s === 'DISABLED') return <Badge variant="outline" className="text-amber-600 border-amber-300">Disabilitato</Badge>
    if (s === 'ARCHIVED') return <Badge variant="secondary">Archiviato</Badge>
    return <Badge variant="secondary">Bozza</Badge>
  }

  return (
    <BaseLayout title="Form" description="Crea e gestisci i form personalizzati">
      <div className="px-4 lg:px-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)} className="cursor-pointer"><Plus className="h-4 w-4 mr-2" /> Nuovo Form</Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground py-12 text-center">Caricamento…</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3" />
            <p>Nessun form trovato.</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>URL pubblico</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Invii</TableHead>
                    <TableHead>Aggiornato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="p-1">
                      <Input className="h-8 text-xs" placeholder="Nome…" value={nameSearch} onChange={e => setNameSearch(e.target.value)} />
                    </TableHead>
                    <TableHead className="p-1">
                      <Input className="h-8 text-xs" placeholder="URL…" value={slugSearch} onChange={e => setSlugSearch(e.target.value)} />
                    </TableHead>
                    <TableHead className="p-1">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stato" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti</SelectItem>
                          <SelectItem value="PUBLISHED">Pubblicati</SelectItem>
                          <SelectItem value="DISABLED">Disabilitati</SelectItem>
                          <SelectItem value="DRAFT">Bozze</SelectItem>
                          <SelectItem value="ARCHIVED">Archiviati</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="p-1"></TableHead>
                    <TableHead className="p-1"></TableHead>
                    <TableHead className="p-1 text-right">
                      {(nameSearch || slugSearch || statusFilter !== 'all') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setNameSearch(''); setSlugSearch(''); setStatusFilter('all') }} title="Reset filtri">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(f => (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => navigate(`/forms/${f.id}`)}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">/form/{f.slug}</TableCell>
                      <TableCell>{statusBadge(f.status)}</TableCell>
                      <TableCell className="text-right">{f._count?.submissions ?? 0}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{format(new Date(f.updatedAt), "dd MMM yyyy", { locale: it })}</TableCell>
                      <TableCell className="text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/forms/${f.id}`)}><Eye className="mr-2 h-4 w-4" /> Gestisci</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/forms/builder/${f.id}`)}><Pencil className="mr-2 h-4 w-4" /> Costruzione</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyUrl(f.slug)}><Copy className="mr-2 h-4 w-4" /> Copia link</DropdownMenuItem>
                            {f.status === 'DRAFT' && <DropdownMenuItem onClick={() => setStatus(f, 'PUBLISHED')}><Send className="mr-2 h-4 w-4" /> Pubblica</DropdownMenuItem>}
                            {f.status === 'PUBLISHED' && <DropdownMenuItem onClick={() => setStatus(f, 'DISABLED')}><Ban className="mr-2 h-4 w-4" /> Disabilita</DropdownMenuItem>}
                            {f.status === 'DISABLED' && <DropdownMenuItem onClick={() => setStatus(f, 'PUBLISHED')}><CheckCircle2 className="mr-2 h-4 w-4" /> Riabilita</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => handleDelete(f)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Elimina</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo Form</DialogTitle>
            <DialogDescription>Nome, URL pubblico e descrizione.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Es. Form pre-shooting" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">URL (sottodominio)</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap">/form/</span>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="nome-form" />
              </div>
              <p className="text-xs text-muted-foreground">Se lo lasci vuoto, viene generato dal nome. Es: studiomismo.com/form/{slug.trim() || 'nome-form'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descrizione</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Opzionale" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>Crea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
