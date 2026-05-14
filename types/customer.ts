import type { Conversation } from './conversation'

export interface CustomerSummary {
  customerPhone: string
  customerName: string | null
  conversationCount: number
  openConversationCount: number
  lastMessageAt: string
}

export interface CustomerDetail extends CustomerSummary {
  conversations: Conversation[]
}
