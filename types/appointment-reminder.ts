import type { WhatsappTemplateTrigger } from './whatsapp-template'

export type AppointmentReminderStatus = 'SENT' | 'FAILED' | 'SKIPPED'

export type CalendarEventStatus =
  | 'CREATED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'RESCHEDULED'

export interface AppointmentReminderCalendarEvent {
  id: string
  startTime: string
  endTime: string
  status: CalendarEventStatus
  attendeeName: string | null
  topic: string | null
  customerPhone: string
  conversationId: string | null
}

export interface AppointmentReminderTemplate {
  id: string
  name: string
  language: string
}

export interface AppointmentReminder {
  id: string
  botId: string
  calendarEventId: string
  trigger: WhatsappTemplateTrigger
  status: AppointmentReminderStatus
  reason: string | null
  errorCode: string | null
  wamid: string | null
  variables: Record<string, string>
  sentAt: string
  template: AppointmentReminderTemplate | null
  calendarEvent: AppointmentReminderCalendarEvent
}

export interface PaginatedAppointmentReminders {
  items: AppointmentReminder[]
  total: number
  page: number
  pageSize: number
}

export interface FindRemindersQuery {
  status?: AppointmentReminderStatus
  trigger?: WhatsappTemplateTrigger
  dateFrom?: string
  dateTo?: string
  calendarEventId?: string
  page?: number
  pageSize?: number
}
