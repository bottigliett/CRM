"use client"

import { useEffect, useMemo, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAuthStore } from "@/store/auth-store"
import { personalAPI, type PersonalClient, type PersonalInvoice } from "@/lib/personal-api"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { toast } from "sonner"
import { format } from "date-fns"
import { Lock, Plus, Trash2, FileText, Pencil, BarChart3 } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

const UNLOCK_CODE = "1212"

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Bozza", cls: "bg-gray-100 text-gray-700" },
  ISSUED: { label: "Emessa", cls: "bg-blue-100 text-blue-700" },
  PAID: { label: "Pagata", cls: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Stornata", cls: "bg-red-100 text-red-700" },
}

type InvoiceForm = {
  personalClientId: string
  clientName: string
  clientAddress: string
  clientPIva: string
  clientCF: string
  subject: string
  description: string
  total: string
  issueDate: string
  dueDate: string
  paymentDays: string
  paymentMethod: string
  paymentNotes: string
  taxReserved: boolean
  taxAmount: string
  electronicInvoiceNumber: string
}

const emptyForm: InvoiceForm = {
  personalClientId: "",
  clientName: "",
  clientAddress: "",
  clientPIva: "",
  clientCF: "",
  subject: "",
  description: "",
  total: "",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  paymentDays: "30",
  paymentMethod: "",
  paymentNotes: "",
  taxReserved: false,
  taxAmount: "",
  electronicInvoiceNumber: "",
}

