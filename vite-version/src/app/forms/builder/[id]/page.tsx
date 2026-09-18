"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, Settings, Save, Eye, GripVertical } from "lucide-react"
import { formsAPI, FIELD_TYPES, type Form, type FormField, type FieldType } from "@/lib/forms-api"
import { toast } from "sonner"

const emptyField = (page: number): FormField => ({ id: `f${Date.now()}${Math.floor(Math.random() * 1000)}`, type: 'text', label: '', placeholder: '', required: false, page })

export default function FormBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [editField, setEditField] = useState<FormField | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (id) formsAPI.get(parseInt(id)).then(r => setForm(r.data)).catch(e => toast.error(e.message))
  }, [id])

  if (!form) return <BaseLayout title="Form Builder"><div className="px-4 lg:px-6">Caricamento…</div></BaseLayout>

  const schema = form.schema

  const save = async (next: Form = form) => {
    try {
      setSaving(true)
      await formsAPI.update(form.id, { name: next.name, description: next.description, schema: next.schema })
      setForm(next)
      toast.success('Salvato')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const update = (patch: Partial<Form>) => setForm({ ...form, ...patch })
  const updateSchema = (patch: Partial<typeof schema>) => {
    const next = { ...form, schema: { ...schema, ...patch } }
    setForm(next)
  }

  const addField = (type: FieldType) => {
    const f = emptyField(0)
    f.type = type
    if (type === 'select' || type === 'radio') f.options = ['Opzione 1', 'Opzione 2']
    updateSchema({ fields: [...schema.fields, f] })
  }

  const removeField = (id: string) => updateSchema({ fields: schema.fields.filter(f => f.id !== id) })

  const moveField = (id: string, dir: -1 | 1) => {
    const arr = [...schema.fields]
    const i = arr.findIndex(f => f.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    updateSchema({ fields: arr })
  }

  const saveField = (f: FormField) => {
    const arr = schema.fields.map(x => x.id === f.id ? f : x)
    updateSchema({ fields: arr })
    setEditField(null)
  }

  const addPage = () => updateSchema({ pages: [...schema.pages, { title: `Pagina ${schema.pages.length + 1}` }] })
  const renamePage = (i: number, title: string) => {
    const pages = schema.pages.map((p, idx) => idx === i ? { ...p, title } : p)
    updateSchema({ pages })
  }

  return (
    <BaseLayout title={`Form Builder — ${form.name}`} description="Trascina e configura i campi del form">
      <div className="px-4 lg:px-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/forms')} className="cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-1" /> Form
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => navigate(`/forms/fill/${form.slug}`)} className="cursor-pointer">
            <Eye className="h-4 w-4 mr-1" /> Anteprima
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="cursor-pointer">
            <Settings className="h-4 w-4 mr-1" /> Impostazioni
          </Button>
          <Button size="sm" onClick={() => save()} disabled={saving} className="cursor-pointer">
            <Save className="h-4 w-4 mr-1" /> Salva
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          {/* Palette */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Aggiungi campo</div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
              {FIELD_TYPES.map(ft => (
                <button key={ft.value} onClick={() => addField(ft.value)}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors text-left">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" /> {ft.label}
                </button>
              ))}
            </div>
            <div className="pt-3 border-t">
              <Button variant="outline" size="sm" onClick={addPage} className="w-full cursor-pointer">
                <Plus className="h-4 w-4 mr-1" /> Pagina
              </Button>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {schema.pages.map((page, pi) => {
              const fields = schema.fields.filter(f => f.page === pi)
              return (
                <Card key={pi}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <input value={page.title} onChange={e => renamePage(pi, e.target.value)}
                        className="flex-1 bg-transparent border-b border-transparent focus:border-muted-foreground outline-none text-sm font-medium" />
                      <span className="text-xs text-muted-foreground">{fields.length} campi</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {fields.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nessun campo in questa pagina. Aggiungine uno dalla palette.</p>}
                    {fields.map(f => {
                      const typeLabel = FIELD_TYPES.find(t => t.value === f.type)?.label || f.type
                      return (
                        <div key={f.id} className="flex items-center gap-2 rounded-md border p-3 group">
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          <button onClick={() => setEditField(f)} className="flex-1 text-left min-w-0">
                            <div className="font-medium text-sm truncate">{f.label || '(senza titolo)'}</div>
                            <div className="text-xs text-muted-foreground">{typeLabel}{f.required ? ' · obbligatorio' : ''}</div>
                          </button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => moveField(f.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => moveField(f.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-destructive" onClick={() => removeField(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* Edit field dialog */}
      <Dialog open={!!editField} onOpenChange={o => !o && setEditField(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Configura campo</DialogTitle></DialogHeader>
          {editField && (
            <div className="space-y-3 py-2">
              <div className="space-y-1"><Label>Tipo</Label>
                <Select value={editField.type} onValueChange={v => setEditField({ ...editField, type: v as FieldType, ...(v === 'select' || v === 'radio' ? { options: editField.options || ['Opzione 1'] } : {}) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Testo campo</Label>
                <Input value={editField.label} onChange={e => setEditField({ ...editField, label: e.target.value })} />
              </div>
              <div className="space-y-1"><Label>Testo dentro input (placeholder)</Label>
                <Input value={editField.placeholder || ''} onChange={e => setEditField({ ...editField, placeholder: e.target.value })} />
              </div>
              {(editField.type === 'select' || editField.type === 'radio') && (
                <div className="space-y-1"><Label>Opzioni (una per riga)</Label>
                  <textarea value={(editField.options || []).join('\n')} onChange={e => setEditField({ ...editField, options: e.target.value.split('\n') })}
                    className="w-full rounded-md border p-2 text-sm min-h-[80px]" />
                </div>
              )}
              <div className="space-y-1"><Label>Pagina</Label>
                <Select value={String(editField.page)} onValueChange={v => setEditField({ ...editField, page: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{schema.pages.map((p, i) => <SelectItem key={i} value={String(i)}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between"><Label>Obbligatorio</Label>
                <Switch checked={editField.required} onCheckedChange={c => setEditField({ ...editField, required: c })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditField(null)}>Annulla</Button>
            <Button onClick={() => saveField(editField!)}>Applica</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Impostazioni form</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Nome form</Label>
              <Input value={form.name} onChange={e => update({ name: e.target.value })} />
            </div>
            <div className="flex items-center justify-between"><Label>Riepilogo prima dell'invio</Label>
              <Switch checked={schema.settings.reviewBeforeSubmit} onCheckedChange={c => updateSchema({ settings: { ...schema.settings, reviewBeforeSubmit: c } })} />
            </div>
            <div className="space-y-1"><Label>Email destinatari extra (una per riga)</Label>
              <textarea value={(schema.settings.emailRecipients || []).join('\n')} onChange={e => updateSchema({ settings: { ...schema.settings, emailRecipients: e.target.value.split('\n').filter(Boolean) } })}
                className="w-full rounded-md border p-2 text-sm min-h-[80px]" />
              <p className="text-xs text-muted-foreground">Le email vanno sempre a SUPER_ADMIN e DEVELOPER. Qui puoi aggiungere altri destinatari.</p>
            </div>
          </div>
          <DialogFooter><Button onClick={() => { setShowSettings(false); save() }} disabled={saving}>Salva</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
