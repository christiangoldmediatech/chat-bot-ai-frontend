export type BlockStatus =
  | 'NONE'
  | 'AUTO_BLOCKED'
  | 'MANUAL_BLOCKED'
  | 'MANUAL_UNBLOCKED'

export type SecurityAuditAction = 'MANUAL_BLOCK' | 'MANUAL_UNBLOCK'

export interface SecurityEventEntry {
  type: string
  category?: string
  score?: number
  totalScore?: number
  reason?: string
  blockedUntil?: string
  at: string
  actor?: { kind: 'USER' | 'PLATFORM_ADMIN'; id: string; role: string }
}

export interface SecurityStatus {
  conversationId: string
  customerPhone: string
  suspiciousScore: number
  suspiciousCount: number
  blockStatus: BlockStatus
  blockedAt: string | null
  unblockedAt: string | null
  blockedUntil: string | null
  lastSuspiciousReason: string | null
  lastBlockedByUserId: string | null
  lastBlockedByPlatformAdminId: string | null
  lastUnblockedByUserId: string | null
  lastUnblockedByPlatformAdminId: string | null
  isBlocked: boolean
  events: SecurityEventEntry[]
  createdAt: string
  updatedAt: string
}

export interface SecurityAuditEntry {
  id: string
  conversationId: string
  botId: string
  action: SecurityAuditAction
  performedByUserId: string | null
  performedByPlatformAdminId: string | null
  performedByRole: string
  reason: string | null
  previousAccumulator: unknown
  createdAt: string
}

export interface BlockedConversationListItem extends SecurityStatus {
  botId: string | null
}

export interface BlockedConversationListResponse {
  items: BlockedConversationListItem[]
  total: number
  page: number
  pageSize: number
}

export interface ListBlockedQuery {
  botId?: string
  securityStatus?: 'AUTO_BLOCKED' | 'MANUAL_BLOCKED'
  page?: number
  pageSize?: number
}
