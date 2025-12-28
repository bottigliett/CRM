"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, Clock, MapPin, Type, Tag, UserCircle, Star, Search, X, Bell, Mail } from "lucide-react"
import { format } from "date-fns"
import { it } from 'date-fns/locale'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { type CalendarEvent } from "../types"
import { eventsAPI, type EventCategory } from "@/lib/events-api"
import { usersAPI, type User, type CalendarPreferences } from "@/lib/users-api"
import { contactsAPI, type Contact } from "@/lib/contacts-api"
import { toast } from "sonner"

interface EventFormProps {
  event?: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (event: Partial<CalendarEvent>) => void
  onDelete?: (eventId: number) => void
}

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minutes = i % 2 === 0 ? '00' : '30'
  return `${hour.toString().padStart(2, '0')}:${minutes}`
})

const durationOptions = [
  { value: "15", label: "15 minuti" },
  { value: "30", label: "30 minuti" },
  { value: "45", label: "45 minuti" },
  { value: "60", label: "1 ora" },
  { value: "90", label: "1.5 ore" },
  { value: "120", label: "2 ore" },
  { value: "180", label: "3 ore" },
  { value: "240", label: "4 ore" },
  { value: "custom", label: "Personalizzata..." },
]

export function EventForm({ event, open, onOpenChange, onSave, onDelete }: EventFormProps) {
  const [formData, setFormData] = useState({
    title: event?.title || "",
    date: event?.date || new Date(),
    endDate: event?.date || new Date(),
    time: event?.time || "09:00",
    duration: event?.duration || "60 min",
    categoryId: undefined as number | undefined,
    assignedTo: undefined as number | undefined,
    contactId: undefined as number | undefined,
    location: event?.location || "",
    description: event?.description || "",
    color: event?.color || "#3b82f6",
    allDay: event?.allDay || false,
    reminderEnabled: false,
    reminderType: "MINUTES_15" as "MINUTES_15" | "MINUTES_30" | "HOUR_1" | "DAY_1",
    reminderEmail: false
  })

  const [showCalendar, setShowCalendar] = useState(false)
  const [showEndCalendar, setShowEndCalendar] = useState(false)
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [adminUsers, setAdminUsers] = useState<User[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [customDuration, setCustomDuration] = useState("")
  const [showCustomDuration, setShowCustomDuration] = useState(false)
  const [favoriteCategories, setFavoriteCategories] = useState<number[]>([])
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all')

  // Update form data when event prop changes
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || "",
        date: event.date || new Date(),
        endDate: event.date || new Date(),
        time: event.time || "09:00",
        duration: event.duration || "60 min",
        categoryId: event.categoryId,
        assignedTo: event.assignedTo,
        contactId: event.contactId,
        location: event.location || "",
        description: event.description || "",
        color: event.color || "#3b82f6",
        allDay: event.allDay || false,
        reminderEnabled: false,
        reminderType: "MINUTES_15",
        reminderEmail: false
      })
    } else {
      // Reset for new event
      setFormData({
        title: "",
        date: new Date(),
        endDate: new Date(),
        time: "09:00",
        duration: "60 min",
        categoryId: undefined,
        assignedTo: undefined,
        contactId: undefined,
        location: "",
        description: "",
        color: "#3b82f6",
        allDay: false,
        reminderEnabled: false,
        reminderType: "MINUTES_15",
        reminderEmail: false
      })
    }
  }, [event, open])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [categoriesResponse, usersResponse, contactsResponse, preferencesResponse] = await Promise.all([
          eventsAPI.getEventCategories(),
          usersAPI.getAdminUsers(),
          contactsAPI.getContacts({ limit: 1000 }), // Get all contacts
          usersAPI.getCalendarPreferences().catch(() => {
            // Fallback to localStorage if API fails
            const savedPrefs = localStorage.getItem('calendar-user-preferences')
            return savedPrefs ? { success: true, data: JSON.parse(savedPrefs) } : { success: false, data: {} }
          })
        ])
        setCategories(categoriesResponse.data)
        setAdminUsers(usersResponse.data.users)
        setContacts(contactsResponse.data.contacts)
        setFavoriteCategories(preferencesResponse.data.favoriteCategories || [])
      } catch (error) {
        console.error('Errore nel caricamento dati:', error)
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      loadData()
    }
  }, [open])

  const handleSave = () => {
    // Validation
    if (!formData.title.trim()) {
      toast.error("Il titolo è obbligatorio")
      return
    }

    if (!formData.assignedTo) {
      toast.error("Il responsabile è obbligatorio")
      return
    }

    const selectedCategory = categories.find(c => c.id === formData.categoryId)
    const eventData: Partial<CalendarEvent> = {
      ...formData,
      ...(event?.id && { id: event.id }),
      color: selectedCategory?.color || formData.color
    }
    onSave(eventData)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (event?.id && onDelete) {
      onDelete(event.id)
      onOpenChange(false)
    }
  }

  const handleDurationChange = (value: string) => {
    if (value === "custom") {
      setShowCustomDuration(true)
    } else {
      setShowCustomDuration(false)
      setFormData(prev => ({ ...prev, duration: `${value} min` }))
    }
  }

  const handleCustomDurationSave = () => {
    const minutes = parseInt(customDuration)
    if (isNaN(minutes) || minutes <= 0) {
      toast.error("Inserisci un numero valido di minuti")
      return
    }
    setFormData(prev => ({ ...prev, duration: `${minutes} min` }))
    setShowCustomDuration(false)
    setCustomDuration("")
  }

  const selectedCategory = categories.find(c => c.id === formData.categoryId)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full")} style={{ backgroundColor: selectedCategory?.color || formData.color }} />
            {event ? "Modifica Evento" : "Nuovo Evento"}
          </DialogTitle>
          <DialogDescription>
            {event ? "Modifica le informazioni dell'evento" : "Aggiungi un nuovo evento al calendario"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Titolo */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Titolo *
            </Label>
            <Input
              id="title"
              placeholder="Inserisci il titolo dell'evento..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="text-lg font-medium"
            />
          </div>

          {/* Categoria e Responsabile */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categoria
              </Label>
              <Select
                value={formData.categoryId?.toString()}
                onValueChange={(value) => {
                  const categoryId = parseInt(value)
                  const category = categories.find(c => c.id === categoryId)
                  setFormData(prev => ({
                    ...prev,
                    categoryId,
                    color: category?.color || prev.color
                  }))
                }}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .sort((a, b) => {
                      const aIsFavorite = favoriteCategories.includes(a.id)
                      const bIsFavorite = favoriteCategories.includes(b.id)
                      if (aIsFavorite && !bIsFavorite) return -1
                      if (!aIsFavorite && bIsFavorite) return 1
                      return a.name.localeCompare(b.name)
                    })
                    .map(category => {
                      const isFavorite = favoriteCategories.includes(category.id)
                      return (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                            {category.name}
                            {isFavorite && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 ml-auto" />}
                          </div>
                        </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                Responsabile *
              </Label>
              <Select
                value={formData.assignedTo?.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: parseInt(value) }))}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona responsabile" />
                </SelectTrigger>
                <SelectContent>
                  {adminUsers.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-[10px]">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {user.firstName} {user.lastName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                Cliente
              </Label>
              <div className="space-y-2">
                {formData.contactId ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <div className="flex-1">
                      <div className="font-medium">
                        {contacts.find(c => c.id === formData.contactId)?.name || 'Cliente selezionato'}
                      </div>
                      {contacts.find(c => c.id === formData.contactId)?.email && (
                        <div className="text-sm text-muted-foreground">
                          {contacts.find(c => c.id === formData.contactId)?.email}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData(prev => ({ ...prev, contactId: undefined }))}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowClientSearch(true)}
                    className="w-full justify-start cursor-pointer"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Cerca nell'Anagrafica
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tutto il giorno */}
          <div className="flex items-center space-x-2">
            <Switch
              id="all-day"
              checked={formData.allDay}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allDay: checked }))}
            />
            <Label htmlFor="all-day" className="text-sm font-medium cursor-pointer">
              Tutto il giorno
            </Label>
          </div>

          {/* Date - Condizionale in base a "Tutto il giorno" */}
          {formData.allDay ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Data Inizio *
                </Label>
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {format(formData.date, "PPP", { locale: it })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => {
                        if (date) {
                          setFormData(prev => ({ ...prev, date }))
                          setShowCalendar(false)
                        }
                      }}
                      initialFocus
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Data Fine *
                </Label>
                <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {format(formData.endDate, "PPP", { locale: it })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => {
                        if (date) {
                          setFormData(prev => ({ ...prev, endDate: date }))
                          setShowEndCalendar(false)
                        }
                      }}
                      disabled={(date) => date < formData.date}
                      initialFocus
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <>
              {/* Data e Ora per eventi non "Tutto il giorno" */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Data *
                </Label>
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {format(formData.date, "PPP", { locale: it })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => {
                        if (date) {
                          setFormData(prev => ({ ...prev, date }))
                          setShowCalendar(false)
                        }
                      }}
                      initialFocus
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Ora di inizio *
                  </Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Ora di fine *
                  </Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={(() => {
                      const [hours, minutes] = formData.time.split(':').map(Number)
                      const durationMinutes = parseInt(formData.duration.replace(' min', '')) || 60
                      const endMinutes = hours * 60 + minutes + durationMinutes
                      const endHours = Math.floor(endMinutes / 60) % 24
                      const endMins = endMinutes % 60
                      return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
                    })()}
                    onChange={(e) => {
                      // Calculate duration from start and end time
                      const [startHours, startMinutes] = formData.time.split(':').map(Number)
                      const [endHours, endMinutes] = e.target.value.split(':').map(Number)
                      const startTotalMinutes = startHours * 60 + startMinutes
                      const endTotalMinutes = endHours * 60 + endMinutes
                      let duration = endTotalMinutes - startTotalMinutes

                      // Handle overnight events
                      if (duration < 0) {
                        duration += 24 * 60
                      }

                      setFormData(prev => ({ ...prev, duration: `${duration} min` }))
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            </>
          )}

          {/* Luogo */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Luogo
            </Label>
            <Input
              id="location"
              placeholder="Aggiungi un luogo..."
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              placeholder="Aggiungi una descrizione..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Promemoria */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="reminder-enabled" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Bell className="w-4 h-4" />
                Promemoria
              </Label>
              <Switch
                id="reminder-enabled"
                checked={formData.reminderEnabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reminderEnabled: checked }))}
              />
            </div>

            {formData.reminderEnabled && (
              <div className="space-y-4 pl-6 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label className="text-sm">Quando ricevere il promemoria</Label>
                  <Select
                    value={formData.reminderType || "MINUTES_15"}
                    onValueChange={(value: "MINUTES_15" | "MINUTES_30" | "HOUR_1" | "DAY_1") =>
                      setFormData(prev => ({ ...prev, reminderType: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona quando ricevere il promemoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MINUTES_15">15 minuti prima</SelectItem>
                      <SelectItem value="MINUTES_30">30 minuti prima</SelectItem>
                      <SelectItem value="HOUR_1">1 ora prima</SelectItem>
                      <SelectItem value="DAY_1">1 giorno prima</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder-email" className="flex items-center gap-2 text-sm cursor-pointer">
                    <Mail className="w-4 h-4" />
                    Invia anche via email
                  </Label>
                  <Switch
                    id="reminder-email"
                    checked={formData.reminderEmail}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reminderEmail: checked }))}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Riceverai una notifica {formData.reminderType === "MINUTES_15" ? "15 minuti" : formData.reminderType === "MINUTES_30" ? "30 minuti" : formData.reminderType === "HOUR_1" ? "1 ora" : "1 giorno"} prima dell'evento{formData.reminderEmail ? " via email e" : ""} nel centro notifiche.
                </p>
              </div>
            )}
          </div>

          {/* Azioni */}
          <div className="flex gap-3 pt-6">
            <Button
              onClick={handleSave}
              className="flex-1 cursor-pointer"
              disabled={!formData.title || !formData.assignedTo}
            >
              {event ? "Aggiorna Evento" : "Crea Evento"}
            </Button>
            {event && onDelete && (
              <Button onClick={handleDelete} variant="destructive" className="cursor-pointer">
                Elimina
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)} variant="outline" className="cursor-pointer">
              Annulla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Client Search Dialog */}
    <Dialog open={showClientSearch} onOpenChange={setShowClientSearch}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Seleziona Cliente dall'Anagrafica</DialogTitle>
          <DialogDescription>
            Cerca e seleziona un cliente esistente dall'elenco
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, email o P.IVA..."
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="CLIENT">Clienti</SelectItem>
                <SelectItem value="PROSPECT">Prospect</SelectItem>
                <SelectItem value="COLLABORATION">Collaborazioni</SelectItem>
                <SelectItem value="USEFUL_CONTACT">Contatti Utili</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results List */}
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              {contacts
                .filter(contact => clientTypeFilter === 'all' || contact.type === clientTypeFilter)
                .filter(contact => {
                  if (!clientSearchQuery) return true
                  const query = clientSearchQuery.toLowerCase()
                  return (
                    contact.name.toLowerCase().includes(query) ||
                    contact.email?.toLowerCase().includes(query) ||
                    contact.partitaIva?.toLowerCase().includes(query) ||
                    contact.phone?.includes(query) ||
                    contact.mobile?.includes(query)
                  )
                })
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(contact => (
                  <div
                    key={contact.id}
                    className={cn(
                      "p-4 hover:bg-muted cursor-pointer transition-colors",
                      formData.contactId === contact.id && "bg-muted"
                    )}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, contactId: contact.id }))
                      setShowClientSearch(false)
                      setClientSearchQuery("")
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{contact.name}</h4>
                          {formData.contactId === contact.id && (
                            <Badge variant="default" className="text-xs">Selezionato</Badge>
                          )}
                        </div>
                        <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                          {contact.email && <div>Email: {contact.email}</div>}
                          {contact.partitaIva && <div>P.IVA: {contact.partitaIva}</div>}
                          {contact.address && <div>Indirizzo: {contact.address}</div>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contact.type === 'CLIENT' && 'Cliente'}
                        {contact.type === 'PROSPECT' && 'Prospect'}
                        {contact.type === 'COLLABORATION' && 'Collaborazione'}
                        {contact.type === 'USEFUL_CONTACT' && 'Contatto Utile'}
                      </div>
                    </div>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nessun contatto trovato
                  </div>
                )}
                {contacts.length > 0 && contacts
                  .filter(contact => clientTypeFilter === 'all' || contact.type === clientTypeFilter)
                  .filter(contact => {
                    if (!clientSearchQuery) return true
                    const query = clientSearchQuery.toLowerCase()
                    return (
                      contact.name.toLowerCase().includes(query) ||
                      contact.email?.toLowerCase().includes(query) ||
                      contact.partitaIva?.toLowerCase().includes(query) ||
                      contact.phone?.includes(query) ||
                      contact.mobile?.includes(query)
                    )
                  }).length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      Nessun risultato trovato
                    </div>
                  )}
              </div>
            {/* Results Count */}
            {contacts.length > 0 && (
              <div className="text-sm text-muted-foreground text-center p-2">
                {contacts.filter(contact => clientTypeFilter === 'all' || contact.type === clientTypeFilter)
                  .filter(contact => {
                    if (!clientSearchQuery) return true
                    const query = clientSearchQuery.toLowerCase()
                    return (
                      contact.name.toLowerCase().includes(query) ||
                      contact.email?.toLowerCase().includes(query) ||
                      contact.partitaIva?.toLowerCase().includes(query) ||
                      contact.phone?.includes(query) ||
                      contact.mobile?.includes(query)
                    )
                  }).length} {contacts.filter(contact => clientTypeFilter === 'all' || contact.type === clientTypeFilter)
                  .filter(contact => {
                    if (!clientSearchQuery) return true
                    const query = clientSearchQuery.toLowerCase()
                    return (
                      contact.name.toLowerCase().includes(query) ||
                      contact.email?.toLowerCase().includes(query) ||
                      contact.partitaIva?.toLowerCase().includes(query) ||
                      contact.phone?.includes(query) ||
                      contact.mobile?.includes(query)
                    )
                  }).length === 1 ? 'contatto trovato' : 'contatti trovati'}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowClientSearch(false)
                setClientSearchQuery("")
              }}
              className="cursor-pointer"
            >
              Chiudi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
  )
}
