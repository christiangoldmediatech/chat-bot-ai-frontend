export type SaleStatus = 'PENDING' | 'WON' | 'LOST'
export type SaleDeliveryStatus = 'NOT_DELIVERED' | 'DELIVERED'
export type SaleDateBasis = 'soldAt' | 'serviceDate'
export type CalendarEventStatus =
  | 'CREATED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'RESCHEDULED'
export type AttendanceSummary =
  | 'ATTENDED'
  | 'SCHEDULED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'NO_MEETING'

export type SaleAuditEventType =
  | 'CREATED'
  | 'MARKED_WON'
  | 'MARKED_LOST'
  | 'REVERTED'
  | 'UPDATED'
  | 'DELETED'
export type SaleAuditActorType = 'USER' | 'BOT' | 'SYSTEM'

export interface SaleCustomerRef {
  id: string
  name: string | null
  phone: string
}

export interface SaleAppointmentRef {
  id: string
  startTime: string
  endTime: string
  status: CalendarEventStatus
  confirmedAt: string | null
}

export interface SaleActorRef {
  id: string
  email: string
}

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
  statusChangedAt: string | null
  statusChangeReason: string | null
  customer: SaleCustomerRef | null
  appointment: SaleAppointmentRef | null
  statusChangedBy: SaleActorRef | null
  attendanceSummary: AttendanceSummary
  createdAt: string
  updatedAt: string
}

export interface SaleAuditLogEntry {
  id: string
  eventType: SaleAuditEventType
  fromStatus: SaleStatus | null
  toStatus: SaleStatus | null
  reason: string | null
  actorType: SaleAuditActorType
  actorUserId: string | null
  actorEmail: string | null
  actorLabel: string | null
  createdAt: string
}

export interface SaleDetail extends Sale {
  history: SaleAuditLogEntry[]
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
  reason?: string
}

export interface MarkLostInput {
  reason?: string
  /** @deprecated usa `reason`. */
  lostReason?: string
}

export interface ListSalesQuery {
  status?: SaleStatus
  serviceId?: string
  customerId?: string
  attendance?: AttendanceSummary
  search?: string
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
