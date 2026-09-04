export type RevenueGroupBy = 'service' | 'customer' | 'month'
export type RevenueDateBasis = 'soldAt' | 'serviceDate'

export interface RevenueBreakdownRow {
  key: string
  label: string
  count: number
  totalCents: number
  currency: string
  unitsSold: number
}

export interface RevenueTotalByCurrency {
  currency: string
  totalCents: number
  saleCount: number
}

export interface RevenueReport {
  dateBasis: RevenueDateBasis
  groupBy: RevenueGroupBy
  from: string
  to: string
  breakdown: RevenueBreakdownRow[]
  totalRevenue: RevenueTotalByCurrency[]
  pipeline: RevenueTotalByCurrency[]
  lost: RevenueTotalByCurrency[]
  notDelivered: RevenueTotalByCurrency[]
}

export interface RevenueQuery {
  from: string
  to: string
  dateBasis: RevenueDateBasis
  groupBy: RevenueGroupBy
}
