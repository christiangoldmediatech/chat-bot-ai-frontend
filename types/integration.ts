export type IntegrationProvider = 'GOOGLE_CALENDAR'

export interface Integration {
  provider: IntegrationProvider
  isActive: boolean
  accountEmail: string
  calendarId: string
  timezone: string
  defaultDurationMinutes: number
  workingHoursStart: string
  workingHoursEnd: string
  createdAt: string
}

export interface ConnectUrlResponse {
  url: string
}
