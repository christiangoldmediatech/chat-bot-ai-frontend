export type CaseStatus = 'PENDING' | 'ATTENDED' | 'RESOLVED'
export type CaseResolvedBy = 'BOT' | 'CUSTOMER' | 'AGENT'
export type CasePriority = 'LOW' | 'NORMAL' | 'HIGH'

export interface Case {
  id: string
  botId: string
  conversationId: string
  customerPhone: string
  customerName: string | null
  summary: string
  priority: CasePriority
  status: CaseStatus
  resolution: string | null
  resolvedBy: CaseResolvedBy | null
  advisorEmail: string
  gmailMessageId: string | null
  followupSentAt: string | null
  followupCount: number
  createdAt: string
  attendedAt: string | null
  resolvedAt: string | null
}

export interface CaseFilters {
  status?: CaseStatus
  botId?: string
  customerPhone?: string
  dateFrom?: string
  dateTo?: string
}

export interface UpdateCasePayload {
  status?: CaseStatus
  resolution?: string
}
