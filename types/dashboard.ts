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
