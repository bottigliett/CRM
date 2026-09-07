import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Settings2, User, Apple, Link2, RefreshCw, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { eventsAPI, type EventCategory, type CreateEventCategoryData } from "@/lib/events-api"
import { usersAPI, type CalendarPreferences } from "@/lib/users-api"

const colorOptions = [
  { value: "#fe4303", label: "Rosso" },
  { value: "#8b5cf6", label: "Viola" },
  { value: "#f59e0b", label: "Arancione" },
  { value: "#ffdb59", label: "Giallo" },
  { value: "#b40450", label: "Rosa" },
  { value: "#1b8eff", label: "Blu" },
  { value: "#6b7280", label: "Grigio" },
  { value: "#3b82f6", label: "Azzurro" },
  { value: "#3bf7b8", label: "Verde Acqua" },
  { value: "#22c55e", label: "Verde" },
  { value: "#ef4444", label: "Rosso Scuro" },
  { value: "#ec4899", label: "Fucsia" },
]

export default function CalendarSettingsPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null)
  const [formData, setFormData] = useState<CreateEventCategoryData>({
    name: "",
    color: "#3b82f6",
    isActive: true
  })

  // User preferences state
  const [userPreferences, setUserPreferences] = useState({
    defaultView: "month",
    defaultStartHour: 7,
    defaultEndHour: 22,
    favoriteCategories: [] as number[],
    showWeekends: true,
    defaultEventDuration: 60,
    hideSidebar: false
  })

  // Apple Calendar sync state
  const [syncToken, setSyncToken] = useState<string | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [categoryFeedId, setCategoryFeedId] = useState<string>("")
  const [categoryCopied, setCategoryCopied] = useState(false)

  useEffect(() => {
    loadCategories()
    loadUserPreferences()
    loadSyncToken()
  }, [])

  const loadSyncToken = async () => {
    try {
      const res = await eventsAPI.getCalendarSyncInfo()
      setSyncToken(res.data.token)
    } catch (error: any) {
      console.error("Errore nel caricamento token sync:", error)
    }
  }

  const handleRegenerateToken = async () => {
    try {
      setSyncLoading(true)
      const res = await eventsAPI.regenerateCalendarToken()
      setSyncToken(res.data.token)
      toast.success("Link rigenerato", {
        description: "Ricorda di aggiornare l'iscrizione su Calendario con il nuovo link"
      })
    } catch (error: any) {
      toast.error("Errore", { description: error.message || "Impossibile rigenerare il link" })
    } finally {
      setSyncLoading(false)
    }
  }

  const feedUrl = syncToken ? `${window.location.origin}/api/calendar/feed.ics?token=${syncToken}` : ""
  const categoryFeedUrl = syncToken && categoryFeedId
    ? `${window.location.origin}/api/calendar/feed.ics?token=${syncToken}&categoryId=${categoryFeedId}`
    : ""

  const handleCopy = async () => {
    if (!feedUrl) return
    try {
      await navigator.clipboard.writeText(feedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Copia non riuscita", { description: "Seleziona e copia il link manualmente" })
    }
  }

  const handleCopyCategory = async () => {
    if (!categoryFeedUrl) return
    try {
      await navigator.clipboard.writeText(categoryFeedUrl)
      setCategoryCopied(true)
      setTimeout(() => setCategoryCopied(false), 2000)
    } catch {
      toast.error("Copia non riuscita", { description: "Seleziona e copia il link manualmente" })
    }
  }

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await eventsAPI.getEventCategories(true)
      setCategories(response.data)
    } catch (error) {
      console.error("Errore nel caricamento categorie:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserPreferences = async () => {
    try {
      const response = await usersAPI.getCalendarPreferences()
      if (response.success && response.data) {
        setUserPreferences({
          defaultView: response.data.defaultView || "month",
          defaultStartHour: response.data.defaultStartHour ?? 7,
          defaultEndHour: response.data.defaultEndHour ?? 22,
          favoriteCategories: response.data.favoriteCategories || [],
          showWeekends: response.data.showWeekends ?? true,
          defaultEventDuration: response.data.defaultEventDuration || 60,
          hideSidebar: response.data.hideSidebar ?? false
        })
      }
    } catch (error) {
      console.error("Errore nel caricamento preferenze:", error)
      // Fallback to localStorage if API fails
      const saved = localStorage.getItem('calendar-user-preferences')
      if (saved) {
        setUserPreferences(JSON.parse(saved))
      }
    }
  }

  const saveUserPreferences = async () => {
    try {
      await usersAPI.updateCalendarPreferences(userPreferences)
      // Also save to localStorage as backup
      localStorage.setItem('calendar-user-preferences', JSON.stringify(userPreferences))
      toast.success("Preferenze salvate con successo!", {
        description: "Le tue impostazioni sono state aggiornate"
      })
    } catch (error: any) {
      console.error("Errore nel salvataggio:", error)
      toast.error("Errore nel salvataggio", {
        description: error.message || "Si è verificato un errore. Riprova più tardi."
      })
    }
  }

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error("Nome obbligatorio", {
          description: "Inserisci un nome per la categoria"
        })
        return
      }

      if (editingCategory) {
        await eventsAPI.updateEventCategory(editingCategory.id, formData)
        toast.success("Categoria aggiornata!", {
          description: `La categoria "${formData.name}" è stata modificata`
        })
      } else {
        await eventsAPI.createEventCategory(formData)
        toast.success("Categoria creata!", {
          description: `La categoria "${formData.name}" è stata aggiunta`
        })
      }

      await loadCategories()
      setShowDialog(false)
      resetForm()
    } catch (error: any) {
      console.error("Errore nel salvataggio:", error)
      toast.error("Errore nel salvataggio", {
        description: error.message || "Si è verificato un errore"
      })
    }
  }

  const handleDelete = async (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId)

    // Create a confirmation toast instead of using browser confirm
    toast.warning(`Eliminare "${category?.name}"?`, {
      description: "Tutti gli eventi associati perderanno la categoria",
      action: {
        label: "Elimina",
        onClick: async () => {
          try {
            await eventsAPI.deleteEventCategory(categoryId)
            await loadCategories()
            toast.success("Categoria eliminata", {
              description: `La categoria "${category?.name}" è stata rimossa`
            })
          } catch (error: any) {
            console.error("Errore nell'eliminazione:", error)
            toast.error("Errore nell'eliminazione", {
              description: error.message || "Si è verificato un errore"
            })
          }
        }
      },
      cancel: {
        label: "Annulla",
        onClick: () => {}
      }
    })
  }

  const handleEdit = (category: EventCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      color: category.color,
      isActive: category.isActive
    })
    setShowDialog(true)
  }

  const handleNew = () => {
    resetForm()
    setShowDialog(true)
  }

  const resetForm = () => {
    setEditingCategory(null)
    setFormData({
      name: "",
      color: "#3b82f6",
      isActive: true
    })
  }

  const toggleFavoriteCategory = (categoryId: number) => {
    setUserPreferences(prev => ({
      ...prev,
      favoriteCategories: prev.favoriteCategories.includes(categoryId)
        ? prev.favoriteCategories.filter(id => id !== categoryId)
        : [...prev.favoriteCategories, categoryId]
    }))
  }

  return (
    <BaseLayout
      title="Impostazioni Calendario"
      description="Gestisci categorie ed preferenze personali"
    >
      <div className="w-full h-full p-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/calendar")}
            className="cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna al Calendario
          </Button>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="categories" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Categorie
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <User className="w-4 h-4" />
              Preferenze Utente
            </TabsTrigger>
            <TabsTrigger value="sync" className="gap-2">
              <Apple className="w-4 h-4" />
              Apple Calendar
            </TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleNew} className="cursor-pointer">
                <Plus className="w-4 h-4 mr-2" />
                Nuova Categoria
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Caricamento...
                </div>
              ) : categories.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  Nessuna categoria trovata. Creane una per iniziare.
                </div>
              ) : (
                categories.map((category) => (
                  <Card key={category.id} className="relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: category.color }}
                    />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <CardTitle className="text-base">{category.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(category.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {category._count?.events || 0} eventi
                        </span>
                        {!category.isActive && (
                          <Badge variant="secondary" className="text-xs">Disattivata</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* User Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferenze Visualizzazione</CardTitle>
                <CardDescription>
                  Personalizza come vuoi vedere il tuo calendario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="default-view">Vista Predefinita</Label>
                    <Select
                      value={userPreferences.defaultView}
                      onValueChange={(value) => setUserPreferences({ ...userPreferences, defaultView: value })}
                    >
                      <SelectTrigger id="default-view">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Mese</SelectItem>
                        <SelectItem value="week">Settimana</SelectItem>
                        <SelectItem value="workWeek">Settimana Lavorativa</SelectItem>
                        <SelectItem value="day">Giorno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-duration">Durata Evento Predefinita</Label>
                    <Select
                      value={userPreferences.defaultEventDuration.toString()}
                      onValueChange={(value) => setUserPreferences({ ...userPreferences, defaultEventDuration: parseInt(value) })}
                    >
                      <SelectTrigger id="default-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minuti</SelectItem>
                        <SelectItem value="30">30 minuti</SelectItem>
                        <SelectItem value="60">1 ora</SelectItem>
                        <SelectItem value="90">1.5 ore</SelectItem>
                        <SelectItem value="120">2 ore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start-hour">Ora Inizio Visualizzazione</Label>
                    <Select
                      value={userPreferences.defaultStartHour.toString()}
                      onValueChange={(value) => setUserPreferences({ ...userPreferences, defaultStartHour: parseInt(value) })}
                    >
                      <SelectTrigger id="start-hour">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, '0')}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-hour">Ora Fine Visualizzazione</Label>
                    <Select
                      value={userPreferences.defaultEndHour.toString()}
                      onValueChange={(value) => setUserPreferences({ ...userPreferences, defaultEndHour: parseInt(value) })}
                    >
                      <SelectTrigger id="end-hour">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, '0')}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-weekends">Mostra Weekend</Label>
                    <p className="text-sm text-muted-foreground">
                      Visualizza sabato e domenica nella vista settimanale
                    </p>
                  </div>
                  <Switch
                    id="show-weekends"
                    checked={userPreferences.showWeekends}
                    onCheckedChange={(checked) => setUserPreferences({ ...userPreferences, showWeekends: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="hide-sidebar">Nascondi Barra Laterale</Label>
                    <p className="text-sm text-muted-foreground">
                      Nascondi la sidebar con calendario e categorie
                    </p>
                  </div>
                  <Switch
                    id="hide-sidebar"
                    checked={userPreferences.hideSidebar}
                    onCheckedChange={(checked) => setUserPreferences({ ...userPreferences, hideSidebar: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categorie Preferite</CardTitle>
                <CardDescription>
                  Seleziona le categorie che usi più spesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Caricamento...
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nessuna categoria disponibile
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-medium">{category.name}</span>
                        </div>
                        <Switch
                          checked={userPreferences.favoriteCategories.includes(category.id)}
                          onCheckedChange={() => toggleFavoriteCategory(category.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveUserPreferences} className="cursor-pointer">
                <Save className="w-4 h-4 mr-2" />
                Salva Preferenze
              </Button>
            </div>
          </TabsContent>

          {/* Apple Calendar sync tab */}
          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Apple className="w-5 h-5" />
                  Sincronizza con Calendario (Mac / iPhone)
                </CardTitle>
                <CardDescription>
                  Gli eventi dell'agenda compaiono in automatico sul tuo Calendario Apple.
                  Aggiorni solo il CRM: il calendario si aggiorna da solo a ogni refresh.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Copia il link qui sotto.</li>
                  <li>Su Mac apri <strong>Calendario</strong> → <strong>File</strong> → <strong>Nuova iscrizione calendario…</strong>.</li>
                  <li>Incolla il link e conferma. Scegli la frequenza di aggiornamento (es. ogni ora).</li>
                  <li>Su iPhone: <strong>Impostazioni → Calendario → Account → Aggiungi account → Altro → Aggiungi calendario iscritto</strong> e incolla lo stesso link.</li>
                </ol>

                {syncToken ? (
                  <div className="space-y-2">
                    <Label>Link di iscrizione</Label>
                    <div className="flex items-center gap-2">
                      <Input value={feedUrl} readOnly className="font-mono text-xs" />
                      <Button onClick={handleCopy} variant="outline" className="shrink-0 cursor-pointer">
                        {copied ? <Check className="w-4 h-4 mr-1 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1" />}
                        {copied ? "Copiato" : "Copia"}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">
                        Il link è privato: chi lo possiede può vedere la tua agenda. Non condividerlo.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRegenerateToken}
                        disabled={syncLoading}
                        className="cursor-pointer text-muted-foreground"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Rigenera link
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link2 className="w-4 h-4" />
                    Caricamento link…
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Apple className="w-5 h-5" />
                  Calendario separato per categoria
                </CardTitle>
                <CardDescription>
                  Vuoi vedere una sola categoria (es. "Video") su un calendario Apple a parte, con un
                  colore diverso? Scegli la categoria e iscriviti con questo secondo link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={categoryFeedId} onValueChange={setCategoryFeedId}>
                    <SelectTrigger className="w-full max-w-sm">
                      <SelectValue placeholder="Seleziona una categoria…" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {categoryFeedId && (
                  <div className="space-y-2">
                    <Label>Link del calendario "{categories.find(c => String(c.id) === categoryFeedId)?.name || ""}"</Label>
                    <div className="flex items-center gap-2">
                      <Input value={categoryFeedUrl} readOnly className="font-mono text-xs" />
                      <Button onClick={handleCopyCategory} variant="outline" className="shrink-0 cursor-pointer">
                        {categoryCopied ? <Check className="w-4 h-4 mr-1 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1" />}
                        {categoryCopied ? "Copiato" : "Copia"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aggiungilo su Calendario come <strong>seconda iscrizione</strong> e assegnagli un colore
                      diverso (tasto destro sul calendario → Colore).
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog per creare/modificare categoria */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Modifica Categoria" : "Nuova Categoria"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Modifica i dettagli della categoria"
                : "Crea una nuova categoria per i tuoi eventi"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Es. Riunioni, Appuntamenti, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Colore</Label>
              <div className="grid grid-cols-6 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-10 h-10 rounded-md border-2 transition-all cursor-pointer ${
                      formData.color === color.value
                        ? "border-primary scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="is-active">Categoria Attiva</Label>
                <p className="text-xs text-muted-foreground">
                  Le categorie disattivate non sono selezionabili
                </p>
              </div>
              <Switch
                id="is-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false)
                resetForm()
              }}
              className="cursor-pointer"
            >
              Annulla
            </Button>
            <Button onClick={handleSave} className="cursor-pointer">
              <Save className="w-4 h-4 mr-2" />
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
