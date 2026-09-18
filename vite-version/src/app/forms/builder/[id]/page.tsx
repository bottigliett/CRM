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
import { ArrowLeft, Trash2, Plus, Settings, Save, Eye, GripVertical, Sparkles, GitBranch, Link2, Pencil } from "lucide-react"
import { formsAPI, FIELD_TYPES, type Form, type FormField, type FieldType } from "@/lib/forms-api"
import { FormFillView } from "@/app/forms/fill/components/form-fill-view"
import { toast } from "sonner"

const newField = (page: number, type: FieldType = 'text'): FormField => ({
  id: `f${Date.now()}${Math.floor(Math.random() * 1000)}`, type, label: '', placeholder: '', required: false, page,
  ...(type === 'select' || type === 'radio' ? { options: ['Opzione 1', 'Opzione 2'] } : {}),
})

function LogicMap({
  fields,
  connections,
  onConnect,
  onRemove,
  onAddFieldAt,
  onMoveField,
  onEditField,
  fieldLabel,
}: {
  fields: FormField[]
  connections: any[]
  onConnect: (sourceId: string, targetId: string) => void
  onRemove: (targetId: string) => void
  onAddFieldAt: (type: string, x: number, y: number) => void
  onMoveField: (id: string, x: number, y: number) => void
  onEditField: (fieldId: string) => void
  fieldLabel: (fieldId: string) => string
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const NODE_W = 190
  const NODE_H = 64

  const pos = (f: any, i: number) => ({
    x: f.x ?? 40 + (i % 4) * (NODE_W + 60),
    y: f.y ?? 40 + Math.floor(i / 4) * (NODE_H + 60),
  })

  const canvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const addType = e.dataTransfer.getData('application/x-add-field')
    const move = e.dataTransfer.getData('application/x-move-node')
    if (addType) onAddFieldAt(addType, Math.max(0, x - NODE_W / 2), Math.max(0, y - NODE_H / 2))
    else if (move) {
      try { const { id, ox, oy } = JSON.parse(move); onMoveField(id, Math.max(0, x - ox), Math.max(0, y - oy)) } catch {}
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <style>{`@keyframes dashmove { to { stroke-dashoffset: -24; } } .logic-cable { stroke-dasharray: 8 6; animation: dashmove 1s linear infinite; }`}</style>
        <div className="flex gap-4">
          {/* Palette */}
          <div className="w-40 shrink-0 space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-1">Trascina un campo sulla tavola</div>
            {FIELD_TYPES.map(ft => (
              <div key={ft.value} draggable
                onClick={() => onAddFieldAt(ft.value, 40 + (fields.length % 4) * 240, 40 + Math.floor(fields.length / 4) * 130)}
                onDragStart={e => e.dataTransfer.setData('application/x-add-field', ft.value)}
                className="rounded-md border px-2 py-1.5 text-xs cursor-pointer hover:bg-muted">
                {ft.label}
              </div>
            ))}
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="relative flex-1 rounded-lg border overflow-auto"
            style={{ minHeight: 560, backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
            onDragOver={e => e.preventDefault()}
            onDrop={canvasDrop}
          >
            <div className="relative" style={{ width: 1400, height: 900 }}>
              <svg className="absolute inset-0 z-0" width="1400" height="900" style={{ pointerEvents: 'none' }}>
                <defs>
                  <marker id="logicarrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="#888" />
                  </marker>
                </defs>
                {connections.map((c: any, i: number) => {
                  const sf = fields.find(x => x.id === c.requiredIf.fieldId)
                  const tf = fields.find(x => x.id === c.id)
                  if (!sf || !tf) return null
                  const sp = pos(sf, fields.indexOf(sf))
                  const tp = pos(tf, fields.indexOf(tf))
                  const x1 = sp.x + NODE_W
                  const y1 = sp.y + NODE_H / 2
                  const x2 = tp.x
                  const y2 = tp.y + NODE_H / 2
                  const mx = (x1 + x2) / 2
                  const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
                  return <path key={i} d={path} className="logic-cable" fill="none" stroke="#888" strokeWidth="2" markerEnd="url(#logicarrow)" />
                })}
              </svg>

              {fields.map((f: any, i: number) => {
                const p = pos(f, i)
                const conn = connections.find((c: any) => c.id === f.id)
                const src = conn ? fields.find(x => x.id === conn.requiredIf.fieldId) : null
                return (
                  <div key={f.id}
                    className="absolute z-10"
                    style={{ left: p.x, top: p.y, width: NODE_W }}
                    draggable
                    onDragStart={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      e.dataTransfer.setData('application/x-move-node', JSON.stringify({ id: f.id, ox: e.clientX - rect.left, oy: e.clientY - rect.top }))
                      e.dataTransfer.setData('text/plain', f.id)
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const sid = e.dataTransfer.getData('application/x-connect'); if (sid) onConnect(sid, f.id) }}
                  >
                    <div className="rounded-lg border bg-background shadow-sm p-3 cursor-grab active:cursor-grabbing">
                      <button onClick={() => onEditField(f.id)} className="text-left cursor-pointer w-full">
                        <div className="font-medium text-sm truncate">{f.label || '(senza titolo)'}</div>
                        <div className="text-xs text-muted-foreground">{FIELD_TYPES.find(t => t.value === f.type)?.label || f.type}</div>
                      </button>
                      {conn && src && (
                        <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          ← "{fieldLabel(conn.requiredIf.fieldId)}"
                          <button onClick={() => onRemove(f.id)} className="ml-1 hover:text-red-600 cursor-pointer">✕</button>
                        </div>
                      )}
                    </div>
                    {/* Connect handle */}
                    <div draggable
                      onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('application/x-connect', f.id); e.dataTransfer.setData('text/plain', f.id) }}
                      className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border bg-background shadow flex items-center justify-center cursor-crosshair hover:bg-muted"
                      title="Trascina su un altro blocco per collegare">
                      <Link2 className="h-3 w-3" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

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
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [mode, setMode] = useState<'edit' | 'preview' | 'map'>('edit')
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

  const addField = (type: FieldType, page: number = 0) => updateSchema({ fields: [...schema.fields, newField(page, type)] })

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

  const setConnectionLocal = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    updateSchema({ fields: schema.fields.map((f: any) => f.id === targetId ? { ...f, requiredIf: { fieldId: sourceId, operator: 'filled' } } : f) })
  }

  const removeConnectionLocal = (targetId: string) => {
    updateSchema({ fields: schema.fields.map((f: any) => f.id === targetId ? { ...f, requiredIf: undefined } : f) })
  }

  const toggleConnect = (fid: string) => {
    if (connectingId === null) setConnectingId(fid)
    else if (connectingId === fid) setConnectingId(null)
    else { setConnectionLocal(connectingId, fid); setConnectingId(null) }
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
          {/* Mode switch */}
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {([
              { key: 'edit', label: 'Modifica', Icon: Pencil },
              { key: 'preview', label: 'Anteprima', Icon: Eye },
              { key: 'map', label: 'Mappa', Icon: GitBranch },
            ] as const).map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${mode === m.key ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <m.Icon className="h-3.5 w-3.5" /> {m.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAi(true)} className="cursor-pointer">
            <Sparkles className="h-4 w-4 mr-1" /> AI
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="cursor-pointer">
            <Settings className="h-4 w-4 mr-1" /> Impostazioni
          </Button>
          <Button size="sm" onClick={() => save()} disabled={saving} className="cursor-pointer">
            <Save className="h-4 w-4 mr-1" /> Salva
          </Button>
        </div>

        {connectingId && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Collega da "{fieldLabel(connectingId)}" — clicca l'icona 🔗 del campo di destinazione (o di nuovo per annullare).
            <Button variant="ghost" size="sm" onClick={() => setConnectingId(null)} className="ml-auto h-7 text-xs cursor-pointer">Annulla</Button>
          </div>
        )}

        {mode === 'edit' && (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          {/* Palette */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Aggiungi campo</div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
              {FIELD_TYPES.map(ft => (
                <button key={ft.value} onClick={() => addField(ft.value)} draggable
                  onDragStart={e => e.dataTransfer.setData('application/x-field-type', ft.value)}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors text-left cursor-grab active:cursor-grabbing">
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
                  <CardContent className="space-y-2"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const t = e.dataTransfer.getData('application/x-field-type') as FieldType; if (t) addField(t, pi) }}>
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
                          {f.type === 'spacer' ? (
                            <div className="flex-1 min-w-0 rounded border border-dashed border-muted-foreground/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                              <span>Spazio</span>
                              <span className="text-muted-foreground/50">({f.spacerHeight || 24}px)</span>
                            </div>
                          ) : f.type === 'heading' ? (
                            <div className="flex-1 min-w-0 rounded border px-3 py-2 text-sm">
                              <div className="font-bold">{f.label || 'Sezione'}</div>
                              {f.subtitle && <div className="text-xs text-muted-foreground">{f.subtitle}</div>}
                            </div>
                          ) : (
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
                          )}
                          <Button variant="ghost" size="icon" className={`h-8 w-8 cursor-pointer ${connectingId === f.id ? 'text-amber-500' : ''}`} onClick={() => toggleConnect(f.id)} title="Collega"><Link2 className="h-4 w-4" /></Button>
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
        )}

        {mode === 'preview' && (
          <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground mb-1">Trascina o clicca un campo</div>
              {FIELD_TYPES.map(ft => (
                <div key={ft.value} draggable
                  onClick={() => addField(ft.value, 0)}
                  onDragStart={e => e.dataTransfer.setData('application/x-add-field', ft.value)}
                  className="rounded-md border px-2 py-1.5 text-xs cursor-pointer hover:bg-muted">
                  {ft.label}
                </div>
              ))}
            </div>
            <div onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const t = e.dataTransfer.getData('application/x-add-field') as FieldType; if (t) addField(t, 0) }}>
              <FormFillView
                name={form.name}
                description={form.description || ""}
                schema={schema}
                preview
                onEditField={(fid) => { const f = schema.fields.find(x => x.id === fid); if (f) setEditField(f) }}
                onConnectClick={(fid) => toggleConnect(fid)}
              />
            </div>
          </div>
        )}

        {mode === 'map' && (
          <LogicMap
            fields={schema.fields}
            connections={schema.fields.filter((f: any) => f.requiredIf)}
            onConnect={(sourceId, targetId) => { setConnectionLocal(sourceId, targetId) }}
            onRemove={(targetId) => { removeConnectionLocal(targetId) }}
            onAddFieldAt={(type, x, y) => updateSchema({ fields: [...schema.fields, { ...newField(0, type as FieldType), x, y }] })}
            onMoveField={(fid, x, y) => updateSchema({ fields: schema.fields.map(f => f.id === fid ? { ...f, x, y } : f) })}
            onEditField={(fid) => { const f = schema.fields.find(x => x.id === fid); if (f) setEditField(f) }}
            fieldLabel={(fid) => schema.fields.find(f => f.id === fid)?.label || '(campo)'}
          />
        )}
      </div>

      {/* Edit field dialog */}
      <Dialog open={!!editField} onOpenChange={o => !o && setEditField(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Configura campo</DialogTitle></DialogHeader>
          {editField && (
            <div className="space-y-3 py-2">
              <div className="space-y-1"><Label>Tipo</Label>
                <Select value={editField.type} onValueChange={v => setEditField({ ...editField, type: v as FieldType, ...(v === 'select' || v === 'radio' ? { options: editField.options || ['Opzione 1'] } : {}) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {editField.type === 'spacer' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>Altezza (px)</Label><span className="text-sm font-mono">{editField.spacerHeight || 24}px</span></div>
                  <input type="range" min={8} max={200} step={4} value={editField.spacerHeight || 24}
                    onChange={e => setEditField({ ...editField, spacerHeight: parseInt(e.target.value) })}
                    className="w-full" />
                </div>
              )}
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
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
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
            <div className="pt-2 border-t space-y-2">
              <Label>Stile del form</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Colore principale (pulsanti)</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={schema.settings.style?.primaryColor || '#000000'}
                    onChange={e => updateSchema({ settings: { ...schema.settings, style: { ...schema.settings.style, primaryColor: e.target.value } } })}
                    className="w-8 h-8 rounded border cursor-pointer" />
                  <span className="text-xs font-mono">{schema.settings.style?.primaryColor || '#000000'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sfondo</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={schema.settings.style?.backgroundColor || '#ffffff'}
                    onChange={e => updateSchema({ settings: { ...schema.settings, style: { ...schema.settings.style, backgroundColor: e.target.value } } })}
                    className="w-8 h-8 rounded border cursor-pointer" />
                  <span className="text-xs font-mono">{schema.settings.style?.backgroundColor || '#ffffff'}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={() => { setShowSettings(false); save() }} disabled={saving}>Salva</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI dialog */}
      <Dialog open={showAi} onOpenChange={setShowAi}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Genera form con AI</DialogTitle></DialogHeader>
          <div className="flex-1 min-h-0 space-y-2 py-2">
            <Textarea value={aiDesc} onChange={e => setAiDesc(e.target.value)} rows={8}
              className="min-h-[180px] max-h-[40vh]"
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
