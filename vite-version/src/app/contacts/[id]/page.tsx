import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  CheckSquare,
  Calendar,
  Ticket,
  FolderOpen,
  Euro,
  Loader2,
  Edit,
  Trash2,
  User,
  Building2,
  RefreshCw,
  Key,
} from "lucide-react"
import { contactsAPI } from "@/lib/contacts-api"
import { toast } from "sonner"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const PREVIEW_LIMIT = 5

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    COLLABORATION: "Collaborazione",
    USEFUL_CONTACT: "Contatto Utile",
    PROSPECT: "Prospect",
    CLIENT: "Cliente",
  }
  return labels[type] || type
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    COLLABORATION: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    USEFUL_CONTACT: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    PROSPECT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    CLIENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  }
  return colors[type] || ""
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amount)
}

function formatDate(date: string | Date) {
  return format(new Date(date), "dd MMM yyyy", { locale: it })
}

// Collapsible section: shows first N items, "Vedi tutti" expands
function Section({ title, icon: Icon, items, renderItem, emptyText }: {
  title: string
  icon: React.ElementType
  items: any[]
  renderItem: (item: any, i: number) => React.ReactNode
  emptyText: string
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, PREVIEW_LIMIT)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
          <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {visible.map(renderItem)}
            {items.length > PREVIEW_LIMIT && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Mostra meno" : `Vedi tutti (${items.length})`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [contact, setContact] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        setLoading(true)
        const res = await contactsAPI.getContactFull(parseInt(id))
        setContact(res.data)
      } catch (error: any) {
        toast.error(error.message || "Errore nel caricamento del contatto")
        navigate("/contacts")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <BaseLayout title="Contatto" description="">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </BaseLayout>
    )
  }

  if (!contact) return null

  const initials = contact.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()

  // Merge events from direct relation + junction table, deduplicate by id
  const allEvents = (() => {
    const direct = contact.events || []
    const linked = (contact.eventContactLinks || []).map((l: any) => l.event)
    const map = new Map<number, any>()
    for (const e of [...direct, ...linked]) {
      if (e) map.set(e.id, e)
    }
    return Array.from(map.values()).sort(
      (a: any, b: any) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()
    )
  })()

  // Merge tasks from direct relation + junction table
  const allTasks = (() => {
    const direct = contact.tasks || []
    const linked = (contact.taskContactLinks || []).map((l: any) => l.task)
    const map = new Map<number, any>()
    for (const t of [...direct, ...linked]) {
      if (t) map.set(t.id, t)
    }
    return Array.from(map.values()).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  })()

  return (
    <BaseLayout title={contact.name} description="">
      <div className="px-4 lg:px-6 space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")} className="cursor-pointer mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarFallback className="bg-muted text-foreground text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{contact.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getTypeColor(contact.type)}`}>
                  {getTypeLabel(contact.type)}
                </span>
                <Badge variant="outline">{contact.status || "N/A"}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/contacts`)} className="cursor-pointer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Lista
            </Button>
          </div>
        </div>

        {/* Summary Cards Row */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm text-muted-foreground">Fatturato</div>
              <div className="text-xl font-bold">{formatCurrency(contact.totalInvoiced)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm text-muted-foreground">Incassato</div>
              <div className="text-xl font-bold">{formatCurrency(contact.totalPaid)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm text-muted-foreground">Ticket Aperti</div>
              <div className="text-xl font-bold">{contact.openTickets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-sm text-muted-foreground">Eventi Futuri</div>
              <div className="text-xl font-bold">{contact.upcomingEvents}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: 2 columns */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column: contact info */}
          <div className="space-y-6">
            {/* Riepilogo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Informazioni</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                  </div>
                )}
                {contact.mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${contact.mobile}`} className="hover:underline">{contact.mobile} (Cell)</a>
                  </div>
                )}
                {contact.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={contact.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{contact.website}</a>
                  </div>
                )}
                {(contact.address || contact.city) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      {contact.address && <div>{contact.address}</div>}
                      <div>
                        {contact.zipCode && `${contact.zipCode} `}
                        {contact.city}
                        {contact.province && ` (${contact.province})`}
                      </div>
                    </div>
                  </div>
                )}
                {(contact.partitaIva || contact.codiceFiscale) && (
                  <div className="border-t pt-3 mt-3 space-y-1">
                    {contact.partitaIva && <div><span className="text-muted-foreground">P.IVA:</span> {contact.partitaIva}</div>}
                    {contact.codiceFiscale && <div><span className="text-muted-foreground">C.F.:</span> {contact.codiceFiscale}</div>}
                  </div>
                )}

                {/* Tags */}
                {contact.tags?.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((t: any) => (
                        <Badge key={t.id} variant="outline" style={{ borderColor: t.color || undefined }}>
                          {t.tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Socials */}
                {contact.socials?.length > 0 && (
                  <div className="border-t pt-3 mt-3 space-y-1">
                    {contact.socials.map((s: any) => (
                      <div key={s.id}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-sm">
                          {s.platform}{s.username ? `: ${s.username}` : ""}
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Fields */}
                {contact.customFields?.length > 0 && (
                  <div className="border-t pt-3 mt-3 space-y-1">
                    {contact.customFields.map((f: any) => (
                      <div key={f.id}>
                        <span className="text-muted-foreground">{f.fieldName}:</span> {f.fieldValue}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {contact.notes && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Accesso Portale */}
            {contact.clientAccess && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Accesso Portale
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">Username:</span> {contact.clientAccess.username || contact.clientAccess.email}</div>
                  <div><span className="text-muted-foreground">Tipo:</span> {contact.clientAccess.accessType || "standard"}</div>
                  <div><span className="text-muted-foreground">Stato:</span>{" "}
                    <Badge variant={contact.clientAccess.isActive ? "default" : "secondary"}>
                      {contact.clientAccess.isActive ? "Attivo" : "Inattivo"}
                    </Badge>
                  </div>
                  {contact.clientAccess.lastLogin && (
                    <div><span className="text-muted-foreground">Ultimo login:</span> {formatDate(contact.clientAccess.lastLogin)}</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right columns: relations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Fatture */}
            <Section
              title="Fatture"
              icon={FileText}
              items={contact.invoices || []}
              emptyText="Nessuna fattura"
              renderItem={(inv: any, i: number) => (
                <div key={inv.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <span className="font-medium">{inv.invoiceNumber || `#${inv.id}`}</span>
                    <span className="text-muted-foreground ml-2">{formatDate(inv.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{inv.status || "N/A"}</Badge>
                    <span className="font-medium">{formatCurrency(inv.total || 0)}</span>
                  </div>
                </div>
              )}
            />

            {/* Preventivi */}
            <Section
              title="Preventivi"
              icon={FileText}
              items={contact.quotes || []}
              emptyText="Nessun preventivo"
              renderItem={(q: any, i: number) => (
                <div key={q.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <span className="font-medium">{q.quoteNumber || `#${q.id}`}</span>
                    <span className="text-muted-foreground ml-2">{formatDate(q.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{q.status || "N/A"}</Badge>
                    <span className="font-medium">{formatCurrency(q.total || 0)}</span>
                  </div>
                </div>
              )}
            />

            {/* Transazioni */}
            <Section
              title="Transazioni"
              icon={Euro}
              items={contact.transactions || []}
              emptyText="Nessuna transazione"
              renderItem={(t: any, i: number) => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <span className="font-medium">{t.description || t.type}</span>
                    <span className="text-muted-foreground ml-2">{formatDate(t.date || t.createdAt)}</span>
                  </div>
                  <span className={`font-medium ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount || 0)}
                  </span>
                </div>
              )}
            />

            {/* Task */}
            <Section
              title="Task"
              icon={CheckSquare}
              items={allTasks}
              emptyText="Nessun task"
              renderItem={(t: any, i: number) => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <span className="font-medium">{t.title || t.name}</span>
                  <Badge variant="outline">{t.status || "N/A"}</Badge>
                </div>
              )}
            />

            {/* Eventi */}
            <Section
              title="Eventi"
              icon={Calendar}
              items={allEvents}
              emptyText="Nessun evento"
              renderItem={(e: any, i: number) => (
                <div key={e.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <span className="font-medium">{e.title || e.name}</span>
                    <span className="text-muted-foreground ml-2">{formatDate(e.startDateTime)}</span>
                  </div>
                  {e.category && <Badge variant="outline">{e.category}</Badge>}
                </div>
              )}
            />

            {/* Ticket */}
            <Section
              title="Ticket"
              icon={Ticket}
              items={contact.tickets || []}
              emptyText="Nessun ticket"
              renderItem={(t: any, i: number) => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <span className="font-medium">{t.subject || t.title}</span>
                  <div className="flex items-center gap-2">
                    {t.priority && <Badge variant="outline">{t.priority}</Badge>}
                    <Badge variant="outline">{t.status || "N/A"}</Badge>
                  </div>
                </div>
              )}
            />

            {/* Progetti */}
            <Section
              title="Progetti"
              icon={FolderOpen}
              items={contact.projects || []}
              emptyText="Nessun progetto"
              renderItem={(p: any, i: number) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <span className="font-medium">{p.name || p.title}</span>
                  <Badge variant="outline">{p.status || "N/A"}</Badge>
                </div>
              )}
            />

            {/* Fatture Ricorrenti */}
            {(contact.recurringInvoices || []).length > 0 && (
              <Section
                title="Fatture Ricorrenti"
                icon={RefreshCw}
                items={contact.recurringInvoices}
                emptyText=""
                renderItem={(r: any, i: number) => (
                  <div key={r.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <span className="font-medium">{r.description || `#${r.id}`}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{r.frequency || "N/A"}</Badge>
                      <span className="font-medium">{formatCurrency(r.amount || 0)}</span>
                    </div>
                  </div>
                )}
              />
            )}
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
