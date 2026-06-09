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
  recentCompanies: SuperadminRecentCompany[]
}
