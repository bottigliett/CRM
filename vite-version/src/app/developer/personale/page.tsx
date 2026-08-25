"use client"

import { useEffect, useMemo, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/store/auth-store"
import { personalAPI, type PersonalClient, type PersonalInvoice } from "@/lib/personal-api"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { PaymentEntitySettings } from "@/components/payment-entity-settings"
import { contactsAPI, type Contact } from "@/lib/contacts-api"
import { toast } from "sonner"
import { format } from "date-fns"
import { Lock, Plus, Trash2, FileText, Pencil, BarChart3, Loader2, MoreHorizontal, Download, Landmark, TrendingUp, Clock, AlertCircle } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

const UNLOCK_CODE = "1212"

const STATUS_BADGE: Record<string, { label: string; variant: "secondary" | "outline" | "default" | "destructive" }> = {
  DRAFT: { label: "Bozza", variant: "secondary" },
  ISSUED: { label: "Emessa", variant: "outline" },
  PAID: { label: "Pagata", variant: "default" },
  CANCELLED: { label: "Annullata", variant: "destructive" },
}

const FISCAL_NOTES_DEFAULT = "IVA 0% - OPERAZIONE NON SOGGETTA A IVA AI SENSI DELL'ART. 1, COMMI 54-89, LEGGE N. 190/2014 E SUCC. MODIFICHE/INTEGRAZIONI.\n\nQUESTO DOCUMENTO NON COSTITUISCE FATTURA A FINI FISCALI, CHE SARÀ EMESSA AL MOMENTO DEL PAGAMENTO."

type ServiceItem = { id: string; description: string; quantity: number; unitPrice: number }

type InvoiceForm = {
  personalClientId: string
  clientName: string
  clientAddress: string
  clientPIva: string
  clientCF: string
  subject: string
  status: string
  issueDate: string
  paymentDays: string
  paymentDate: string
  paymentMethod: string
  paymentNotes: string
  taxReserved: boolean
  taxAmount: string
  electronicInvoiceNumber: string
  fiscalNotes: string
}

const emptyForm: InvoiceForm = {
  personalClientId: "", clientName: "", clientAddress: "", clientPIva: "", clientCF: "",
  subject: "", status: "DRAFT",
  issueDate: new Date().toISOString().slice(0, 10), paymentDays: "30", paymentDate: "",
  paymentMethod: "", paymentNotes: "", taxReserved: false, taxAmount: "", electronicInvoiceNumber: "",
  fiscalNotes: FISCAL_NOTES_DEFAULT,
}

export default function DeveloperPersonale() {
  const user = useAuthStore(s => s.user)
  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState("")
  const [wrong, setWrong] = useState(false)
  const isDev = user?.role === "DEVELOPER" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"

  const tryUnlock = () => { if (code === UNLOCK_CODE) { setUnlocked(true); setWrong(false) } else setWrong(true) }

  if (!isDev) {
    return <BaseLayout title="Accesso negato"><div className="px-4 lg:px-6 py-16 text-center text-muted-foreground">Accesso riservato.</div></BaseLayout>
  }

  if (!unlocked) {
    return (
      <BaseLayout title="Area riservata">
        <div className="px-4 lg:px-6 flex flex-col items-center justify-center py-24">
          <div className="rounded-2xl border p-8 w-full max-w-sm text-center space-y-4">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Area riservata</h2>
            <p className="text-sm text-muted-foreground">Inserisci il codice di sblocco</p>
            <Input type="password" value={code} onChange={e => { setCode(e.target.value); setWrong(false) }} onKeyDown={e => e.key === "Enter" && tryUnlock()} placeholder="••••" autoFocus className="text-center text-lg tracking-widest" />
            {wrong && <p className="text-xs text-red-500">Codice errato</p>}
            <Button className="w-full" onClick={tryUnlock}>Sblocca</Button>
          </div>
        </div>
      </BaseLayout>
    )
  }

  return <PersonalContent />
}

function PersonalContent() {
  const [granularity, setGranularity] = useState<"monthly" | "yearly">("monthly")
  const [comparison, setComparison] = useState<Array<{ period: string; davide: number; stefano: number }>>([])
  const [clients, setClients] = useState<PersonalClient[]>([])
  const [invoices, setInvoices] = useState<PersonalInvoice[]>([])

  const loadAll = async () => {
    try {
      const [c, inv] = await Promise.all([personalAPI.getClients(), personalAPI.getInvoices()])
      setClients(c.data)
      setInvoices(inv.data)
    } catch (e: any) { toast.error(e.message) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { personalAPI.getComparison(granularity).then(r => setComparison(r.data)).catch(e => toast.error(e.message)) }, [granularity])

  const chartData = useMemo(() => comparison.map(c => ({ name: c.period, Davide: c.davide, Stefano: c.stefano })), [comparison])

  return (
    <BaseLayout title="Area personale" description="Fatturato personale e fatture private">
      <div className="px-4 lg:px-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Confronto fatturato</CardTitle>
              <CardDescription>Davide vs Stefano — solo fatture pagate</CardDescription>
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              {(["monthly", "yearly"] as const).map(g => (
                <button key={g} onClick={() => setGranularity(g)} className={`px-3 py-1.5 text-xs font-medium rounded-md ${granularity === g ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                  {g === "monthly" ? "Mensile" : "Annuale"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `€ ${v.toLocaleString("it-IT")}`} />
                <Legend />
                <Bar dataKey="Davide" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Stefano" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <InvoicesSection invoices={invoices} clients={clients} onRefresh={loadAll} />

        <ClientsSection clients={clients} onRefresh={loadAll} />
      </div>
    </BaseLayout>
  )
}

function ClientsSection({ clients, onRefresh }: { clients: PersonalClient[]; onRefresh: () => void }) {
  const [dialog, setDialog] = useState<{ open: boolean; editing?: PersonalClient }>({ open: false })
  const [form, setForm] = useState({ name: "", address: "", piva: "", cf: "" })

  const openCreate = () => { setForm({ name: "", address: "", piva: "", cf: "" }); setDialog({ open: true }) }
  const openEdit = (c: PersonalClient) => { setForm({ name: c.name, address: c.address || "", piva: c.piva || "", cf: c.cf || "" }); setDialog({ open: true, editing: c }) }

  const save = async () => {
    try {
      if (dialog.editing) await personalAPI.updateClient(dialog.editing.id, form)
      else await personalAPI.createClient(form)
      toast.success("Cliente salvato"); setDialog({ open: false }); onRefresh()
    } catch (e: any) { toast.error(e.message) }
  }

  const remove = async (id: number) => {
    if (!confirm("Eliminare il cliente?")) return
    try { await personalAPI.deleteClient(id); toast.success("Eliminato"); onRefresh() }
    catch (e: any) { toast.error(e.message) }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Clienti personali</CardTitle>
          <CardDescription>Anagrafica separata per le fatture personali</CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Nuovo</Button>
      </CardHeader>
      <CardContent>
        {clients.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map(c => (
              <div key={c.id} className="border rounded-md px-3 py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{[c.piva && `P.IVA ${c.piva}`, c.cf && `C.F. ${c.cf}`, c.address].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Nessun cliente personale</p>
        )}
      </CardContent>

      <Dialog open={dialog.open} onOpenChange={o => { if (!o) setDialog({ open: false }) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog.editing ? "Modifica cliente" : "Nuovo cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>P.IVA</Label><Input value={form.piva} onChange={e => setForm(f => ({ ...f, piva: e.target.value }))} /></div>
            <div className="space-y-1"><Label>C.F.</Label><Input value={form.cf} onChange={e => setForm(f => ({ ...f, cf: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Indirizzo</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })}>Annulla</Button>
            <Button onClick={save} disabled={!form.name.trim()}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function InvoicesSection({ invoices, clients, onRefresh }: { invoices: PersonalInvoice[]; clients: PersonalClient[]; onRefresh: () => void }) {
  const [dialog, setDialog] = useState<{ open: boolean; editing?: PersonalInvoice }>({ open: false })
  const [form, setForm] = useState<InvoiceForm>(emptyForm)
  const [services, setServices] = useState<ServiceItem[]>([{ id: "1", description: "", quantity: 1, unitPrice: 0 }])
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [taxInvoice, setTaxInvoice] = useState<PersonalInvoice | null>(null)
  const [taxPercentage, setTaxPercentage] = useState("28")
  const [taxSubmitting, setTaxSubmitting] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [clientSel, setClientSel] = useState("")

  useEffect(() => {
    contactsAPI.getContacts({ limit: 1000 }).then(r => { if (r.success) setContacts(r.data.contacts) }).catch(() => {})
  }, [])

  const issued = invoices.filter(i => i.status === "ISSUED" || i.status === "PAID").reduce((s, i) => s + i.total, 0)
  const collected = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.total, 0)
  const pending = invoices.filter(i => i.status === "ISSUED").reduce((s, i) => s + i.total, 0)

  const filtered = invoices.filter(i => {
    const matchStatus = statusFilter === "all" || i.status === statusFilter
    const matchSearch = !search || i.clientName.toLowerCase().includes(search.toLowerCase()) || i.invoiceNumber.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const subtotal = services.reduce((s, x) => s + (x.quantity * x.unitPrice), 0)
  const total = subtotal

  const openCreate = () => { setForm(emptyForm); setServices([{ id: "1", description: "", quantity: 1, unitPrice: 0 }]); setClientSel(""); setDialog({ open: true }) }

  const openEdit = (inv: PersonalInvoice) => {
    setForm({
      personalClientId: inv.personalClientId ? String(inv.personalClientId) : "",
      clientName: inv.clientName, clientAddress: inv.clientAddress || "", clientPIva: inv.clientPIva || "", clientCF: inv.clientCF || "",
      subject: inv.subject, status: inv.status,
      issueDate: inv.issueDate?.slice(0, 10) || "", paymentDays: String(inv.paymentDays ?? 30),
      paymentDate: inv.paymentDate?.slice(0, 10) || "", paymentMethod: inv.paymentMethod || "", paymentNotes: inv.paymentNotes || "",
      taxReserved: inv.taxReserved, taxAmount: inv.taxAmount != null ? String(inv.taxAmount) : "",
      electronicInvoiceNumber: inv.electronicInvoiceNumber || "", fiscalNotes: inv.fiscalNotes || FISCAL_NOTES_DEFAULT,
    })
    try {
      const parsed = JSON.parse(inv.description || "[]")
      setServices(Array.isArray(parsed) && parsed.length ? parsed : [{ id: "1", description: inv.description || "", quantity: inv.quantity, unitPrice: inv.unitPrice }])
    } catch { setServices([{ id: "1", description: inv.description || "", quantity: inv.quantity, unitPrice: inv.unitPrice }]) }
    setClientSel(inv.personalClientId ? `p:${inv.personalClientId}` : "")
    setDialog({ open: true, editing: inv })
  }

  const pickClient = (value: string) => {
    setClientSel(value)
    if (value.startsWith("p:")) {
      const c = clients.find(x => String(x.id) === value.slice(2))
      setForm(f => ({ ...f, personalClientId: value.slice(2), clientName: c?.name || "", clientAddress: c?.address || "", clientPIva: c?.piva || "", clientCF: c?.cf || "" }))
    } else if (value.startsWith("c:")) {
      const c = contacts.find(x => String(x.id) === value.slice(2))
      setForm(f => ({ ...f, personalClientId: "", clientName: c?.name || "", clientAddress: c?.address || "", clientPIva: c?.partitaIva || "", clientCF: c?.codiceFiscale || "" }))
    } else {
      setForm(f => ({ ...f, personalClientId: "", clientName: "", clientAddress: "", clientPIva: "", clientCF: "" }))
    }
  }

  const addService = () => { const nid = (Math.max(...services.map(s => parseInt(s.id)), 0) + 1).toString(); setServices([...services, { id: nid, description: "", quantity: 1, unitPrice: 0 }]) }
  const removeService = (id: string) => { if (services.length > 1) setServices(services.filter(s => s.id !== id)) }
  const updateService = (id: string, field: keyof ServiceItem, value: any) => setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s))

  const save = async () => {
    const payload = {
      ...form,
      personalClientId: form.personalClientId || null,
      description: JSON.stringify(services),
      quantity: services[0]?.quantity ?? 1, unitPrice: services[0]?.unitPrice ?? 0,
      subtotal, vatPercentage: 0, vatAmount: 0, total,
      taxAmount: form.taxAmount ? parseFloat(form.taxAmount) : null,
      paymentDays: parseInt(form.paymentDays) || 30,
      paymentDate: form.paymentDate || null,
    }
    setSubmitting(true)
    try {
      const res = dialog.editing ? await personalAPI.updateInvoice(dialog.editing.id, payload) : await personalAPI.createInvoice(payload)
      toast.success("Fattura salvata"); setDialog({ open: false }); onRefresh()
      // Auto-open tax reservation when the invoice becomes PAID and taxes are not reserved yet
      if (payload.status === "PAID" && res.data && !res.data.taxReserved) {
        setTimeout(() => setTaxInvoice(res.data), 400)
      }
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  const setStatus = async (inv: PersonalInvoice, status: string) => {
    try { await personalAPI.updateInvoice(inv.id, { status, paymentDate: status === "PAID" ? new Date().toISOString() : inv.paymentDate }); toast.success("Stato aggiornato"); onRefresh() }
    catch (e: any) { toast.error(e.message) }
  }

  const openTaxDialog = (inv: PersonalInvoice) => { setTaxInvoice(inv); setTaxPercentage("28") }

  const confirmReserveTaxes = async () => {
    if (!taxInvoice) return
    const pct = parseFloat(taxPercentage) || 28
    const amount = taxInvoice.total * (pct / 100)
    setTaxSubmitting(true)
    try {
      await personalAPI.updateInvoice(taxInvoice.id, { taxReserved: true, taxAmount: amount })
      toast.success("Tasse accantonate")
      setTaxInvoice(null)
      onRefresh()
    } catch (e: any) { toast.error(e.message) }
    finally { setTaxSubmitting(false) }
  }

  const remove = async (id: number) => {
    if (!confirm("Eliminare la fattura?")) return
    try { await personalAPI.deleteInvoice(id); toast.success("Eliminata"); onRefresh() }
    catch (e: any) { toast.error(e.message) }
  }

  const downloadPdf = (inv: PersonalInvoice) => {
    generateInvoicePDF(inv.id, {
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.issueDate ? format(new Date(inv.issueDate), "dd/MM/yyyy") : "",
      dueDate: inv.dueDate ? format(new Date(inv.dueDate), "dd/MM/yyyy") : "",
      paymentDays: inv.paymentDays,
      clientName: inv.clientName, clientAddress: inv.clientAddress, clientPIva: inv.clientPIva, clientCF: inv.clientCF,
      subject: inv.subject, description: inv.description || "",
      quantity: String(inv.quantity), unitPrice: String(inv.unitPrice),
      subtotal: String(inv.subtotal), vatPercentage: String(inv.vatPercentage), vatAmount: String(inv.vatAmount), total: String(inv.total),
      fiscalNotes: inv.fiscalNotes, isVatZero: true,
      services: (() => { try { const p = JSON.parse(inv.description || "[]"); return Array.isArray(p) ? p : [] } catch { return [] } })(),
      personal: true,
    }).catch(e => toast.error(e.message))
  }

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Totale Emesso</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">€ {issued.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Totale Incassato</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">€ {collected.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">In Attesa</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">€ {pending.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</div></CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fatture personali</CardTitle>
              <CardDescription>Gestisci le tue fatture personali</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <PaymentEntitySettings />
              <Button onClick={openCreate} className="bg-primary hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> Nuova Fattura</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Numero</TableHead>
                  <TableHead className="min-w-[220px]">Cliente</TableHead>
                  <TableHead className="w-[110px] text-right">Totale</TableHead>
                  <TableHead className="w-[90px]">Data</TableHead>
                  <TableHead className="w-[90px]">Stato</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Numero..." value={search} onChange={e => setSearch(e.target.value)} /></TableHead>
                  <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Cliente..." value={search} onChange={e => setSearch(e.target.value)} /></TableHead>
                  <TableHead className="p-1"></TableHead>
                  <TableHead className="p-1"></TableHead>
                  <TableHead className="p-1">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stato" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti</SelectItem>
                        <SelectItem value="DRAFT">Bozze</SelectItem>
                        <SelectItem value="ISSUED">Emesse</SelectItem>
                        <SelectItem value="PAID">Pagate</SelectItem>
                        <SelectItem value="CANCELLED">Annullate</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead className="p-1"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-12 w-12 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">Nessuna fattura trovata</p>
                        {invoices.length === 0 && <Button onClick={openCreate} variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> Crea la tua prima fattura</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(inv => (
                  <TableRow key={inv.id} className="cursor-pointer" onClick={() => openEdit(inv)}>
                    <TableCell className="font-mono text-xs font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{inv.clientName}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[280px]">{inv.subject}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-right tabular-nums">€ {inv.total.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{inv.issueDate ? format(new Date(inv.issueDate), "dd/MM/yy") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[inv.status]?.variant || "secondary"} className={inv.status === "PAID" ? "bg-green-600" : ""}>{STATUS_BADGE[inv.status]?.label || inv.status}</Badge>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => downloadPdf(inv)}><FileText className="mr-2 h-4 w-4" /> Anteprima</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(inv)}><Pencil className="mr-2 h-4 w-4" /> Modifica</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadPdf(inv)}><Download className="mr-2 h-4 w-4" /> Scarica PDF</DropdownMenuItem>
                          {inv.status === "PAID" && !inv.taxReserved && (
                            <DropdownMenuItem className="text-orange-600" onClick={() => openTaxDialog(inv)}><Landmark className="mr-2 h-4 w-4" /> Accantona Tasse</DropdownMenuItem>
                          )}
                          {inv.status !== "PAID" && (
                            <DropdownMenuItem onClick={() => setStatus(inv, "PAID")}>✓ Segna come Pagata</DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => remove(inv.id)}><Trash2 className="mr-2 h-4 w-4" /> Elimina</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Dialog */}
      <Dialog open={dialog.open} onOpenChange={o => { if (!o) setDialog({ open: false }) }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? "Modifica Fattura" : "Nuova Fattura Personale"}</DialogTitle>
            <DialogDescription>Compila i dettagli della fattura personale</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stato</Label>
                <Select value={form.status} onValueChange={(v: string) => setForm(f => ({ ...f, status: v, paymentDate: v === "PAID" ? (f.paymentDate || new Date().toISOString().slice(0, 10)) : f.paymentDate }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Bozza</SelectItem>
                    <SelectItem value="ISSUED">Emessa</SelectItem>
                    <SelectItem value="PAID">Pagata</SelectItem>
                    <SelectItem value="CANCELLED">Annullata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={clientSel} onValueChange={pickClient}>
                  <SelectTrigger><SelectValue placeholder="Seleziona cliente..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Manuale —</SelectItem>
                    {clients.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Personali</div>
                        {clients.map(c => <SelectItem key={`p${c.id}`} value={`p:${c.id}`}>{c.name}</SelectItem>)}
                      </>
                    )}
                    {contacts.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Anagrafica CRM</div>
                        {contacts.map(c => <SelectItem key={`c${c.id}`} value={`c:${c.id}`}>{c.name}</SelectItem>)}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Numero Fattura</Label>
                <Input value={dialog.editing ? dialog.editing.invoiceNumber : "Automatico"} disabled />
              </div>
              <div className="space-y-2">
                <Label>Destinatario</Label>
                <Input value="Davide" disabled />
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold">Dati Cliente</h3>
              <div className="space-y-2"><Label>Nome cliente *</Label><Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>P.IVA</Label><Input value={form.clientPIva} onChange={e => setForm(f => ({ ...f, clientPIva: e.target.value }))} /></div>
                <div className="space-y-1"><Label>C.F.</Label><Input value={form.clientCF} onChange={e => setForm(f => ({ ...f, clientCF: e.target.value }))} /></div>
              </div>
              <div className="space-y-1"><Label>Indirizzo</Label><Input value={form.clientAddress} onChange={e => setForm(f => ({ ...f, clientAddress: e.target.value }))} /></div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold">Dettagli Fattura</h3>
              <div className="space-y-2"><Label>Oggetto *</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Servizi *</Label><Button type="button" variant="outline" size="sm" onClick={addService}>+ Aggiungi Servizio</Button></div>
                {services.map((s, i) => (
                  <div key={s.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6 space-y-1">{i === 0 && <Label className="text-xs">Descrizione</Label>}<Input placeholder="Gestione social media" value={s.description} onChange={e => updateService(s.id, "description", e.target.value)} /></div>
                    <div className="col-span-2 space-y-1">{i === 0 && <Label className="text-xs">Qtà</Label>}<Input type="number" step="0.01" min="0" value={s.quantity || ""} onChange={e => updateService(s.id, "quantity", parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-3 space-y-1">{i === 0 && <Label className="text-xs">Prezzo €</Label>}<Input type="number" step="0.01" min="0" value={s.unitPrice || ""} onChange={e => updateService(s.id, "unitPrice", parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-1">{services.length > 1 && <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive" onClick={() => removeService(s.id)}><Trash2 className="h-4 w-4" /></Button>}</div>
                  </div>
                ))}
              </div>
              <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                <div className="flex justify-between"><span>Imponibile:</span><span className="font-medium">€ {subtotal.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between"><span>IVA (0%):</span><span className="font-medium">€ 0,00</span></div>
                <div className="flex justify-between text-base font-semibold border-t pt-1"><span>Totale:</span><span>€ {total.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold">Date e Pagamento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data Emissione *</Label><Input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Giorni Pagamento *</Label>
                  <Select value={form.paymentDays} onValueChange={(v: string) => setForm(f => ({ ...f, paymentDays: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Immediato</SelectItem><SelectItem value="7">7 giorni</SelectItem><SelectItem value="15">15 giorni</SelectItem>
                      <SelectItem value="30">30 giorni</SelectItem><SelectItem value="60">60 giorni</SelectItem><SelectItem value="90">90 giorni</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.status === "PAID" && <div className="space-y-2"><Label>Data Pagamento</Label><Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} /></div>}
            </div>

            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold">Fatturazione elettronica</h3>
              <div className="space-y-2"><Label>Numero fattura elettronica</Label><Input value={form.electronicInvoiceNumber} onChange={e => setForm(f => ({ ...f, electronicInvoiceNumber: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })}>Annulla</Button>
            <Button onClick={save} disabled={submitting || !form.clientName.trim() || !form.subject.trim() || services.every(s => !s.description.trim())}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialog.editing ? "Salva Modifiche" : "Crea Fattura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax Reserve Dialog */}
      <Dialog open={!!taxInvoice} onOpenChange={o => { if (!o) setTaxInvoice(null) }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-orange-600" /> Accantona Tasse</DialogTitle>
            <DialogDescription>Calcola e accantona le tasse per la fattura {taxInvoice?.invoiceNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Percentuale tasse (%)</Label>
              <Input type="number" min="0" max="100" value={taxPercentage} onChange={e => setTaxPercentage(e.target.value)} />
            </div>
            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <div className="flex justify-between"><span>Totale fattura:</span><span className="font-medium">€ {taxInvoice ? taxInvoice.total.toLocaleString("it-IT", { minimumFractionDigits: 2 }) : "0,00"}</span></div>
              <div className="flex justify-between"><span>Tasse ({taxPercentage || 0}%):</span><span className="font-medium">€ {taxInvoice ? (taxInvoice.total * (parseFloat(taxPercentage) || 0) / 100).toLocaleString("it-IT", { minimumFractionDigits: 2 }) : "0,00"}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaxInvoice(null)}>Annulla</Button>
            <Button onClick={confirmReserveTaxes} disabled={taxSubmitting} className="bg-orange-600 hover:bg-orange-700">
              {taxSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accantona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
