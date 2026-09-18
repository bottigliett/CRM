"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Trash2, Plus, Settings, Save, Eye, GripVertical, Sparkles, GitBranch, MoveRight } from "lucide-react"
import { formsAPI, FIELD_TYPES, type Form, type FormField, type FieldType } from "@/lib/forms-api"
import { toast } from "sonner"

const newField = (page: number, type: FieldType = 'text'): FormField => ({
  id: `f${Date.now()}${Math.floor(Math.random() * 1000)}`, type, label: '', placeholder: '', required: false, page,
  ...(type === 'select' || type === 'radio' ? { options: ['Opzione 1', 'Opzione 2'] } : {}),
})

export default function FormBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [editField, setEditField] = useState<FormField | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [aiDesc, setAiDesc] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const loadedRef = useRef(false)
  const dirtyRef = useRef(false)
  const saveTimer = useRef<any>(null)

  useEffect(() => {
    if (id) formsAPI.get(parseInt(id)).then(r => { setForm(r.data); loadedRef.current = true }).catch(e => toast.error(e.message))
  }, [id])

  // Auto-save (debounced) whenever the form changes after the initial load
  useEffect(() => {
    if (!form || !loadedRef.current) return
    dirtyRef.current = true
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await formsAPI.update(form.id, { name: form.name, description: form.description, schema: form.schema, slug: form.slug })
        dirtyRef.current = false
      } catch (e: any) {
        toast.error('Salvataggio automatico non riuscito')
      }
    }, 1200)
  }, [form])

  // Warn before leaving if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  if (!form) return <BaseLayout title="Form Builder"><div className="px-4 lg:px-6">Caricamento…</div></BaseLayout>

  const schema = form.schema

  const save = async (next: Form = form) => {
    try {
      setSaving(true)
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
      await formsAPI.update(form.id, { name: next.name, description: next.description, schema: next.schema, slug: next.slug })
      setForm(next)
      dirtyRef.current = false
      toast.success('Salvato')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  const goPreview = async () => {
    await save()
    navigate(`/forms/${form.id}/preview`)
  }

  const update = (patch: Partial<Form>) => setForm({ ...form, ...patch })
  const updateSchema = (patch: Partial<typeof schema>) => setForm({ ...form, schema: { ...schema, ...patch } })

  const addField = (type: FieldType) => updateSchema({ fields: [...schema.fields, newField(0, type)] })

  const removeField = (id: string) => {
    // also clear requiredIf pointing to removed field
    const fields = schema.fields.filter(f => f.id !== id).map(f => f.requiredIf?.fieldId === id ? { ...f, requiredIf: undefined } : f)
    updateSchema({ fields })
  }

  const moveFieldTo = (fromId: string, toId: string) => {
    if (!fromId || fromId === toId) return
    const arr = [...schema.fields]
    const from = arr.findIndex(f => f.id === fromId)
    const to = arr.findIndex(f => f.id === toId)
    if (from < 0 || to < 0) return
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    updateSchema({ fields: arr })
  }

  const saveField = (f: FormField) => {
    updateSchema({ fields: schema.fields.map(x => x.id === f.id ? f : x) })
    setEditField(null)
  }

  const addPage = () => updateSchema({ pages: [...schema.pages, { title: `Pagina ${schema.pages.length + 1}` }] })
  const renamePage = (i: number, title: string) => updateSchema({ pages: schema.pages.map((p, idx) => idx === i ? { ...p, title } : p) })

  const runAi = async () => {
    if (!aiDesc.trim()) return
    try {
      setAiLoading(true)
      const res = await formsAPI.aiGenerate(aiDesc)
      const fields: FormField[] = res.data.fields.map((f, i) => ({
        id: `ai${Date.now()}_${i}`,
        type: (FIELD_TYPES.find(t => t.value === f.type) ? f.type : 'text') as FieldType,
        label: f.label,
        placeholder: f.placeholder,
        required: !!f.required,
        options: f.options,
        page: 0,
      }))
      setForm({ ...form, name: res.data.name, description: res.data.description, schema: { ...schema, fields } })
      setShowAi(false)
      setAiDesc("")
      toast.success('Form generato con AI — rivedi i campi e salva')
    } catch (e: any) { toast.error(e.message) } finally { setAiLoading(false) }
  }

  const fieldLabel = (fid: string) => schema.fields.find(f => f.id === fid)?.label || '(campo)'

  return (
    <BaseLayout title={`Form Builder — ${form.name}`} description="Costruisci il form trascinando i campi">
      <div className="px-4 lg:px-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/forms')} className="cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-1" /> Form
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setShowAi(true)} className="cursor-pointer">
            <Sparkles className="h-4 w-4 mr-1" /> Genera con AI
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowMap(!showMap)} className="cursor-pointer">
            <GitBranch className="h-4 w-4 mr-1" /> Mappa logica
          </Button>
          <Button variant="outline" size="sm" onClick={goPreview} className="cursor-pointer">
            <Eye className="h-4 w-4 mr-1" /> Anteprima
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="cursor-pointer">
            <Settings className="h-4 w-4 mr-1" /> Impostazioni
          </Button>
          <Button size="sm" onClick={() => save()} disabled={saving} className="cursor-pointer">
            <Save className="h-4 w-4 mr-1" /> Salva
          </Button>
        </div>

        {/* Logic map */}
        {showMap && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" /> Mappa dei collegamenti</CardTitle></CardHeader>
            <CardContent>
              {schema.fields.filter(f => f.requiredIf).length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">Nessun collegamento. Imposta una "logica condizionale" su un campo per vederlo qui.</p>
              ) : (
                <div className="flex flex-wrap gap-2 items-center">
                  {schema.fields.filter(f => f.requiredIf).map(f => (
                    <div key={f.id} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm">
                      <span className="font-medium">{fieldLabel(f.requiredIf!.fieldId)}</span>
                      <MoveRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{f.label}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({f.requiredIf!.operator === 'filled' ? 'se compilato' : 'se vuoto'})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          {/* Palette */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Aggiungi campo</div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
              {FIELD_TYPES.map(ft => (
                <button key={ft.value} onClick={() => addField(ft.value)}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors text-left cursor-pointer">
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
                    {fields.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Trascina qui i campi dalla palette.</p>}
                    {fields.map(f => {
                      const typeLabel = FIELD_TYPES.find(t => t.value === f.type)?.label || f.type
                      return (
                        <div key={f.id}
                          draggable
                          onDragStart={() => setDraggedId(f.id)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => { moveFieldTo(draggedId!, f.id); setDraggedId(null) }}
                          onDragEnd={() => setDraggedId(null)}
                          className={`flex items-center gap-2 rounded-md border p-3 group cursor-grab active:cursor-grabbing ${draggedId === f.id ? 'opacity-40' : ''}`}>
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <Input
                              value={f.label}
                              onChange={e => updateSchema({ fields: schema.fields.map(x => x.id === f.id ? { ...x, label: e.target.value } : x) })}
                              placeholder="Testo campo"
                              className="h-8 text-sm font-medium"
                            />
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                              <span className="rounded bg-muted px-1.5 py-0.5">{typeLabel}</span>
                              {f.required && <span className="rounded bg-muted px-1.5 py-0.5">obbligatorio</span>}
                              {f.requiredIf && <span className="rounded bg-muted px-1.5 py-0.5">logica</span>}
                              {f.helpText && <span className="rounded bg-muted px-1.5 py-0.5">aiuto</span>}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => setEditField(f)} title="Opzioni avanzate"><Settings className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-destructive" onClick={() => removeField(f.id)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
              <div className="space-y-1"><Label>Sottotitolo (sotto il titolo)</Label>
                <Input value={editField.subtitle || ''} onChange={e => setEditField({ ...editField, subtitle: e.target.value })} placeholder="Es. breve descrizione" />
              </div>
              <div className="space-y-1"><Label>Testo dentro input (placeholder)</Label>
                <Input value={editField.placeholder || ''} onChange={e => setEditField({ ...editField, placeholder: e.target.value })} />
              </div>
              <div className="space-y-1"><Label>Testo di aiuto (sotto il campo)</Label>
                <Input value={editField.helpText || ''} onChange={e => setEditField({ ...editField, helpText: e.target.value })} placeholder="Es. Inserisci il link completo dell'annuncio" />
              </div>
              <div className="space-y-1"><Label>Hover (tooltip al passaggio)</Label>
                <Input value={editField.hover || ''} onChange={e => setEditField({ ...editField, hover: e.target.value })} placeholder="Testo che appare al passaggio del mouse" />
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

              {/* Conditional logic */}
              <div className="pt-2 border-t space-y-2">
                <Label>Logica condizionale</Label>
                <Select
                  value={editField.requiredIf ? (editField.requiredIf.operator === 'filled' ? 'filled' : 'empty') : 'none'}
                  onValueChange={v => setEditField({ ...editField, requiredIf: v === 'none' ? undefined : { fieldId: editField.requiredIf?.fieldId || '', operator: v as 'filled' | 'empty' } })}
                >
                  <SelectTrigger><SelectValue placeholder="Nessuna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sempre (nessuna logica)</SelectItem>
                    <SelectItem value="filled">Obbligatorio se un altro campo è compilato</SelectItem>
                    <SelectItem value="empty">Obbligatorio se un altro campo è vuoto</SelectItem>
                  </SelectContent>
                </Select>
                {editField.requiredIf && (
                  <Select
                    value={editField.requiredIf.fieldId}
                    onValueChange={v => setEditField({ ...editField, requiredIf: { ...editField.requiredIf!, fieldId: v } })}
                  >
                    <SelectTrigger><SelectValue placeholder="Scegli il campo collegato…" /></SelectTrigger>
                    <SelectContent>
                      {schema.fields.filter(x => x.id !== editField.id).map(x => <SelectItem key={x.id} value={x.id}>{x.label || '(senza titolo)'}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Esempio: "Confermi che l'immobile è in ordine?" diventa obbligatorio solo se il campo "link annuncio" è compilato.
                </p>
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
            <div className="space-y-1"><Label>URL pubblico</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap">/form/</span>
                <Input value={form.slug} onChange={e => update({ slug: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between"><Label>Riepilogo prima dell'invio</Label>
              <Switch checked={schema.settings.reviewBeforeSubmit} onCheckedChange={c => updateSchema({ settings: { ...schema.settings, reviewBeforeSubmit: c } })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Notifica ai ruoli</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => updateSchema({ settings: { ...schema.settings, notifyRoles: ['ADMIN', 'SUPER_ADMIN', 'DEVELOPER'] } })} className="cursor-pointer h-7 text-xs">Tutti</Button>
              </div>
              {[
                { value: 'ADMIN', label: 'Admin' },
                { value: 'SUPER_ADMIN', label: 'Super Admin' },
                { value: 'DEVELOPER', label: 'Developer' },
              ].map(r => {
                const roles = schema.settings.notifyRoles || ['SUPER_ADMIN', 'DEVELOPER']
                const checked = roles.includes(r.value)
                return (
                  <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={c => {
                        const next = c ? [...new Set([...roles, r.value])] : roles.filter(x => x !== r.value)
                        updateSchema({ settings: { ...schema.settings, notifyRoles: next.length ? next : ['SUPER_ADMIN', 'DEVELOPER'] } })
                      }}
                    />
                    {r.label}
                  </label>
                )
              })}
              <p className="text-xs text-muted-foreground">Questi ruoli riceveranno email e notifica per ogni nuovo invio.</p>
            </div>
          </div>
          <DialogFooter><Button onClick={() => { setShowSettings(false); save() }} disabled={saving}>Salva</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI dialog */}
      <Dialog open={showAi} onOpenChange={setShowAi}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Genera form con AI</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Textarea value={aiDesc} onChange={e => setAiDesc(e.target.value)} rows={5}
              placeholder="Es. Form pre-shooting: chiedi chi sarà presente al video, quali location sono disponibili, le idee del cliente, link dell'annuncio immobiliare…" />
            <p className="text-xs text-muted-foreground">Descrivi il form e l'AI genererà i campi. Potrai poi modificarli.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAi(false)}>Annulla</Button>
            <Button onClick={runAi} disabled={aiLoading || !aiDesc.trim()}>{aiLoading ? 'Generazione…' : 'Genera'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
