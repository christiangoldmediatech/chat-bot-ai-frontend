export type ConversationStatus = 'BOT' | 'HUMAN' | 'CLOSED'
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'

// Mirrors backend Prisma MediaType. Null on legacy rows.
export type MessageMediaType =
  | 'TEXT'
  | 'IMAGE'
  | 'DOCUMENT'
  | 'VIDEO'
  | 'AUDIO'
  | 'VOICE'
  | 'STICKER'
  | 'LOCATION'

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
  /**
   * Discriminator. Null on legacy rows persisted before the multimedia
   * migration — the viewer treats null as TEXT.
   */
  mediaType: MessageMediaType | null
  /**
   * Outbound: MediaAsset.id (use it to request a presigned download URL).
   * Inbound: Meta whatsapp media_id (raw — admin lazy-fetches via endpoint).
   * Null for TEXT/LOCATION/legacy rows.
   */
  mediaRef: string | null
  /** Meta wamid — useful for read-receipt correlation. */
  metaMessageId: string | null
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
