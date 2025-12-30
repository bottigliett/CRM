"use client"

import { useState, useCallback, useEffect } from "react"
import { type CalendarEvent, type CalendarView } from "./types"
import { eventsAPI, type Event as APIEvent } from "@/lib/events-api"
import { format, startOfMonth, endOfMonth } from "date-fns"

export interface UseCalendarState {
  selectedDate: Date
  showEventForm: boolean
  showEventPreview: boolean
  editingEvent: CalendarEvent | null
  previewEvent: CalendarEvent | null
  showCalendarSheet: boolean
  events: CalendarEvent[]
  isLoading: boolean
  currentView: CalendarView
  hiddenCategories: Set<number>
}

export interface UseCalendarActions {
  setSelectedDate: (date: Date) => void
  setShowEventForm: (show: boolean) => void
  setShowEventPreview: (show: boolean) => void
  setEditingEvent: (event: CalendarEvent | null) => void
  setPreviewEvent: (event: CalendarEvent | null) => void
  setShowCalendarSheet: (show: boolean) => void
  setCurrentView: (view: CalendarView) => void
  handleDateSelect: (date: Date) => void
  handleNewEvent: () => void
  handleNewEventAtTime: (date: Date, time: string, duration?: number) => void
  handleNewCalendar: () => void
  handleSaveEvent: (eventData: Partial<CalendarEvent>) => void
  handleDeleteEvent: (eventId: number) => void
  handleEditEvent: (event: CalendarEvent) => void
  handleEventClick: (event: CalendarEvent) => void
  handleCategoryToggle: (categoryId: number) => void
  loadEvents: (startDate?: Date, endDate?: Date) => Promise<void>
}

export interface UseCalendarReturn extends UseCalendarState, UseCalendarActions {}

// Convert API Event to CalendarEvent
function convertAPIEvent(apiEvent: APIEvent): CalendarEvent {
  const start = new Date(apiEvent.startDateTime)
  const end = new Date(apiEvent.endDateTime)

  return {
    id: apiEvent.id,
    title: apiEvent.title,
    date: start,
    endDate: apiEvent.isAllDay ? end : undefined,
    time: format(start, 'HH:mm'),
    duration: `${Math.round((end.getTime() - start.getTime()) / (1000 * 60))} min`,
    type: (apiEvent.category?.name.toLowerCase() || 'event') as any,
    attendees: apiEvent.participants?.map(p => p.contact.name) || [],
    location: apiEvent.location || '',
    color: apiEvent.color || apiEvent.category?.color || '#3b82f6',
    description: apiEvent.description || '',
    categoryId: apiEvent.categoryId,
    categoryName: apiEvent.category?.name,
    assignedTo: apiEvent.assignedTo,
    contactId: apiEvent.contactId,
    contactName: apiEvent.contact?.name,
    allDay: apiEvent.isAllDay || false,
  }
}

