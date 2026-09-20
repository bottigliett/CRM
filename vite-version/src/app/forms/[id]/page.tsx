"use client"

import { useState, useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Eye, UserPlus, Trash2, Pencil, Send, Copy, GitBranch, Download, Inbox, RotateCcw, Ban, CheckCircle2, BarChart3, Sheet } from "lucide-react"
import { formsAPI, type Form, type Submission } from "@/lib/forms-api"
import { LogicMap } from "@/app/forms/components/logic-map"
import { FormCharts } from "@/app/forms/components/form-charts"
import { ColumnToggle, type ColumnDef as ToggleColumnDef } from "@/components/ui/column-toggle"
import { contactsAPI, type Contact } from "@/lib/contacts-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"

function toCsv(rows: (string | number)[][]): string {
  return rows.map(r => r.map(c => {
    const s = String(c ?? '')
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }).join(',')).join('\n')
}

export default function FormDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [tab, setTab] = useState('risposte')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [viewing, setViewing] = useState<Submission | null>(null)
  const [assigning, setAssigning] = useState<Submission | null>(null)
  const [contactSearch, setContactSearch] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])

  const formId = id ? parseInt(id) : NaN

  const load = async () => {
    if (isNaN(formId)) return
    try {
      const [f, s] = await Promise.all([formsAPI.get(formId), formsAPI.submissions(formId)])
      setForm(f.data)
      setSubmissions(s.data)
    } catch (e: any) { toast.error(e.message) }
  }

  useEffect(() => { load() }, [formId])

  useEffect(() => {
    if (!assigning) return
    const t = setTimeout(async () => {
      try { const r = await contactsAPI.getContacts({ search: contactSearch || undefined, limit: 20 }); setContacts(r.data.contacts) } catch {}
    }, 250)
    return () => clearTimeout(t)
  }, [contactSearch, assigning])

  const fields = ((form?.schema as any)?.fields as Array<{ id: string; label: string; type: string; requiredIf?: any }>) || []
  const connections = fields.filter((f: any) => f.requiredIf)

  const filtered = useMemo(() => {
    return submissions.filter(s => {
      const d = (s.data as any) || {}
      for (const [k, v] of Object.entries(filters)) {
        if (!v) continue
        const val = d[k]
        if (!String(val ?? '').toLowerCase().includes(v.toLowerCase())) return false
      }
      return true
    })
  }, [submissions, filters])

  const allCols: ToggleColumnDef[] = useMemo(() => [
    ...fields.map(f => ({ id: f.id, label: f.label })),
    { id: 'submittedAt', label: 'Data' },
    { id: 'contact', label: 'Cliente' },
  ], [fields])

  const [columns, setColumns] = useState<ToggleColumnDef[]>([])
  const [visibleColumnsMap, setVisibleColumnsMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!form || allCols.length === 0) return
    const key = `form_resp_col_${form.id}`
    try {
      const savedOrder = localStorage.getItem(`${key}_order`)
      const savedVis = localStorage.getItem(`${key}_vis`)
      let cols = allCols
      if (savedOrder) {
        const order = JSON.parse(savedOrder) as string[]
        cols = [...order.map(id => allCols.find(c => c.id === id)).filter(Boolean) as ToggleColumnDef[], ...allCols.filter(c => !order.includes(c.id))]
      }
      setColumns(cols)
      setVisibleColumnsMap(savedVis ? { ...Object.fromEntries(allCols.map(c => [c.id, true])), ...JSON.parse(savedVis) } : Object.fromEntries(allCols.map(c => [c.id, true])))
    } catch {
      setColumns(allCols)
      setVisibleColumnsMap(Object.fromEntries(allCols.map(c => [c.id, true])))
    }
  }, [allCols, form?.id])

  const persistRespPrefs = (cols: ToggleColumnDef[], vis: Record<string, boolean>) => {
    if (!form) return
    const key = `form_resp_col_${form.id}`
    localStorage.setItem(`${key}_order`, JSON.stringify(cols.map(c => c.id)))
    localStorage.setItem(`${key}_vis`, JSON.stringify(vis))
  }

  const toggleColumn = (id: string) => {
    setVisibleColumnsMap(prev => { const next = { ...prev, [id]: !prev[id] }; persistRespPrefs(columns, next); return next })
  }

  const handleReorder = (newOrder: string[]) => {
    const reordered = [...newOrder.map(id => columns.find(c => c.id === id)).filter(Boolean) as ToggleColumnDef[], ...columns.filter(c => !newOrder.includes(c.id))]
    setColumns(reordered)
    persistRespPrefs(reordered, visibleColumnsMap)
  }

  const visibleCols = columns.filter(c => visibleColumnsMap[c.id] !== false)

  if (isNaN(formId) || !form) {
    return <BaseLayout title="Form"><div className="px-4 lg:px-6">Caricamento…</div></BaseLayout>
  }

  const exportCsv = () => {
    const header = [...fields.map(f => f.label), 'Data', 'Cliente']
    const rows = filtered.map(s => {
      const d = (s.data as any) || {}
      return [...fields.map(f => Array.isArray(d[f.id]) ? (d[f.id] as any[]).join('; ') : (d[f.id] ?? '')), format(new Date(s.submittedAt), 'yyyy-MM-dd HH:mm'), s.contact?.name || '']
    })
    const csv = toCsv([header, ...rows])
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.name}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openInSheets = async () => {
    const header = [...fields.map(f => f.label), 'Data', 'Cliente']
    const rows = filtered.map(s => {
      const d = (s.data as any) || {}
      return [...fields.map(f => Array.isArray(d[f.id]) ? (d[f.id] as any[]).join('; ') : (d[f.id] ?? '')), format(new Date(s.submittedAt), 'yyyy-MM-dd HH:mm'), s.contact?.name || '']
    })
    const tsv = [header, ...rows]
      .map(r => r.map(c => String(c ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ')).join('\t'))
      .join('\n')
    try {
      await navigator.clipboard.writeText(tsv)
      window.open('https://sheets.new', '_blank')
      toast.success('Dati copiati: in Google Fogli premi Cmd+V / Ctrl+V per incollarli')
    } catch {
      toast.error('Copia negli appunti non riuscita')
    }
  }

  const setStatus = async (status: 'DRAFT' | 'PUBLISHED' | 'DISABLED') => {
    try {
      await formsAPI.update(form.id, { status })
      toast.success(status === 'PUBLISHED' ? 'Form pubblicato' : status === 'DISABLED' ? 'Form disabilitato' : 'Form messo in bozza')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/form/${form.slug}`)
    toast.success('Link pubblico copiato')
  }

  const doAssign = async (contactId: number | null) => {
    if (!assigning) return
    try { await formsAPI.assign(assigning.id, contactId); toast.success('Associato al cliente'); setAssigning(null); load() } catch (e: any) { toast.error(e.message) }
  }

  const doDelete = async (s: Submission) => {
    if (!confirm('Eliminare questo invio?')) return
    try { await formsAPI.removeSubmission(s.id); toast.success('Invio eliminato'); load() } catch (e: any) { toast.error(e.message) }
  }

  const doDeleteForm = async () => {
    if (!confirm(`Eliminare il form "${form.name}" e tutti i suoi invii?`)) return
    try { await formsAPI.remove(form.id); toast.success('Form eliminato'); navigate('/forms') } catch (e: any) { toast.error(e.message) }
  }

  const setConnection = async (sourceId: string, targetId: string) => {
    if (!form || sourceId === targetId) return
    const nextFields = (form.schema as any).fields.map((f: any) =>
      f.id === targetId ? { ...f, requiredIf: { fieldId: sourceId, operator: 'filled' } } : f
    )
    const nextSchema = { ...(form.schema as any), fields: nextFields }
    try {
      await formsAPI.update(form.id, { schema: nextSchema })
      setForm({ ...form, schema: nextSchema })
      toast.success('Collegamento creato')
    } catch (e: any) { toast.error(e.message) }
  }

  const removeConnection = async (targetId: string) => {
    if (!form) return
    const nextFields = (form.schema as any).fields.map((f: any) =>
      f.id === targetId ? { ...f, requiredIf: undefined } : f
    )
    const nextSchema = { ...(form.schema as any), fields: nextFields }
    try {
      await formsAPI.update(form.id, { schema: nextSchema })
      setForm({ ...form, schema: nextSchema })
      toast.success('Collegamento rimosso')
    } catch (e: any) { toast.error(e.message) }
  }

  const addFieldAt = async (type: string, x: number, y: number) => {
    if (!form) return
    const f: any = {
      id: `f${Date.now()}${Math.floor(Math.random() * 1000)}`, type, label: '', placeholder: '', required: false, page: 0, x, y,
      ...(type === 'select' || type === 'radio' ? { options: ['Opzione 1', 'Opzione 2'] } : {}),
    }
    const nextSchema = { ...(form.schema as any), fields: [...(form.schema as any).fields, f] }
    try {
      await formsAPI.update(form.id, { schema: nextSchema })
      setForm({ ...form, schema: nextSchema })
      toast.success('Campo aggiunto')
    } catch (e: any) { toast.error(e.message) }
  }

  const moveField = async (fid: string, x: number, y: number) => {
    if (!form) return
    const nextFields = (form.schema as any).fields.map((f: any) => f.id === fid ? { ...f, x, y } : f)
    const nextSchema = { ...(form.schema as any), fields: nextFields }
    try {
      await formsAPI.update(form.id, { schema: nextSchema })
      setForm({ ...form, schema: nextSchema })
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <BaseLayout title={form.name} description="Gestione form: risposte, collegamenti e pubblicazione">
      <div className="px-4 lg:px-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/forms')} className="cursor-pointer"><ArrowLeft className="h-4 w-4 mr-1" /> Form</Button>
          <Badge variant={form.status === 'PUBLISHED' ? 'default' : form.status === 'DISABLED' ? 'outline' : 'secondary'}>
            {form.status === 'PUBLISHED' ? 'Pubblicato' : form.status === 'DISABLED' ? 'Disabilitato' : 'Bozza'}
          </Badge>
          <div className="flex-1" />
          <Button size="sm" onClick={() => navigate(`/forms/builder/${form.id}`)} className="cursor-pointer"><Pencil className="h-4 w-4 mr-1" /> Costruzione</Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/forms/${form.id}/preview`)} className="cursor-pointer"><Eye className="h-4 w-4 mr-1" /> Anteprima</Button>
          <Button size="sm" variant="outline" onClick={copyUrl} className="cursor-pointer"><Copy className="h-4 w-4 mr-1" /> Copia link</Button>
          {form.status === 'PUBLISHED' && (
            <Button size="sm" variant="outline" onClick={() => setStatus('DISABLED')} className="cursor-pointer"><Ban className="h-4 w-4 mr-1" /> Disabilita</Button>
          )}
          {form.status === 'DISABLED' && (
            <Button size="sm" onClick={() => setStatus('PUBLISHED')} className="cursor-pointer"><CheckCircle2 className="h-4 w-4 mr-1" /> Riabilita</Button>
          )}
          {form.status === 'DRAFT' && (
            <Button size="sm" onClick={() => setStatus('PUBLISHED')} className="cursor-pointer"><Send className="h-4 w-4 mr-1" /> Pubblica</Button>
          )}
          <Button size="sm" variant="ghost" onClick={doDeleteForm} className="cursor-pointer text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="risposte"><Inbox className="h-4 w-4 mr-1" /> Risposte ({submissions.length})</TabsTrigger>
            <TabsTrigger value="grafici"><BarChart3 className="h-4 w-4 mr-1" /> Grafici</TabsTrigger>
            <TabsTrigger value="collegamenti"><GitBranch className="h-4 w-4 mr-1" /> Collegamenti</TabsTrigger>
          </TabsList>

          <TabsContent value="risposte" className="space-y-4">
            <div className="flex items-center justify-end gap-2">
              <ColumnToggle columns={columns} visibleColumns={visibleColumnsMap} onToggle={toggleColumn} onReorder={handleReorder} />
              <Button size="sm" variant="outline" onClick={openInSheets} className="cursor-pointer"><Sheet className="h-4 w-4 mr-1" /> Apri in Google Fogli</Button>
              <Button size="sm" variant="outline" onClick={exportCsv} className="cursor-pointer"><Download className="h-4 w-4 mr-1" /> Esporta CSV</Button>
            </div>

            {filtered.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center">Nessuna risposta.</p>
            ) : (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleCols.map(col => <TableHead key={col.id}>{col.label}</TableHead>)}
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                      <TableRow>
                        {visibleCols.map(col => {
                          if (col.id === 'submittedAt' || col.id === 'contact') return <TableHead key={`f-${col.id}`} className="p-1"></TableHead>
                          return (
                            <TableHead key={`f-${col.id}`} className="p-1">
                              <Input className="h-8 text-xs" placeholder={col.label} value={filters[col.id] || ''}
                                onChange={e => setFilters(prev => ({ ...prev, [col.id]: e.target.value }))} />
                            </TableHead>
                          )
                        })}
                        <TableHead className="p-1 text-right">
                          {Object.values(filters).some(v => v) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFilters({})} title="Reset filtri">
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(s => {
                        const d = (s.data as any) || {}
                        return (
                          <TableRow key={s.id} className={s.readAt ? "" : "bg-muted/40"}>
                            {visibleCols.map(col => {
                              if (col.id === 'submittedAt') {
                                return <TableCell key={col.id} className="whitespace-nowrap">{format(new Date(s.submittedAt), "dd MMM HH:mm", { locale: it })}</TableCell>
                              }
                              if (col.id === 'contact') {
                                return (
                                  <TableCell key={col.id}>
                                    {s.contact ? <Badge variant="outline">{s.contact.name}</Badge> :
                                      <Button size="sm" variant="outline" onClick={() => setAssigning(s)} className="cursor-pointer"><UserPlus className="h-3.5 w-3.5 mr-1" /> Associa</Button>}
                                  </TableCell>
                                )
                              }
                              return (
                                <TableCell key={col.id} className="max-w-[220px] truncate">
                                  {Array.isArray(d[col.id]) ? (d[col.id] as any[]).join('; ') : (d[col.id] ?? '—')}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right whitespace-nowrap">
                              <Button size="sm" variant="ghost" onClick={() => setViewing(s)} className="cursor-pointer"><Eye className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => doDelete(s)} className="cursor-pointer text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="grafici">
            <FormCharts fields={fields} submissions={submissions} />
          </TabsContent>

          <TabsContent value="collegamenti">
            <p className="text-sm text-muted-foreground">
              Schema dei collegamenti (sola visualizzazione). Le frecce indicano che un campo diventa obbligatorio quando il campo di partenza è compilato. Per modificare usa <strong>Costruzione → Mappa</strong>.
            </p>
            <LogicMap
              fields={fields}
              connections={connections}
              onConnect={setConnection}
              onRemove={removeConnection}
              onAddFieldAt={addFieldAt}
              onMoveField={moveField}
              fieldLabel={(fid) => fields.find(f => f.id === fid)?.label || '(campo)'}
              readOnly
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* View answers */}
      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Risposta</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 py-2">
              {fields.map(f => {
                const v = (viewing.data as any)?.[f.id]
                return (
                  <div key={f.id} className="border-b pb-2">
                    <div className="text-xs text-muted-foreground">{f.label}</div>
                    <div className="whitespace-pre-wrap">{Array.isArray(v) ? v.join(', ') : (v ?? '—')}</div>
                  </div>
                )
              })}
              <p className="text-xs text-muted-foreground pt-2">Inviato il {format(new Date(viewing.submittedAt), "dd MMM yyyy HH:mm", { locale: it })}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign */}
      <Dialog open={!!assigning} onOpenChange={o => !o && setAssigning(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Associa al cliente</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input autoFocus value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Cerca cliente…" />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {contacts.map(c => (
                <button key={c.id} onClick={() => doAssign(c.id)} className="w-full text-left rounded-md border px-3 py-2 hover:bg-muted">
                  <div className="font-medium text-sm">{c.name}</div>
                  {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                </button>
              ))}
              {contacts.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nessun cliente trovato</p>}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => doAssign(null)}>Lascia non associato</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
