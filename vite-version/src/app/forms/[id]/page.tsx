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
import { ArrowLeft, Eye, UserPlus, Trash2, Pencil, Send, Copy, GitBranch, Download, Inbox, RotateCcw, Ban, CheckCircle2 } from "lucide-react"
import { formsAPI, FIELD_TYPES, type Form, type Submission } from "@/lib/forms-api"
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
            <TabsTrigger value="collegamenti"><GitBranch className="h-4 w-4 mr-1" /> Collegamenti</TabsTrigger>
          </TabsList>

          <TabsContent value="risposte" className="space-y-4">
            <div className="flex justify-end">
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
                        {fields.map(f => <TableHead key={f.id}>{f.label}</TableHead>)}
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                      <TableRow>
                        {fields.map(f => (
                          <TableHead key={`f-${f.id}`} className="p-1">
                            <Input className="h-8 text-xs" placeholder={f.label} value={filters[f.id] || ''}
                              onChange={e => setFilters(prev => ({ ...prev, [f.id]: e.target.value }))} />
                          </TableHead>
                        ))}
                        <TableHead className="p-1"></TableHead>
                        <TableHead className="p-1"></TableHead>
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
                            {fields.map(f => (
                              <TableCell key={f.id} className="max-w-[220px] truncate">
                                {Array.isArray(d[f.id]) ? (d[f.id] as any[]).join('; ') : (d[f.id] ?? '—')}
                              </TableCell>
                            ))}
                            <TableCell className="whitespace-nowrap">{format(new Date(s.submittedAt), "dd MMM HH:mm", { locale: it })}</TableCell>
                            <TableCell>
                              {s.contact ? <Badge variant="outline">{s.contact.name}</Badge> :
                                <Button size="sm" variant="outline" onClick={() => setAssigning(s)} className="cursor-pointer"><UserPlus className="h-3.5 w-3.5 mr-1" /> Associa</Button>}
                            </TableCell>
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

          <TabsContent value="collegamenti">
            <Card>
              <CardContent className="pt-6">
                {connections.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nessun collegamento. Vai in "Costruzione" e imposta la logica condizionale su un campo.
                  </p>
                ) : (
                  <div className="relative">
                    {fields.length > 0 && (
                      <svg className="absolute left-0 top-0 z-0" width="130" height={fields.length * 76} style={{ pointerEvents: 'none' }}>
                        <defs>
                          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                            <path d="M0,0 L8,4 L0,8 Z" fill="#94a3b8" />
                          </marker>
                        </defs>
                        {connections.map((c: any, i) => {
                          const si = fields.findIndex(x => x.id === c.requiredIf.fieldId)
                          const ti = fields.findIndex(x => x.id === c.id)
                          if (si < 0 || ti < 0) return null
                          const y1 = si * 76 + 38
                          const y2 = ti * 76 + 38
                          const path = `M 36 ${y1} C 14 ${y1}, 14 ${y2}, 36 ${y2}`
                          return <path key={i} d={path} fill="none" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
                        })}
                      </svg>
                    )}
                    <div className="space-y-3 relative z-10">
                      {fields.map((f: any, i) => {
                        const typeLabel = FIELD_TYPES.find(t => t.value === f.type)?.label || f.type
                        const isSource = connections.some((c: any) => c.requiredIf?.fieldId === f.id)
                        const conn = connections.find((c: any) => c.id === f.id)
                        return (
                          <div key={f.id} className="flex items-center pl-16" style={{ minHeight: 76 }}>
                            <div className={`flex-1 rounded-lg border p-3 bg-background ${isSource ? 'border-muted-foreground/40' : ''}`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="font-medium text-sm">{f.label || '(senza titolo)'}</div>
                                <div className="flex items-center gap-1.5">
                                  {isSource && <span className="text-xs rounded bg-muted px-1.5 py-0.5 text-muted-foreground">sorgente</span>}
                                  {conn && <span className="text-xs rounded bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">obbligatorio se {conn.requiredIf.operator === 'filled' ? 'compilato' : 'vuoto'}</span>}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">{typeLabel}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
