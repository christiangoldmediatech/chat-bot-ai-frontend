export type Plan = 'BASIC' | 'PROFESSIONAL' | 'PREMIUM'
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_PAYMENT'

// Mirrors backend PlanResponseDto. Always present on Tenant / Company payloads
// — the frontend should consume `planDetails` instead of hard-coding labels.
export interface PlanLimits {
  /** Max bots allowed by this plan. null = unlimited. */
  bots: number | null
  /** Max RAG documents per bot allowed by this plan. null = unlimited. */
  documentsPerBot: number | null
}

export interface PlanDetails {
  code: Plan
  displayName: string
  monthlyPrice: number
  currency: string
  features: string[]
  limits: PlanLimits
}

// Tenant-side (Mi empresa): the single tenant the logged-in user belongs to.
export interface Tenant {
  id: string
  name: string
  slug: string
  plan: Plan
  planDetails: PlanDetails
  status: TenantStatus
  createdAt: string
}

// Super-admin side: cross-tenant listing entry.
export interface Company {
  id: string
  name: string
  slug: string
  plan: Plan
  planDetails: PlanDetails
  status: TenantStatus
  userCount: number
  botCount: number
  conversationCount: number
  createdAt: string
}

export interface CompanyUser {
  id: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'AGENT'
  createdAt: string
}

export interface CompanyBot {
  id: string
  name: string
  phoneNumber: string | null
  isActive: boolean
  createdAt: string
}

export interface CompanyDetail extends Company {
  users: CompanyUser[]
  bots: CompanyBot[]
}

export interface CreateCompanyInput {
  name: string
  slug: string
  ownerEmail: string
  ownerPassword: string
}

export interface UpdateCompanyInput {
  name?: string
  plan?: Plan
  status?: TenantStatus
}