export function useCalendar(initialEvents: CalendarEvent[] = []): UseCalendarReturn {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showEventForm, setShowEventForm] = useState(false)
  const [showEventPreview, setShowEventPreview] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [previewEvent, setPreviewEvent] = useState<CalendarEvent | null>(null)
  const [showCalendarSheet, setShowCalendarSheet] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [isLoading, setIsLoading] = useState(false)
  const [currentView, setCurrentView] = useState<CalendarView>(() => {
    // Load saved view from localStorage, default to "month" if not found
    const savedView = localStorage.getItem('calendar-view')
    return (savedView as CalendarView) || "month"
  })
  const [hiddenCategories, setHiddenCategories] = useState<Set<number>>(new Set())

  const loadEvents = useCallback(async (startDate?: Date, endDate?: Date) => {
    try {
      setIsLoading(true)

      // Default to current month if no dates provided
      const start = startDate || startOfMonth(selectedDate)
      const end = endDate || endOfMonth(selectedDate)

      const response = await eventsAPI.getEvents({
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        limit: 1000, // Get all events in the date range
      })

      const convertedEvents = response.data.events.map(convertAPIEvent)
      setEvents(convertedEvents)
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

  // Load events when component mounts or selectedDate changes
  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Save current view to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('calendar-view', currentView)
  }, [currentView])

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    // Auto-close mobile sheet when date is selected
    setShowCalendarSheet(false)
  }, [])

  const handleNewEvent = useCallback(() => {
    setEditingEvent(null)
    setShowEventForm(true)
  }, [])

  const handleNewEventAtTime = useCallback((date: Date, time: string, duration?: number) => {
    // Create a partial event with the date, time, and duration pre-filled
    const partialEvent: Partial<CalendarEvent> = {
      date,
      time,
      duration: duration ? `${duration} min` : "60 min",
      title: "",
      location: "",
      description: "",
      color: "#3b82f6",
      allDay: false,
    }
    setEditingEvent(partialEvent as CalendarEvent)
    setShowEventForm(true)
  }, [])

  const handleNewCalendar = useCallback(() => {
    console.log("Creating new calendar")
    // In a real app, this would open a new calendar form
  }, [])

  const handleSaveEvent = useCallback(async (eventData: Partial<CalendarEvent> & { categoryId?: number, assignedTo?: number, contactId?: number, endDate?: Date, reminderEnabled?: boolean, reminderType?: string, reminderEmail?: boolean, participants?: number[] }) => {
    try {
      const eventDate = eventData.date || selectedDate
      let startDateTime: Date
      let endDateTime: Date

      console.log('[DEBUG] Creating event with data:', {
        eventDate: eventDate,
        selectedDate: selectedDate,
        eventDataDate: eventData.date,
        allDay: eventData.allDay,
        time: eventData.time,
        participants: (eventData as any).participants
      })

      if (eventData.allDay) {
        // For all-day events, use the date without specific time
        startDateTime = new Date(eventDate)
        startDateTime.setHours(0, 0, 0, 0)

        // If endDate is provided (multi-day event), use it; otherwise, same as start
        const eventEndDate = eventData.endDate || eventDate
        endDateTime = new Date(eventEndDate)
        endDateTime.setHours(23, 59, 59, 999)
      } else {
        // For timed events, use time and duration
        const [hours, minutes] = (eventData.time || '09:00').split(':')
        startDateTime = new Date(eventDate)
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        // Parse duration (e.g., "60 min" -> 60)
        const durationMatch = eventData.duration?.match(/(\d+)/)
        const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 60

        endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000)
      }

      console.log('[DEBUG] Computed dates:', {
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString()
      })

      if (editingEvent?.id) {
        // Update existing event
        const updatePayload = {
          title: eventData.title || '',
          description: eventData.description,
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          location: eventData.location,
          color: eventData.color,
          categoryId: eventData.categoryId,
          assignedTo: eventData.assignedTo,
          contactId: eventData.contactId,
          isAllDay: eventData.allDay || false,
          reminderEnabled: eventData.reminderEnabled || false,
          reminderType: eventData.reminderType || 'MINUTES_15',
          reminderEmail: eventData.reminderEmail || false,
          teamMembers: (eventData as any).participants || [],
        }
        console.log('[DEBUG] Updating event:', updatePayload)
        await eventsAPI.updateEvent(editingEvent.id, updatePayload)
      } else {
        // Create new event
        const createPayload = {
          title: eventData.title || '',
          description: eventData.description,
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          location: eventData.location || '',
          color: eventData.color,
          categoryId: eventData.categoryId,
          assignedTo: eventData.assignedTo,
          contactId: eventData.contactId,
          isAllDay: eventData.allDay || false,
          reminderEnabled: eventData.reminderEnabled || false,
          reminderType: eventData.reminderType || 'MINUTES_15',
          reminderEmail: eventData.reminderEmail || false,
          teamMembers: (eventData as any).participants || [],
        }
        console.log('[DEBUG] Creating event:', createPayload)
        const response = await eventsAPI.createEvent(createPayload)
        console.log('[DEBUG] Event created response:', response)
      }

      // Reload events
      await loadEvents()
      setShowEventForm(false)
      setEditingEvent(null)
    } catch (error) {
      console.error('Failed to save event:', error)
    }
  }, [editingEvent, selectedDate, loadEvents])

  const handleDeleteEvent = useCallback(async (eventId: number) => {
    try {
      await eventsAPI.deleteEvent(eventId)
      // Reload events
      await loadEvents()
      setShowEventForm(false)
      setEditingEvent(null)
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }, [loadEvents])

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event)
    setShowEventForm(true)
  }, [])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setPreviewEvent(event)
    setShowEventPreview(true)
  }, [])

  const handleCategoryToggle = useCallback((categoryId: number) => {
    setHiddenCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId) // Show the category
      } else {
        newSet.add(categoryId) // Hide the category
      }
      return newSet
    })
  }, [])

  return {
    // State
    selectedDate,
    showEventForm,
    showEventPreview,
    editingEvent,
    previewEvent,
    showCalendarSheet,
    events,
    isLoading,
    currentView,
    hiddenCategories,
    // Actions
    setSelectedDate,
    setShowEventForm,
    setShowEventPreview,
    setEditingEvent,
    setPreviewEvent,
    setShowCalendarSheet,
    setCurrentView,
    handleDateSelect,
    handleNewEvent,
    handleNewEventAtTime,
    handleNewCalendar,
    handleSaveEvent,
    handleDeleteEvent,
    handleEditEvent,
    handleEventClick,
    handleCategoryToggle,
    loadEvents,
  }
}
