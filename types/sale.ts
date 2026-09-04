export type SaleStatus = 'PENDING' | 'WON' | 'LOST'
export type SaleDeliveryStatus = 'NOT_DELIVERED' | 'DELIVERED'
export type SaleDateBasis = 'soldAt' | 'serviceDate'

export interface Sale {
  id: string
  botId: string
  customerId: string
  serviceId: string | null
  conversationId: string | null
  leadId: string | null
  appointmentId: string | null
  serviceNameSnapshot: string
  unitPriceSnapshotCents: number
  currencySnapshot: string
  quantity: number
  discountCents: number
  totalAmountCents: number
  status: SaleStatus
  soldAt: string | null
  serviceDate: string | null
  deliveryStatus: SaleDeliveryStatus
  lostAt: string | null
  lostReason: string | null
  notes: string | null
  markedByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateSaleInput {
  customerId: string
  serviceId: string
  quantity?: number
  discountCents?: number
  soldAt?: string
  serviceDate?: string
  conversationId?: string
  appointmentId?: string
  notes?: string
}

export interface UpdateSaleInput {
  quantity?: number
  discountCents?: number
  soldAt?: string
  serviceDate?: string
  deliveryStatus?: SaleDeliveryStatus
  notes?: string
}

export interface MarkWonInput {
  soldAt?: string
  serviceDate?: string
  quantity?: number
  discountCents?: number
  notes?: string
}

export interface MarkLostInput {
  lostReason?: string
}

export interface ListSalesQuery {
  status?: SaleStatus
  serviceId?: string
  customerId?: string
  from?: string
  to?: string
  dateBasis?: SaleDateBasis
  page?: number
  pageSize?: number
}

export interface PaginatedSales {
  items: Sale[]
  total: number
  page: number
  pageSize: number
}

export interface CustomerSalesHistory {
  sales: Sale[]
  totalSpentCents: number
  currency: string
  wonCount: number
}
