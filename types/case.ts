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

export interface ListCasesOptions extends CaseFilters {
  /** Case-insensitive substring match against customer name, phone or summary. */
  search?: string
  /** 1-indexed page. */
  page?: number
  /** Defaults to 50 on the backend. */
  pageSize?: number
}

export interface PaginatedCases {
  items: Case[]
  total: number
  page: number
  pageSize: number
}

export interface UpdateCasePayload {
  status?: CaseStatus
  resolution?: string
}
