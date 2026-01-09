export interface CalendarEvent {
  id: number
  title: string
  date: Date
  endDate?: Date
  time: string
  duration: string
  type: "meeting" | "event" | "personal" | "task" | "reminder"
  attendees: string[]
  location: string
  color: string
  description?: string
  categoryId?: number
  categoryName?: string
  assignedTo?: number
  contactId?: number
  contactName?: string
  allDay?: boolean
  teamMembers?: Array<{
    id: number
    firstName: string
    lastName: string
    email: string
  }>
  reminderEnabled?: boolean
  reminderType?: 'MINUTES_15' | 'MINUTES_30' | 'HOUR_1' | 'DAY_1'
  reminderEmail?: boolean
}

export interface Calendar {
  id: string
  name: string
  color: string
  visible: boolean
  type: "personal" | "work" | "shared"
}

export type CalendarView = "month" | "week" | "workWeek" | "day"
