"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { CalendarDays, Plus, Trash2, Globe, Loader2, Info } from "lucide-react"
import { socialAPI } from "@/lib/social-api"
import { toast } from "sonner"
import { format } from "date-fns"
import { it } from "date-fns/locale"

interface ContextEvent {
  id: number
  contactId: number | null
  title: string
  description: string | null
  category: string
  startDate: string
  endDate: string | null
  isActive: boolean
}

const CATEGORY_LABEL: Record<string, string> = {
  contesto: "Contesto",
  stagionale: "Stagionale",
  evento_locale: "Evento locale",
  festività: "Festività",
}

export function ContextEventsCard({ contactId }: { contactId: number }) {
  const [events, setEvents] = useState<ContextEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("evento_locale")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isGlobal, setIsGlobal] = useState(false)

  const fetchEvents = () => {
    setLoading(true)
    socialAPI.getContextEvents(contactId)
      .then(r => setEvents(r.data))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [contactId])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  function fetchData() { fetchEvents() }

  const openCreate = () => {
    setTitle(""); setDescription(""); setCategory("evento_locale");
    setStartDate(""); setEndDate(""); setIsGlobal(false);
    setShowDialog(true)
  }

  const handleCreate = async () => {
    if (!title.trim() || !startDate) { toast.error("Inserisci titolo e data di inizio"); return }
    setSaving(true)
    try {
      await socialAPI.createContextEvent({
        title: title.trim(),
        description: description.trim(),
        category,
        startDate,
        endDate: endDate || undefined,
        contactId: isGlobal ? null : contactId,
      })
      toast.success("Evento contesto aggiunto")
      setShowDialog(false)
      fetchEvents()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleToggleActive = async (e: ContextEvent) => {
    try {
      await socialAPI.updateContextEvent(e.id, { isActive: !e.isActive })
      fetchEvents()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDelete = async (e: ContextEvent) => {
    try {
      await socialAPI.deleteContextEvent(e.id)
      toast.success("Evento eliminato")
      fetchEvents()
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Contesti &amp; Eventi</CardTitle>
            <CardDescription className="mt-1">Eventi locali, stagioni e festività che aiutano l'AI a scrivere contenuti coerenti col periodo</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Aggiungi</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nessun evento contesto. Aggiungi eventi locali (sagre, fiere, mercatini) o periodi speciali per aiutare l'AI.
          </p>
        ) : (
          events.map(e => (
            <div key={e.id} className={`flex items-start gap-3 rounded-lg border p-3 ${e.isActive ? "" : "opacity-50"}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{e.title}</span>
                  <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABEL[e.category] || e.category}</Badge>
                  {e.contactId === null && <Badge variant="outline" className="text-[10px] gap-1"><Globe className="h-2.5 w-2.5" /> Globale</Badge>}
                </div>
                {e.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(e.startDate), "dd MMM yyyy", { locale: it })}
                  {e.endDate ? ` → ${format(new Date(e.endDate), "dd MMM yyyy", { locale: it })}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch checked={e.isActive} onCheckedChange={() => handleToggleActive(e)} />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(e)} title="Elimina">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
        <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1"><Info className="h-3 w-3" /> L'AI usa automaticamente stagione e festività vicine (Natale, Pasqua, Ferragosto…). Gli eventi qui aggiunti arricchiscono quel contesto.</p>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo evento contesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Titolo *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder='Es: "Sagra della Valpolicella"' />
            </div>
            <div className="space-y-1.5">
              <Label>Descrizione</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder='Es: "festa locale con degustazione vini e prodotti tipici, affluenza di famiglie"' />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                  <option value="evento_locale">Evento locale</option>
                  <option value="stagionale">Stagionale</option>
                  <option value="festività">Festività</option>
                  <option value="contesto">Contesto</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Visibilità</Label>
                <div className="flex items-center gap-2 h-9">
                  <Switch checked={isGlobal} onCheckedChange={setIsGlobal} />
                  <span className="text-xs">{isGlobal ? "Globale (tutti i clienti)" : "Solo questo cliente"}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data inizio *</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data fine</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
