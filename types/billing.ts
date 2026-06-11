import type { Plan, TenantStatus } from './company'

export interface BillingCycle {
  id: string
  plan: Plan
  startsAt: string
  endsAt: string
  monthsCovered: number
  isActive: boolean
  isTrial: boolean
  createdAt: string
}

export interface BillingPayment {
  id: string
  billingCycleId: string
  plan: Plan
  amount: number
  currency: string
  monthsCovered: number
  depositImageUrl: string
  note: string | null
  paidAt: string
  registeredById: string
  createdAt: string
}

/**
 * Shape returned by `GET /billing/me` (tenant) and
 * `GET /superadmin/tenants/:id/billing` (superadmin).
 */
export interface BillingState {
  tenantId: string
  tenantStatus: TenantStatus
  plan: Plan
  activeCycle: BillingCycle | null
  daysRemaining: number | null
  payments: BillingPayment[]
}

export interface ExpiringTenant {
  tenantId: string
  tenantName: string
  tenantSlug: string
  endsAt: string
  daysRemaining: number
}

export interface RegisterPaymentInput {
  monthsCovered: number
  paidAt?: string
  note?: string
}

export interface SweepResult {
  expired: number
}
