export type ConversationStatus = 'BOT' | 'HUMAN' | 'CLOSED'
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'

export interface Conversation {
  id: string
  botId: string
  customerPhone: string
  customerName: string | null
  status: ConversationStatus
  lastMessageAt: string
  createdAt: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface ConversationDetail extends Conversation {
  messages: Message[]
}

export interface FindConversationsQuery {
  botId?: string
  status?: ConversationStatus
  dateFrom?: string
  dateTo?: string
  customerPhone?: string
  q?: string
  page?: number
  limit?: number
}
