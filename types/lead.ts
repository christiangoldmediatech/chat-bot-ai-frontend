// Backend enum mirrors — KEEP IN SYNC with prisma/schema.prisma in
// chat-bot-ai-backend. These ship through the API as raw strings; the
// frontend renders i18n labels via `leads.status.*` / `leads.interest.*`.

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'

export type LeadInterest = 'LOW' | 'MEDIUM' | 'HIGH'

export type LeadCrmSyncStatus = 'NOT_CONFIGURED' | 'PENDING' | 'SYNCED' | 'FAILED'

export type LeadEventType =
  | 'CREATED'
  | 'SIGNAL_PRICE_ASKED'
  | 'SIGNAL_DEMO_REQUESTED'
  | 'SIGNAL_MEETING_REQUESTED'
  | 'SIGNAL_QUOTE_REQUESTED'
  | 'SIGNAL_EMAIL_CAPTURED'
  | 'SIGNAL_PHONE_CAPTURED'
  | 'SIGNAL_HUMAN_REQUESTED'
  | 'SIGNAL_BOT_KEYWORD'
  | 'STATUS_CHANGED'
  | 'CRM_SYNC_OK'
  | 'CRM_SYNC_FAIL'
  | 'MANUAL_NOTE'

/** CRM provider strings reused from the existing CRM module. */
export type CrmProvider =
  | 'GOOGLE_CALENDAR'
  | 'SALESFORCE'
  | 'ZOHO_CRM'
  | 'HUBSPOT'
  | 'CUSTOM_WEBHOOK'

export interface Lead {
  id: string
  tenantId: string
  botId: string
  conversationId: string
  customerPhone: string
  customerName: string | null
  customerEmail: string | null
  score: number
  interest: LeadInterest
  /** 0-100, derived from score on the backend. */
  conversionProb: number
  status: LeadStatus
  lastSignalAt: string | null
  lastSignalType: LeadEventType | null
  reason: string | null
  crmSyncStatus: LeadCrmSyncStatus
  crmProvider: CrmProvider | null
  crmLeadId: string | null
  crmLeadUrl: string | null
  crmSyncedAt: string | null
  crmLastError: string | null
  /**
   * Generic LeadPayload snapshot — the exact JSON that would be / was sent
   * to the CRM strategy. Recomputed on every signal application and admin
   * update regardless of whether a CRM is connected. Null only for legacy
   * rows that predate Phase 23 follow-up.
   */
  crmPayload: Record<string, unknown> | null
  crmPayloadAt: string | null
  statusChangedById: string | null
  statusChangedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LeadEvent {
  id: string
  leadId: string
  type: LeadEventType
  scoreDelta: number
  fromStatus: LeadStatus | null
  toStatus: LeadStatus | null
  actorUserId: string | null
  messageId: string | null
  payload: Record<string, unknown>
  createdAt: string
}

/** Detail response — list endpoint returns Lead only. */
export interface LeadDetail extends Lead {
  events: LeadEvent[]
}

export interface LeadFilters {
  status?: LeadStatus
  interest?: LeadInterest
  botId?: string
  customerPhone?: string
  /** true → only CRM-synced; false → only non-synced. Omit for both. */
  hasCrm?: boolean
  dateFrom?: string
  dateTo?: string
}

export interface ListLeadsOptions extends LeadFilters {
  /** Case-insensitive substring match against name, phone, email, or reason. */
  search?: string
  /** 1-indexed page. */
  page?: number
  /** Defaults to 50 on the backend, max 200. */
  pageSize?: number
}

export interface PaginatedLeads {
  items: Lead[]
  total: number
  page: number
  pageSize: number
}

export interface UpdateLeadPayload {
  status?: LeadStatus
  note?: string
  customerName?: string
  customerEmail?: string
}
