"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ClipboardList, Plus, MoreHorizontal, Trash2, Pencil, Send, Eye, Copy, Inbox } from "lucide-react"
import { formsAPI, type Form } from "@/lib/forms-api"
import { toast } from "sonner"

export default function FormsPage() {
  const navigate = useNavigate()
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const load = async () => {
    try {
      setLoading(true)
      const res = await formsAPI.list()
      setForms(res.data)
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      const res = await formsAPI.create({ name, description, schema: { fields: [], pages: [{ title: "Pagina 1" }], settings: { reviewBeforeSubmit: false, emailRecipients: [] } } })
      setCreateOpen(false); setName(""); setDescription("")
      navigate(`/forms/builder/${res.data.id}`)
    } catch (e: any) { toast.error(e.message) }
  }

  const handlePublish = async (form: Form) => {
    try {
      await formsAPI.update(form.id, { status: form.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' })
      toast.success(form.status === 'PUBLISHED' ? 'Form messo in bozza' : 'Form pubblicato')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const handleDelete = async (form: Form) => {
    if (!confirm(`Eliminare il form "${form.name}"?`)) return
    try {
      await formsAPI.remove(form.id)
      toast.success('Form eliminato')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/forms/fill/${slug}`)
    toast.success('Link pubblico copiato')
  }

  return (
    <BaseLayout title="Form" description="Crea e gestisci i form personalizzati">
      <div className="px-4 lg:px-6 space-y-4">
        <div className="flex items-center justify-between">
          <Button onClick={() => setCreateOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" /> Nuovo Form
          </Button>
          <Button variant="outline" onClick={() => navigate('/forms/submissions')} className="cursor-pointer">
            <Inbox className="h-4 w-4 mr-2" /> Invii
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground py-12 text-center">Caricamento…</p>
        ) : forms.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3" />
            <p>Nessun form. Creane uno per iniziare.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {forms.map(f => (
              <Card key={f.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{f.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{f.description || f.slug}</CardDescription>
                    </div>
                    <Badge variant={f.status === 'PUBLISHED' ? 'default' : 'secondary'}>{f.status === 'PUBLISHED' ? 'Pubblicato' : 'Bozza'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{f._count?.submissions ?? 0} invii</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => navigate(`/forms/builder/${f.id}`)} className="cursor-pointer">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Modifica
                    </Button>
                    {f.status === 'PUBLISHED' && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/forms/fill/${f.slug}`)} className="cursor-pointer">
                        <Eye className="h-3.5 w-3.5 mr-1" /> Anteprima
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copyUrl(f.slug)}><Copy className="mr-2 h-4 w-4" /> Copia link</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/forms/${f.id}/submissions`)}><Inbox className="mr-2 h-4 w-4" /> Vedi invii</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePublish(f)}><Send className="mr-2 h-4 w-4" /> {f.status === 'PUBLISHED' ? 'Metti in bozza' : 'Pubblica'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(f)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Elimina</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo Form</DialogTitle>
            <DialogDescription>Inserisci nome e descrizione del form.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Es. Form pre-shooting" />
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
