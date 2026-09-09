export interface BusinessHoursRule {
  id?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

export interface BusinessHoursConfig {
  timezone: string
  slotGranularityMinutes: number
  bufferMinutes: number
  minNoticeHours: number
  maxAdvanceDays: number
  defaultDurationMinutes: number
  rules: BusinessHoursRule[]
}

export interface ReplaceBusinessHoursPayload {
  rules: Array<Omit<BusinessHoursRule, 'id'>>
  slotGranularityMinutes?: number
  bufferMinutes?: number
  minNoticeHours?: number
  maxAdvanceDays?: number
  defaultDurationMinutes?: number
}

export interface AffectedMeeting {
  id: string
  startTime: string
  endTime: string
  attendeeName: string | null
  attendeeEmail: string
  topic: string | null
  status: string
}

export interface ScheduleBlock {
  id: string
  botId: string
  startsAt: string
  endsAt: string
  allDay: boolean
  reason: string
  publicMessage: string | null
  createdByUserId: string | null
  affectedMeetings?: AffectedMeeting[]
  createdAt: string
  updatedAt: string
}

export interface CreateScheduleBlockPayload {
  startsAt: string
  endsAt: string
  allDay?: boolean
  reason: string
  publicMessage?: string | null
}

export interface UpdateScheduleBlockPayload {
  startsAt?: string
  endsAt?: string
  allDay?: boolean
  reason?: string
  publicMessage?: string | null
}
