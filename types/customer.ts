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

export interface PaginatedCustomers {
  items: CustomerSummary[]
  /** Total customers matching the filters (across all pages). */
  total: number
  page: number
  pageSize: number
}

export interface ListCustomersOptions {
  botId?: string
  /** Case-insensitive substring match on customer name. */
  search?: string
  /** 1-indexed page. */
  page?: number
  /** Defaults to 50 on the backend. */
  pageSize?: number
}
