export type IntegrationProvider =
  | 'GOOGLE_CALENDAR'
  | 'SALESFORCE'
  | 'ZOHO_CRM'
  | 'HUBSPOT'
  | 'CUSTOM_WEBHOOK'

export interface Integration {
  provider: IntegrationProvider
  isActive: boolean
  accountEmail: string
  calendarId: string
  timezone: string
  defaultDurationMinutes: number
  workingHoursStart: string
  workingHoursEnd: string
  advisorEmail: string | null
  advisorName: string | null
  advisorWhatsapp: string | null
  followupHours: number
  createdAt: string
}

export interface UpdateIntegrationPayload {
  advisorEmail?: string | null
  advisorName?: string | null
  advisorWhatsapp?: string | null
  followupHours?: number
}

export interface ConnectUrlResponse {
  url: string
}
