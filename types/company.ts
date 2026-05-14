export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE'
export type TenantStatus = 'ACTIVE' | 'SUSPENDED'

// Tenant-side (Mi empresa): the single tenant the logged-in user belongs to.
export interface Tenant {
  id: string
  name: string
  slug: string
  plan: Plan
  status: TenantStatus
  createdAt: string
}

// Super-admin side: cross-tenant listing entry.
export interface Company {
  id: string
  name: string
  slug: string
  plan: Plan
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
