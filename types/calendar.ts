export interface CalendarBusinessHoursDay {
  dayOfWeek: number
  ranges: Array<{ start: string, end: string }>
}

export interface CalendarAppointmentService {
  id: string | null
  name: string
}

export interface CalendarAppointmentCustomer {
  id: string | null
  name: string | null
  phone: string
  email: string | null
}

export type CalendarAppointmentStatus =
  | 'CREATED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'RESCHEDULED'

export interface CalendarAppointment {
  id: string
  startsAt: string
  endsAt: string
  status: CalendarAppointmentStatus
  topic: string | null
  service: CalendarAppointmentService | null
  customer: CalendarAppointmentCustomer
  conversationId: string
  meetLink: string | null
  confirmedAt: string | null
}

export interface CalendarBlock {
  id: string
  startsAt: string
  endsAt: string
  allDay: boolean
  reason: string
  publicMessage: string | null
}

export interface CalendarViewResponse {
  timezone: string
  businessHours: CalendarBusinessHoursDay[]
  appointments: CalendarAppointment[]
  blocks: CalendarBlock[]
}
