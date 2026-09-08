import type { Conversation } from './conversation'

export interface DashboardSummary {
  bots: number
  activeBots: number
  inactiveBots: number
  conversations: number
  openConversations: number
  humanConversations: number
  customers: number
  documents: number
  totalLeads: number
  newLeads: number
  qualifiedLeads: number
  wonLeads: number
  recentConversations: Conversation[]
}

export interface SuperadminRecentCompany {
  id: string
  name: string
  slug: string
  createdAt: string
}

export type MessagesActivityRange = 'day' | 'week' | 'month'

export interface MessagesActivityBucket {
  bucket: string // ISO 8601 start of the bucket
  received: number
  sent: number
  total: number
}

export interface MessagesActivityTotals {
  received: number
  sent: number
  total: number
}

export interface MessagesActivity {
  range: MessagesActivityRange
  windowStart: string
  windowEnd: string
  totals: MessagesActivityTotals
  series: MessagesActivityBucket[]
}

export interface SuperadminDashboardSummary {
  totalCompanies: number
  activeCompanies: number
  suspendedCompanies: number
  totalUsers: number
  totalBots: number
  activeBots: number
  totalConversations: number
  totalDocuments: number
  totalLeads: number
  newLeads: number
  wonLeads: number
  /** Leads whose latest CRM sync attempt is in FAILED state. */
  failedCrmSyncs: number
  recentCompanies: SuperadminRecentCompany[]
}

// ─── New metrics module (dashboard v2) ──────────────────────────────────────

export type MetricsInterval = 'day' | 'month' | 'year'

export type TimeseriesMetric =
  | 'conversations'
  | 'leads'
  | 'messagesSentByBot'
  | 'messagesReceived'
  | 'meetingsScheduled'
  | 'meetingsHeld'
  | 'meetingsCancelled'

export interface MetricsSummaryTotals {
  messagesSentByBot: number
  messagesSentByHuman: number
  messagesReceived: number
  conversationsTotal: number
  conversationsOpen: number
  conversationsHandledByHuman: number
  uniqueCustomers: number
  leadsTotal: number
  leadsNew: number
  leadsQualified: number
  leadsWon: number
  meetingsScheduled: number
  meetingsCancelled: number
  meetingsNoShow: number
  meetingsUpcoming: number
}

export interface MetricsSummaryResponse {
  scope: 'tenant' | 'bot' | 'platform'
  range: { from: string; to: string; interval: MetricsInterval }
  timezone: string
  timezoneMixed: boolean
  totals: MetricsSummaryTotals
  previous: MetricsSummaryTotals
}

export interface MetricsBucket {
  date: string
  value: number
}

export interface MetricsTimeseriesResponse {
  metric: TimeseriesMetric
  dateField: string
  interval: MetricsInterval
  timezone: string
  buckets: MetricsBucket[]
  total: number
  previousTotal: number
}

export interface TodayTimelineEntry {
  conversationId: string
  customerPhone: string
  customerName: string | null
  status: 'BOT' | 'HUMAN' | 'CLOSED'
  firstMessageAt: string
  lastMessageAt: string
  messageCount: number
  isLead: boolean
  leadStatus: string | null
}

export interface TodayTimelineResponse {
  timezone: string
  today: string
  totalConversations: number
  convertedToLead: number
  conversionRate: number
  entries: TodayTimelineEntry[]
}

export interface MeetingsSummaryResponse {
  range: { from: string; to: string }
  timezone: string
  scheduled: number
  cancelled: number
  noShow: number
  completed: number
  upcoming: number
  cancellationRate: number
  cancellationDataSince: string | null
}

export interface MeetingsByCustomerRow {
  customerPhone: string
  customerName: string | null
  customerId: string | null
  scheduled: number
  cancelled: number
  noShow: number
  completed: number
  cancellationRate: number
  lastMeetingAt: string | null
}

export interface MeetingsByCustomerResponse {
  range: { from: string; to: string }
  timezone: string
  page: number
  pageSize: number
  total: number
  rows: MeetingsByCustomerRow[]
}

export interface PlatformByTenantRow {
  tenantId: string
  tenantName: string
  tenantSlug: string
  botsTotal: number
  botsActive: number
  messagesSentByBot: number
  conversations: number
  leads: number
  conversionRate: number
  meetingsScheduled: number
  meetingsCancelled: number
  cancellationRate: number
}
