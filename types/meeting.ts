export type MeetingStatus =
  | 'CREATED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'RESCHEDULED'

export type MeetingOutcome = 'COMPLETED' | 'NO_SHOW' | 'RESCHEDULED'

export interface Meeting {
  id: string
  conversationId: string
  botId: string
  botName: string
  customerPhone: string
  attendeeEmail: string
  attendeeName: string | null
  topic: string | null
  startTime: string
  endTime: string
  meetLink: string | null
  status: MeetingStatus
  outcomeNote: string | null
  outcomeAskedAt: string | null
  createdAt: string
}

export interface MeetingFilters {
  status?: MeetingStatus
  dateFrom?: string
  dateTo?: string
}

export type MeetingsTab = 'UPCOMING' | 'PAST' | 'CANCELLED' | 'ALL'

export interface MeetingsCounts {
  upcoming: number
  past: number
  cancelled: number
  total: number
}

export interface PaginatedMeetings {
  rows: Meeting[]
  total: number
  page: number
  pageSize: number
  counts: MeetingsCounts
}