export default function DeveloperPersonale() {
  const user = useAuthStore(s => s.user)
  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState("")
  const [wrong, setWrong] = useState(false)

  const isDev = user?.role === "DEVELOPER" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"

  const tryUnlock = () => {
    if (code === UNLOCK_CODE) {
      setUnlocked(true)
      setWrong(false)
    } else {
      setWrong(true)
    }
  }

  if (!isDev) {
    return (
      <BaseLayout title="Accesso negato">
        <div className="px-4 lg:px-6 py-16 text-center text-muted-foreground">Accesso riservato.</div>
      </BaseLayout>
    )
  }

  if (!unlocked) {
    return (
      <BaseLayout title="Area riservata">
        <div className="px-4 lg:px-6 flex flex-col items-center justify-center py-24">
          <div className="rounded-2xl border p-8 w-full max-w-sm text-center space-y-4">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Area riservata</h2>
            <p className="text-sm text-muted-foreground">Inserisci il codice di sblocco</p>
            <Input
              type="password"
              value={code}
              onChange={e => { setCode(e.target.value); setWrong(false) }}
              onKeyDown={e => e.key === "Enter" && tryUnlock()}
              placeholder="••••"
              autoFocus
              className="text-center text-lg tracking-widest"
            />
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
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => {
    personalAPI.getComparison(granularity)
      .then(r => setComparison(r.data))
      .catch(e => toast.error(e.message))
  }, [granularity])

  const chartData = useMemo(() =>
    comparison.map(c => ({
      name: c.period,
      Davide: c.davide,
      Stefano: c.stefano,
    })), [comparison])

  return (
    <BaseLayout title="Area personale" description="Fatturato personale e fatture private">
      <div className="px-4 lg:px-6 space-y-6">
        {/* Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Confronto fatturato</CardTitle>
              <CardDescription>Davide vs Stefano — solo fatture pagate</CardDescription>
            </div>
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              {(["monthly", "yearly"] as const).map(g => (
                <button key={g} onClick={() => setGranularity(g)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md ${granularity === g ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <ClientsSection clients={clients} onRefresh={loadAll} />
          <InvoicesSection invoices={invoices} clients={clients} onRefresh={loadAll} />
        </div>
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
      toast.success("Cliente salvato")
      setDialog({ open: false })
      onRefresh()
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
        <CardTitle>Clienti personali</CardTitle>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Nuovo</Button>
      </CardHeader>
      <CardContent>
        {clients.length ? (
          <div className="space-y-1">
            {clients.map(c => (
              <div key={c.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[c.piva && `P.IVA ${c.piva}`, c.cf && `C.F. ${c.cf}`, c.address].filter(Boolean).join(" · ")}
                  </p>
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

  const openCreate = () => { setForm(emptyForm); setDialog({ open: true }) }
  const openEdit = (inv: PersonalInvoice) => {
    setForm({
      personalClientId: inv.personalClientId ? String(inv.personalClientId) : "",
      clientName: inv.clientName,
      clientAddress: inv.clientAddress || "",
      clientPIva: inv.clientPIva || "",
      clientCF: inv.clientCF || "",
      subject: inv.subject,
      description: inv.description || "",
      total: String(inv.total),
      issueDate: inv.issueDate?.slice(0, 10) || "",
      dueDate: inv.dueDate?.slice(0, 10) || "",
      paymentDays: String(inv.paymentDays ?? 30),
      paymentMethod: inv.paymentMethod || "",
      paymentNotes: inv.paymentNotes || "",
      taxReserved: inv.taxReserved,
      taxAmount: inv.taxAmount != null ? String(inv.taxAmount) : "",
      electronicInvoiceNumber: inv.electronicInvoiceNumber || "",
    })
    setDialog({ open: true, editing: inv })
  }

  const applyClient = (clientId: string) => {
    const c = clients.find(x => String(x.id) === clientId)
    setForm(f => ({
      ...f,
      personalClientId: clientId,
      clientName: c?.name || "",
      clientAddress: c?.address || "",
      clientPIva: c?.piva || "",
      clientCF: c?.cf || "",
    }))
  }

  const save = async () => {
    const total = parseFloat(form.total) || 0
    const payload = {
      ...form,
      total,
      subtotal: total,
      vatPercentage: 0,
      vatAmount: 0,
      quantity: 1,
      unitPrice: total,
      personalClientId: form.personalClientId || null,
      taxAmount: form.taxAmount ? parseFloat(form.taxAmount) : null,
      paymentDays: parseInt(form.paymentDays) || 30,
    }
    try {
      if (dialog.editing) await personalAPI.updateInvoice(dialog.editing.id, payload)
      else await personalAPI.createInvoice(payload)
      toast.success("Fattura salvata")
      setDialog({ open: false })
      onRefresh()
    } catch (e: any) { toast.error(e.message) }
  }

  const setStatus = async (inv: PersonalInvoice, status: string) => {
    try { await personalAPI.updateInvoice(inv.id, { status }); toast.success("Stato aggiornato"); onRefresh() }
    catch (e: any) { toast.error(e.message) }
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
      clientName: inv.clientName,
      clientAddress: inv.clientAddress,
      clientPIva: inv.clientPIva,
      clientCF: inv.clientCF,
      subject: inv.subject,
      description: inv.description || "",
      quantity: String(inv.quantity),
      unitPrice: String(inv.unitPrice),
      subtotal: String(inv.subtotal),
      vatPercentage: String(inv.vatPercentage),
      vatAmount: String(inv.vatAmount),
      total: String(inv.total),
      fiscalNotes: inv.fiscalNotes,
      isVatZero: inv.vatPercentage === 0,
      services: [{ description: inv.description || inv.subject, quantity: String(inv.quantity), unitPrice: String(inv.unitPrice) }],
      personal: true,
    }).catch(e => toast.error(e.message))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Fatture personali</CardTitle>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Nuova fattura</Button>
      </CardHeader>
      <CardContent>
        {invoices.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Totale</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{inv.clientName}</TableCell>
                    <TableCell>€ {inv.total.toLocaleString("it-IT")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv.issueDate ? format(new Date(inv.issueDate), "dd/MM/yy") : "—"}</TableCell>
                    <TableCell>
                      <select
                        value={inv.status}
                        onChange={e => setStatus(inv, e.target.value)}
                        className={`text-xs rounded px-1.5 py-0.5 border-0 ${STATUS_LABEL[inv.status]?.cls || ""}`}
                      >
                        <option value="DRAFT">Bozza</option>
                        <option value="ISSUED">Emessa</option>
                        <option value="PAID">Pagata</option>
                        <option value="CANCELLED">Stornata</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(inv)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => downloadPdf(inv)}><FileText className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => remove(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Nessuna fattura personale</p>
        )}
      </CardContent>

      <Dialog open={dialog.open} onOpenChange={o => { if (!o) setDialog({ open: false }) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dialog.editing ? "Modifica fattura" : "Nuova fattura personale"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Cliente personale</Label>
              <select className="w-full h-9 rounded-md border px-2 text-sm" value={form.personalClientId} onChange={e => applyClient(e.target.value)}>
                <option value="">— Manuale —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Nome cliente *</Label><Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>P.IVA</Label><Input value={form.clientPIva} onChange={e => setForm(f => ({ ...f, clientPIva: e.target.value }))} /></div>
              <div className="space-y-1"><Label>C.F.</Label><Input value={form.clientCF} onChange={e => setForm(f => ({ ...f, clientCF: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Indirizzo</Label><Input value={form.clientAddress} onChange={e => setForm(f => ({ ...f, clientAddress: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Oggetto *</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Descrizione</Label><Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Totale (€) *</Label><Input type="number" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1"><Label>Emissione</Label><Input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Scadenza</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Giorni</Label><Input type="number" value={form.paymentDays} onChange={e => setForm(f => ({ ...f, paymentDays: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Metodo pagamento</Label><Input value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Note</Label><Input value={form.paymentNotes} onChange={e => setForm(f => ({ ...f, paymentNotes: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Numero fattura elettronica</Label><Input value={form.electronicInvoiceNumber} onChange={e => setForm(f => ({ ...f, electronicInvoiceNumber: e.target.value }))} /></div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Accantonamento tasse</Label>
                <p className="text-xs text-muted-foreground">Segna che le tasse sono state accantonate</p>
              </div>
              <Switch checked={form.taxReserved} onCheckedChange={v => setForm(f => ({ ...f, taxReserved: v }))} />
            </div>
            {form.taxReserved && (
              <div className="space-y-1"><Label>Importo tasse (€)</Label><Input type="number" value={form.taxAmount} onChange={e => setForm(f => ({ ...f, taxAmount: e.target.value }))} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })}>Annulla</Button>
            <Button onClick={save} disabled={!form.clientName.trim() || !form.subject.trim() || !form.total}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
