"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  MoreHorizontal,
  Search,
  Grid3X3,
  List,
  ChevronDown,
  Menu,
  Columns,
  Square,
  Settings
} from "lucide-react"
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  parseISO,
  isWithinInterval
} from "date-fns"
import { it } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { type CalendarEvent, type CalendarView } from "../types"

// Import data
import eventsData from "../data/events.json"

interface CalendarMainProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onMenuClick?: () => void
  events?: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onTimeSlotClick?: (date: Date, time: string, duration?: number) => void
  currentView?: CalendarView
  onViewChange?: (view: CalendarView) => void
  hideSidebar?: boolean
}

export function CalendarMain({ selectedDate, onDateSelect, onMenuClick, events, onEventClick, onTimeSlotClick, currentView, onViewChange, hideSidebar = false }: CalendarMainProps) {
  const navigateTo = useNavigate()
  // Convert JSON events to CalendarEvent objects with proper Date objects, fallback to imported data
  const sampleEvents: CalendarEvent[] = events || eventsData.map(event => ({
    ...event,
    date: new Date(event.date),
    type: event.type as "meeting" | "event" | "personal" | "task" | "reminder"
  }))

  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
  const [viewMode, setViewMode] = useState<CalendarView>(currentView || "month")
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")

  // Drag state for creating events
  const [dragStart, setDragStart] = useState<{ date: Date; time: string; hour: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ time: string; hour: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Filter events based on search query
  const filteredEvents = sampleEvents.filter(event => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.categoryName?.toLowerCase().includes(query) ||
      event.contactName?.toLowerCase().includes(query)
    )
  })

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Sync viewMode with currentView prop
  if (currentView && currentView !== viewMode) {
    setViewMode(currentView)
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  // Extend to show full weeks starting from Monday (European standard)
  const calendarStart = new Date(monthStart)
  const dayOfWeek = monthStart.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0, Sunday = 6
  calendarStart.setDate(calendarStart.getDate() - diff)

  const calendarEnd = new Date(monthEnd)
  const endDayOfWeek = monthEnd.getDay()
  const endDiff = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek
  calendarEnd.setDate(calendarEnd.getDate() + endDiff)

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter(event => {
      // For multi-day all-day events, check if date falls within the range
      if (event.allDay && event.endDate) {
        const eventStart = startOfDay(event.date)
        const eventEnd = startOfDay(event.endDate)
        const checkDate = startOfDay(date)
        return checkDate >= eventStart && checkDate <= eventEnd
      }
      // For single-day events or timed events, check same day
      return isSameDay(event.date, date)
    })
  }

  const navigate = (direction: "prev" | "next") => {
    if (viewMode === "month") {
      setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
    } else if (viewMode === "week" || viewMode === "workWeek") {
      setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1))
    } else if (viewMode === "day") {
      setCurrentDate(direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleViewChange = (view: CalendarView) => {
    setViewMode(view)
    onViewChange?.(view)
  }

  const getDateRangeText = () => {
    if (viewMode === "month") {
      return format(currentDate, 'MMMM yyyy', { locale: it })
    } else if (viewMode === "week" || viewMode === "workWeek") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(weekStart, 'd MMM', { locale: it })} - ${format(weekEnd, 'd MMM yyyy', { locale: it })}`
    } else if (viewMode === "day") {
      return format(currentDate, 'EEEE d MMMM yyyy', { locale: it })
    }
    return format(currentDate, 'MMMM yyyy', { locale: it })
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event)
    } else {
      setSelectedEvent(event)
      setShowEventDialog(true)
    }
  }

  // Handle mouse down on time slot (start drag)
  const handleTimeSlotMouseDown = (date: Date, hour: number) => {
    const time = `${hour.toString().padStart(2, '0')}:00`
    setDragStart({ date, time, hour })
    setDragEnd({ time, hour })
    setIsDragging(false)
  }

  // Handle mouse enter on time slot (continue drag)
  const handleTimeSlotMouseEnter = (hour: number) => {
    if (dragStart) {
      const time = `${hour.toString().padStart(2, '0')}:00`
      setDragEnd({ time, hour })
      setIsDragging(true)
    }
  }

  // Handle mouse up (end drag and create event)
  const handleTimeSlotMouseUp = () => {
    if (dragStart && dragEnd && onTimeSlotClick) {
      const startHour = Math.min(dragStart.hour, dragEnd.hour)
      const endHour = Math.max(dragStart.hour, dragEnd.hour) + 1
      const duration = (endHour - startHour) * 60
      const time = `${startHour.toString().padStart(2, '0')}:00`

      onTimeSlotClick(dragStart.date, time, duration)
    }
    setDragStart(null)
    setDragEnd(null)
    setIsDragging(false)
  }

  // Handle click on time slot (create 1-hour event)
  const handleTimeSlotClick = (date: Date, hour: number) => {
    if (!isDragging && onTimeSlotClick) {
      const time = `${hour.toString().padStart(2, '0')}:00`
      onTimeSlotClick(date, time, 60)
    }
  }

  const renderCalendarGrid = () => {
    const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

    // Group calendar days by week rows
    const weeks: Date[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7))
    }

    // Track unique all-day multi-day events to avoid duplicates
    const processedMultiDayEvents = new Set<number>()

    return (
      <div className="flex-1 bg-background">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map(day => (
            <div key={day} className="p-4 text-center font-medium text-sm text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Body - Week by week */}
        {weeks.map((week, weekIndex) => {
          // Collect all all-day events for this week (both single-day and multi-day)
          const weekAllDayEvents = week.flatMap((day) => {
            const dayEvents = getEventsForDay(day)
            return dayEvents.filter(e => e.allDay)
          }).filter((event, index, self) =>
            index === self.findIndex(e => e.id === event.id)
          ).filter(event => {
            // Only include events that haven't been processed yet
            if (processedMultiDayEvents.has(event.id)) return false
            const eventStart = startOfDay(event.date)
            const weekStart = startOfDay(week[0])
            const weekEnd = startOfDay(week[6])
            return eventStart <= weekEnd
          })

          // Calculate grid positions for all-day events
          const allDayEventsWithSpan = weekAllDayEvents.map(event => {
            processedMultiDayEvents.add(event.id)
            const eventStart = startOfDay(event.date)
            const eventEnd = event.endDate ? startOfDay(event.endDate) : eventStart

            let startCol = 0
            let endCol = 0

            week.forEach((weekDay, idx) => {
              const dayStart = startOfDay(weekDay)
              if (dayStart.getTime() === eventStart.getTime()) {
                startCol = idx + 1
              }
              if (dayStart.getTime() === eventEnd.getTime()) {
                endCol = idx + 2
              }
            })

            if (startCol === 0) startCol = 1
            if (endCol === 0 || endCol > 8) endCol = 8

            return {
              ...event,
              startCol,
              endCol,
              span: endCol - startCol
            }
          })

          // Calculate rows for overlapping all-day events
          const allDayEventsWithRows = allDayEventsWithSpan.map((event, index, arr) => {
            let row = 1
            for (let i = 0; i < index; i++) {
              const otherEvent = arr[i]
              const eventsOverlap =
                (event.startCol < otherEvent.endCol) &&
                (event.endCol > otherEvent.startCol)

              if (eventsOverlap) {
                const usedRows = arr
                  .slice(0, index)
                  .filter(e =>
                    (e.startCol < event.endCol) &&
                    (e.endCol > event.startCol)
                  )
                  .map(e => e.row || 1)

                while (usedRows.includes(row)) {
                  row++
                }
              }
            }
            return { ...event, row }
          })

          const maxRow = allDayEventsWithRows.length > 0 ? Math.max(...allDayEventsWithRows.map(e => e.row)) : 0
          const allDayHeight = maxRow * 26 + 8

          return (
            <div key={weekIndex}>
              {/* All-day events section */}
              {allDayEventsWithRows.length > 0 && (
                <div className="relative border-b bg-muted/20" style={{ height: `${allDayHeight}px` }}>
                  <div className="grid grid-cols-7 h-full">
                    {week.map((day) => (
                      <div key={`allday-${day.toISOString()}`} className="border-r last:border-r-0"></div>
                    ))}
                  </div>
                  {/* All-day events overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {allDayEventsWithRows.map((event) => (
                      <div
                        key={`allday-${event.id}`}
                        className="absolute pointer-events-auto text-xs p-1 rounded-sm text-white cursor-pointer truncate"
                        style={{
                          backgroundColor: event.color,
                          left: `${((event.startCol - 1) * 100) / 7}%`,
                          width: `${(event.span * 100) / 7}%`,
                          top: `${(event.row - 1) * 26 + 4}px`,
                          height: '20px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEventClick(event)
                        }}
                      >
                        <span className="truncate">{event.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular day cells */}
              <div className="grid grid-cols-7 relative">
                {week.map((day, dayIndex) => {
                  const dayEvents = getEventsForDay(day)
                  // Only show timed events (non-all-day events)
                  const timedEvents = dayEvents.filter(e => !e.allDay)
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isDayToday = isToday(day)
                  const isSelected = selectedDate && isSameDay(day, selectedDate)

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-h-[100px] border-r border-b last:border-r-0 p-2 pt-8 cursor-pointer transition-colors relative",
                        isCurrentMonth ? "bg-background hover:bg-accent/50" : "bg-muted/30 text-muted-foreground",
                        isSelected && "ring-2 ring-primary ring-inset",
                        isDayToday && "bg-accent/20"
                      )}
                      onClick={() => onDateSelect?.(day)}
                    >
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                        <span className={cn(
                          "text-sm font-medium",
                          isDayToday && "bg-primary text-primary-foreground rounded-md w-6 h-6 flex items-center justify-center text-xs"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {timedEvents.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{timedEvents.length - 2}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {timedEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className="text-xs p-1 rounded-sm text-white cursor-pointer truncate"
                            style={{ backgroundColor: event.color }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEventClick(event)
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span className="truncate">{event.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWeekView = (workWeekOnly = false) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const filteredDays = workWeekOnly ? daysInWeek.filter(day => day.getDay() !== 0 && day.getDay() !== 6) : daysInWeek

    const startHour = 7
    const endHour = 22
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour)
    const minutesPerHour = 60
    const pixelsPerMinute = 1

    // Separate all-day events from timed events
    const allDayEventsMap = new Map()
    const dayEventsMap = new Map()
    const uniqueAllDayEvents = new Map()

    filteredDays.forEach(day => {
      const dayEvents = getEventsForDay(day)
      const allDayEvents = dayEvents.filter(event => event.allDay)
      const timedEvents = dayEvents.filter(event => !event.allDay).map(event => {
        const [hours, minutes] = event.time.split(':').map(Number)
        const startMinutes = (hours - startHour) * 60 + minutes
        const durationMinutes = parseInt(event.duration) || 60

        return {
          ...event,
          startMinutes,
          endMinutes: startMinutes + durationMinutes,
          top: startMinutes * pixelsPerMinute,
          height: durationMinutes * pixelsPerMinute
        }
      })

      // Track unique all-day events
      allDayEvents.forEach(event => {
        if (!uniqueAllDayEvents.has(event.id)) {
          uniqueAllDayEvents.set(event.id, event)
        }
      })

      allDayEventsMap.set(day.toISOString(), allDayEvents)
      dayEventsMap.set(day.toISOString(), timedEvents)
    })

    // Calculate grid positions for all-day events
    const allDayEventsWithSpan = Array.from(uniqueAllDayEvents.values()).map(event => {
      const eventStart = startOfDay(event.date)
      const eventEnd = event.endDate ? startOfDay(event.endDate) : eventStart

      // Find start and end column indices
      let startCol = -1
      let endCol = -1

      filteredDays.forEach((day, index) => {
        const dayStart = startOfDay(day)
        if (dayStart.getTime() === eventStart.getTime()) {
          startCol = index + 2 // +2 because grid starts with time label column (1) then first day (2)
        }
        if (dayStart.getTime() === eventEnd.getTime()) {
          endCol = index + 3 // +3 to include the end day
        }
      })

      // If event extends beyond visible week, clamp to visible range
      if (startCol === -1) startCol = 2 // Starts before visible range
      if (endCol === -1) endCol = filteredDays.length + 2 // Ends after visible range

      return {
        ...event,
        gridColumnStart: startCol,
        gridColumnEnd: endCol
      }
    })

    // Calculate rows for overlapping all-day events
    const allDayEventsWithRows = allDayEventsWithSpan.map((event, index, arr) => {
      let row = 1
      // Check for overlaps with previous events
      for (let i = 0; i < index; i++) {
        const otherEvent = arr[i]
        // Check if events overlap in columns
        const eventsOverlap =
          (event.gridColumnStart < otherEvent.gridColumnEnd) &&
          (event.gridColumnEnd > otherEvent.gridColumnStart)

        if (eventsOverlap) {
          // Find the first available row
          const usedRows = arr
            .slice(0, index)
            .filter(e =>
              (e.gridColumnStart < event.gridColumnEnd) &&
              (e.gridColumnEnd > event.gridColumnStart)
            )
            .map(e => e.gridRow || 1)

          while (usedRows.includes(row)) {
            row++
          }
        }
      }
      return { ...event, gridRow: row }
    })

    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* Header with days */}
          <div className="grid border-b sticky top-0 bg-background z-10" style={{ gridTemplateColumns: `80px repeat(${filteredDays.length}, 1fr)` }}>
            <div className="border-r p-2"></div>
            {filteredDays.map(day => {
              const isDayToday = isToday(day)
              return (
                <div key={day.toISOString()} className="border-r last:border-r-0 p-2 text-center">
                  <div className={cn("text-sm font-medium", isDayToday && "text-primary")}>
                    {format(day, 'EEE', { locale: it })}
                  </div>
                  <div className={cn(
                    "text-2xl font-semibold mt-1",
                    isDayToday && "bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center mx-auto"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* All-day events section */}
          <div
            className="relative border-b bg-muted/20"
            style={{ minHeight: `${Math.max(60, allDayEventsWithRows.length > 0 ? Math.max(...allDayEventsWithRows.map(e => e.gridRow)) * 32 + 8 : 60)}px` }}
          >
            <div className="grid h-full" style={{ gridTemplateColumns: `80px repeat(${filteredDays.length}, 1fr)` }}>
              <div className="border-r p-2 text-xs text-muted-foreground">Tutto il giorno</div>
              {filteredDays.map((day, index) => (
                <div key={`allday-col-${day.toISOString()}`} className="border-r last:border-r-0"></div>
              ))}
            </div>
            {/* Overlay all-day events with absolute positioning */}
            <div className="absolute inset-0 pointer-events-none">
              {allDayEventsWithRows.map((event) => {
                // Calculate position accounting for 80px time column
                const timeColumnWidth = 80
                const daysCount = filteredDays.length
                const dayStartIndex = event.gridColumnStart - 2 // -2 because column 1 is time, column 2 is first day
                const daySpan = event.gridColumnEnd - event.gridColumnStart

                return (
                  <div
                    key={event.id}
                    className="absolute pointer-events-auto px-2 py-1 m-1 rounded text-xs font-medium text-white cursor-pointer hover:opacity-90 truncate"
                    style={{
                      backgroundColor: event.color,
                      left: `calc(${timeColumnWidth}px + ${(dayStartIndex / daysCount) * 100}% - ${(dayStartIndex / daysCount) * timeColumnWidth}px)`,
                      width: `calc(${(daySpan / daysCount) * 100}% - ${(daySpan / daysCount) * timeColumnWidth}px)`,
                      top: `${(event.gridRow - 1) * 32 + 4}px`,
                      height: '24px'
                    }}
                    onClick={() => handleEventClick(event)}
                  >
                    {event.title}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Time grid with absolute positioned events */}
          <div className="relative">
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(${filteredDays.length}, 1fr)` }}>
              {/* Time labels column */}
              <div className="border-r">
                {hours.map(hour => (
                  <div key={hour} className="border-b p-2 text-xs text-muted-foreground text-right" style={{ height: '60px' }}>
                    {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                  </div>
                ))}
              </div>

              {/* Day columns with events */}
              {filteredDays.map(day => {
                const dayEvents = dayEventsMap.get(day.toISOString()) || []
                const isDayToday = isToday(day)
                const currentHour = currentTime.getHours()
                const currentMinutes = currentTime.getMinutes()
                const currentTimeOffset = ((currentHour - startHour) * 60 + currentMinutes) * pixelsPerMinute
                const showCurrentTime = isDayToday && currentHour >= startHour && currentHour <= endHour

                return (
                  <div key={day.toISOString()} className="border-r last:border-r-0 relative">
                    {/* Hour grid lines */}
                    {hours.map(hour => {
                      const isInDragRange = dragStart && dragEnd &&
                        isSameDay(day, dragStart.date) &&
                        hour >= Math.min(dragStart.hour, dragEnd.hour) &&
                        hour <= Math.max(dragStart.hour, dragEnd.hour)

                      return (
                        <div
                          key={hour}
                          className={cn(
                            "border-b cursor-pointer hover:bg-accent/50 transition-colors",
                            isInDragRange && "bg-primary/20"
                          )}
                          style={{ height: '60px' }}
                          onMouseDown={() => handleTimeSlotMouseDown(day, hour)}
                          onMouseEnter={() => handleTimeSlotMouseEnter(hour)}
                          onMouseUp={handleTimeSlotMouseUp}
                          onClick={() => handleTimeSlotClick(day, hour)}
                        ></div>
                      )
                    })}

                    {/* Current time indicator - only show on today's column within visible hours */}
                    {showCurrentTime && (
                      <>
                        <div
                          className="absolute left-0 right-0 h-[2px] bg-red-500 z-10"
                          style={{ top: `${currentTimeOffset}px` }}
                        >
                          <div className="absolute left-0 top-1/2 w-3 h-3 bg-red-500 rounded-full -translate-y-1/2 -translate-x-1/2" />
                        </div>
                        <div
                          className="absolute -left-16 text-[11px] font-semibold text-red-500 z-10"
                          style={{ top: `${currentTimeOffset - 6}px` }}
                        >
                          {format(currentTime, 'HH:mm')}
                        </div>
                      </>
                    )}

                    {/* Events positioned absolutely */}
                    {dayEvents.map((event, index) => (
                      <div
                        key={event.id}
                        className="absolute left-0 right-0 mx-1 px-2 py-1 rounded text-white cursor-pointer hover:opacity-90 overflow-hidden group/event"
                        style={{
                          backgroundColor: event.color,
                          top: `${event.top}px`,
                          height: `${Math.max(event.height, 20)}px`,
                          zIndex: 10 + index
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.zIndex = '200'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.zIndex = `${10 + index}`
                        }}
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="text-xs font-medium truncate">{event.title}</div>
                        {event.height > 30 && (
                          <>
                            <div className="text-[10px] opacity-90 truncate">{event.time}</div>
                            {event.categoryName && event.height > 45 && (
                              <div className="text-[10px] opacity-90 truncate">{event.categoryName}</div>
                            )}
                            {event.contactName && event.height > 60 && (
                              <div className="text-[10px] opacity-90 truncate flex items-center gap-1">
                                <Users className="w-2.5 h-2.5" />
                                {event.contactName}
                              </div>
                            )}
                            {event.location && event.height > 75 && (
                              <div className="text-[10px] opacity-90 truncate flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" />
                                {event.location}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const startHour = 7
    const endHour = 22
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour)
    const pixelsPerMinute = 1.5

    // Get all events with calculated positions (filter out all-day events)
    const dayEvents = getEventsForDay(currentDate)
      .filter(event => !event.allDay)
      .map(event => {
        const [hours, minutes] = event.time.split(':').map(Number)
        const startMinutes = (hours - startHour) * 60 + minutes
        const durationMinutes = parseInt(event.duration) || 60

        return {
          ...event,
          startMinutes,
          endMinutes: startMinutes + durationMinutes,
          top: startMinutes * pixelsPerMinute,
          height: durationMinutes * pixelsPerMinute
        }
      })

    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Day header */}
          <div className="border-b p-4 text-center sticky top-0 bg-background z-10">
            <div className="text-sm font-medium text-muted-foreground">
              {format(currentDate, 'EEEE', { locale: it })}
            </div>
            <div className={cn(
              "text-3xl font-semibold mt-2",
              isToday(currentDate) && "text-primary"
            )}>
              {format(currentDate, 'd MMMM yyyy', { locale: it })}
            </div>
          </div>

          {/* Time grid with absolute positioned events */}
          <div className="relative">
            <div className="flex">
              {/* Time labels column */}
              <div className="w-20 border-r">
                {hours.map(hour => (
                  <div key={hour} className="border-b p-2 text-sm text-muted-foreground text-right" style={{ height: '90px' }}>
                    {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                  </div>
                ))}
              </div>

              {/* Events column */}
              <div className="flex-1 relative">
                {/* Hour grid lines */}
                {hours.map(hour => {
                  const isInDragRange = dragStart && dragEnd &&
                    hour >= Math.min(dragStart.hour, dragEnd.hour) &&
                    hour <= Math.max(dragStart.hour, dragEnd.hour)

                  return (
                    <div
                      key={hour}
                      className={cn(
                        "border-b cursor-pointer hover:bg-accent/50 transition-colors",
                        isInDragRange && "bg-primary/20"
                      )}
                      style={{ height: '90px' }}
                      onMouseDown={() => handleTimeSlotMouseDown(currentDate, hour)}
                      onMouseEnter={() => handleTimeSlotMouseEnter(hour)}
                      onMouseUp={handleTimeSlotMouseUp}
                      onClick={() => handleTimeSlotClick(currentDate, hour)}
                    ></div>
                  )
                })}

                {/* Current time indicator - only show if viewing today */}
                {isToday(currentDate) && (
                  <>
                    <div
                      className="absolute left-0 right-0 h-[2px] bg-red-500 z-10"
                      style={{ top: `${(currentTime.getHours() * 60 + currentTime.getMinutes()) * pixelsPerMinute}px` }}
                    >
                      <div className="absolute left-0 top-1/2 w-3 h-3 bg-red-500 rounded-full -translate-y-1/2 -translate-x-1/2" />
                    </div>
                    <div
                      className="absolute -left-16 text-[11px] font-semibold text-red-500 z-10"
                      style={{ top: `${(currentTime.getHours() * 60 + currentTime.getMinutes()) * pixelsPerMinute - 6}px` }}
                    >
                      {format(currentTime, 'HH:mm')}
                    </div>
                  </>
                )}

                {/* Events positioned absolutely */}
                {dayEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className="absolute left-0 right-0 mx-2 px-3 py-2 rounded-md cursor-pointer hover:shadow-lg hover:opacity-90 transition-all overflow-hidden"
                    style={{
                      backgroundColor: event.color,
                      top: `${event.top}px`,
                      height: `${Math.max(event.height, 30)}px`,
                      zIndex: 10 + index
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.zIndex = '200'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.zIndex = `${10 + index}`
                    }}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="text-white">
                      <div className="font-medium truncate">{event.title}</div>
                      {event.height > 40 && (
                        <div className="text-xs opacity-90 mt-1">
                          {event.time} ({event.duration})
                        </div>
                      )}
                      {event.height > 60 && event.location && (
                        <div className="flex items-center gap-1 text-xs opacity-90 mt-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderListView = () => {
    const upcomingEvents = sampleEvents
      .filter(event => event.date >= new Date())
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    return (
      <div className="flex-1 p-6">
        <div className="space-y-4">
          {upcomingEvents.map(event => (
            <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEventClick(event)}>
              <CardContent className="px-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-3 h-3 rounded-full mt-1.5", event.color)} />
                    <div className="flex-1">
                      <h3 className="font-medium">{event.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center flex-wrap gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {format(event.date, 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center flex-wrap gap-1">
                          <Clock className="w-4 h-4" />
                          {event.time}
                        </div>
                        <div className="flex items-center flex-wrap gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {event.attendees.slice(0, 3).map((attendee, index) => (
                        <Avatar key={index} className="border-2 border-background">
                          <AvatarFallback className="text-xs">{attendee}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="cursor-pointer">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col flex-wrap gap-4 p-6 border-b md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Mobile Menu Button */}
          <Button
            variant="outline"
            size="sm"
            className="xl:hidden cursor-pointer"
            onClick={onMenuClick}
          >
            <Menu className="w-4 h-4" />
          </Button>

          {/* Settings Button - Only visible when sidebar is hidden */}
          {hideSidebar && (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => navigateTo('/calendar/settings')}
              title="Impostazioni Agenda"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("prev")} className="cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("next")} className="cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="cursor-pointer">
              Oggi
            </Button>
          </div>

          <h1 className="text-2xl font-semibold">
            {getDateRangeText()}
          </h1>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca eventi..."
              className="pl-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* View Mode Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="cursor-pointer">
                {viewMode === "month" && <Grid3X3 className="w-4 h-4 mr-2" />}
                {viewMode === "week" && <Columns className="w-4 h-4 mr-2" />}
                {viewMode === "workWeek" && <Columns className="w-4 h-4 mr-2" />}
                {viewMode === "day" && <Square className="w-4 h-4 mr-2" />}
                {viewMode === "month" && "Mese"}
                {viewMode === "week" && "Settimana"}
                {viewMode === "workWeek" && "Lun-Ven"}
                {viewMode === "day" && "Giorno"}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleViewChange("month")} className="cursor-pointer">
                <Grid3X3 className="w-4 h-4 mr-2" />
                Mese
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleViewChange("week")} className="cursor-pointer">
                <Columns className="w-4 h-4 mr-2" />
                Settimana
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleViewChange("workWeek")} className="cursor-pointer">
                <Columns className="w-4 h-4 mr-2" />
                Lun-Ven
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleViewChange("day")} className="cursor-pointer">
                <Square className="w-4 h-4 mr-2" />
                Giorno
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Calendar Content */}
      {viewMode === "month" && renderCalendarGrid()}
      {viewMode === "week" && renderWeekView(false)}
      {viewMode === "workWeek" && renderWeekView(true)}
      {viewMode === "day" && renderDayView()}

      {/* Event Detail Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title || "Dettagli Evento"}</DialogTitle>
            <DialogDescription>
              Visualizza e gestisci questo evento del calendario
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span>{format(selectedEvent.date, 'EEEE d MMMM yyyy', { locale: it })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{selectedEvent.time} ({selectedEvent.duration})</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{selectedEvent.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span>Partecipanti:</span>
                  <div className="flex -space-x-2">
                    {selectedEvent.attendees.map((attendee: string, index: number) => (
                      <Avatar key={index} className="w-6 h-6 border-2 border-background">
                        <AvatarFallback className="text-xs">{attendee}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={cn("text-white", selectedEvent.color)}>
                  {selectedEvent.type}
                </Badge>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => {
                  setShowEventDialog(false)
                }}>Modifica</Button>
                <Button variant="destructive" className="flex-1 cursor-pointer" onClick={() => {
                  setShowEventDialog(false)
                }}>Elimina</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
