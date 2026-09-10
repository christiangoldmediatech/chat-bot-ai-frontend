export type AttendanceResult =
  | 'PENDING'
  | 'UNREGISTERED'
  | 'ATTENDED'
  | 'NO_SHOW'
  | 'RESCHEDULED'
  | 'CANCELLED'

export interface ServiceHistoryServiceRef {
  id: string | null
  name: string
}

export interface ServiceHistoryReschedule {
  previousStartsAt: string
  newStartsAt: string
  requestedBy: 'PATIENT' | 'CLINIC'
}

export interface ServiceHistoryItem {
  appointmentId: string
  service: ServiceHistoryServiceRef | null
  scheduledAt: string
  endsAt: string
  durationMinutes: number
  attendanceResult: AttendanceResult
  attendanceMarkedAt: string | null
  attendanceMarkedByUserId: string | null
  amountCents: number | null
  currency: string | null
  rescheduleCount: number
  reschedules: ServiceHistoryReschedule[]
  conversationId: string
  meetLink: string | null
  topic: string | null
}

export interface ServiceHistorySummary {
  totalAppointments: number
  attended: number
  noShow: number
  rescheduled: number
  cancelled: number
  pending: number
  unregistered: number
  totalAmountCents: number
  currency: string | null
  lastVisitAt: string | null
  firstVisitAt: string | null
  attendanceRate: number | null
}

export interface ServiceHistoryResponse {
  summary: ServiceHistorySummary
  items: ServiceHistoryItem[]
  page: number
  limit: number
  total: number
}

export interface ServiceHistoryQuery {
  page?: number
  limit?: number
  status?: AttendanceResult
  serviceId?: string
  from?: string
  to?: string
}

export interface ServicesPerformedRow {
  serviceId: string | null
  name: string
  scheduled: number
  attended: number
  noShow: number
  rescheduled: number
  cancelled: number
  pending: number
  revenueCents: number
  currency: string | null
  attendanceRate: number | null
}

export interface ServicesPerformedTotals {
  scheduled: number
  attended: number
  noShow: number
  rescheduled: number
  cancelled: number
  pending: number
  revenueCents: number
  currency: string | null
  attendanceRate: number | null
}

export interface ServicesPerformedResponse {
  scope: 'tenant' | 'bot' | 'platform'
  range: { from: string, to: string }
  timezone: string
  totals: ServicesPerformedTotals
  previous: ServicesPerformedTotals
  rows: ServicesPerformedRow[]
}
