"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Eye, UserPlus, Trash2, Search } from "lucide-react"
import { formsAPI, type Submission, type Form } from "@/lib/forms-api"
import { contactsAPI, type Contact } from "@/lib/contacts-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"

export default function SubmissionsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const formId = id ? parseInt(id) : undefined
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [search, setSearch] = useState("")
  const [filterForm, setFilterForm] = useState<string>(formId ? String(formId) : "all")
  const [viewing, setViewing] = useState<Submission | null>(null)
  const [assigning, setAssigning] = useState<Submission | null>(null)
  const [contactSearch, setContactSearch] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])

  const load = async () => {
    try {
      const [subs, fs] = await Promise.all([formsAPI.submissions(formId), formsAPI.list()])
      setSubmissions(subs.data)
      setForms(fs.data)
    } catch (e: any) { toast.error(e.message) }
  }

  useEffect(() => { load() }, [formId])

  useEffect(() => {
    if (!assigning) return
    const t = setTimeout(async () => {
      try {
        const r = await contactsAPI.getContacts({ search: contactSearch || undefined, limit: 20 })
        setContacts(r.data.contacts)
      } catch {}
    }, 250)
    return () => clearTimeout(t)
  }, [contactSearch, assigning])

  const filtered = useMemo(() => {
    let s = submissions
    if (!formId && filterForm !== "all") s = s.filter(x => x.formId === parseInt(filterForm))
    if (search) {
      const q = search.toLowerCase()
      s = s.filter(x => {
        const d = (x.data as any) || {}
        return Object.values(d).join(' ').toLowerCase().includes(q) || (x.contact?.name || '').toLowerCase().includes(q)
      })
    }
    return s
  }, [submissions, search, filterForm, formId])

  const formName = (formId: number) => forms.find(f => f.id === formId)?.name || `Form ${formId}`

  const summaryOf = (s: Submission) => {
    const d = (s.data as any) || {}
    const vals = Object.values(d).filter(v => typeof v === 'string' && v.trim())
    return vals[0] || '—'
  }

  const doAssign = async (contactId: number | null) => {
    if (!assigning) return
    try {
      await formsAPI.assign(assigning.id, contactId)
      toast.success('Associato al cliente')
      setAssigning(null)
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const doDelete = async (s: Submission) => {
    if (!confirm('Eliminare questo invio?')) return
    try {
      await formsAPI.removeSubmission(s.id)
      toast.success('Invio eliminato')
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <BaseLayout title={formId ? `Invii — ${formName(formId)}` : "Invii form"} description="Storico delle compilazioni dei form">
      <div className="px-4 lg:px-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {formId && <Button variant="ghost" size="sm" onClick={() => navigate('/forms')}><ArrowLeft className="h-4 w-4 mr-1" /> Form</Button>}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca (ragione sociale, contenuto…)" className="pl-8" />
          </div>
          {!formId && (
            <Select value={filterForm} onValueChange={setFilterForm}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tutti i form" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i form</SelectItem>
                {forms.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">Nessun invio.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead>Compilato da / contenuto</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id} className={s.readAt ? "" : "bg-muted/40"}>
                      <TableCell className="font-medium">{s.form?.name || formName(s.formId)}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{summaryOf(s)}</TableCell>
                      <TableCell className="whitespace-nowrap">{format(new Date(s.submittedAt), "dd MMM yyyy HH:mm", { locale: it })}</TableCell>
                      <TableCell>
                        {s.contact ? (
                          <Badge variant="outline">{s.contact.name}</Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setAssigning(s)} className="cursor-pointer">
                            <UserPlus className="h-3.5 w-3.5 mr-1" /> Associa
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(s)} className="cursor-pointer"><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => doDelete(s)} className="cursor-pointer text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View answers */}
      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing ? formName(viewing.formId) : ''}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 py-2">
              {Object.entries((viewing.data as any) || {}).map(([k, v]) => (
                <div key={k} className="border-b pb-2">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="whitespace-pre-wrap">{Array.isArray(v) ? v.join(', ') : String(v)}</div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">Inviato il {format(new Date(viewing.submittedAt), "dd MMM yyyy HH:mm", { locale: it })}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign to contact */}
      <Dialog open={!!assigning} onOpenChange={o => !o && setAssigning(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Associa al cliente</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input autoFocus value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Cerca cliente per nome / ragione sociale…" />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => doAssign(null)}>Lascia non associato</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
