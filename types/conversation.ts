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

// Mirrors backend Prisma DeliveryStatus. Outbound only — populated as Meta
// emits status webhooks. Null on inbound rows and on legacy outbound rows
// persisted before delivery tracking shipped (renderer treats null as
// "estado desconocido" with no indicator).
export type DeliveryStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

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
  /**
   * Outbound delivery state surfaced from Meta's `statuses` webhook. The
   * chat bubble renders ✓ / ✓✓ / ✓✓ (blue) / ⚠ based on this. Null when
   * inbound, or outbound but no status received yet (legacy row, webhook
   * outage, missing wamid).
   */
  deliveryStatus: DeliveryStatus | null
  /** Free-text error description when deliveryStatus=FAILED. */
  deliveryError: string | null
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
