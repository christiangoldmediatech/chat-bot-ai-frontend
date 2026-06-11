import type { Conversation } from '~/types/conversation'
import type {
  CustomerDetail,
  CustomerSummary,
  ListCustomersOptions,
  PaginatedCustomers,
} from '~/types/customer'
import type { Meeting, MeetingFilters } from '~/types/meeting'

/**
 * Tenant-aware customers API.
 *
 * Without `tenantId` → talks to `/customers/...` (owner / tenant context).
 * With `tenantId` → talks to `/superadmin/companies/:tenantId/customers/...`.
 */
export function useCustomers(tenantId?: string) {
  const api = useApi()
  const base = tenantId
    ? `/superadmin/companies/${tenantId}/customers`
    : '/customers'

  return {
    // Used by the superadmin company-detail customers list, which keeps the
    // unpaginated contract. The admin (tenant-owner) UI should use
    // `listPaginated` instead — the admin endpoint now returns a paginated
    // envelope.
    list: (botId?: string): Promise<CustomerSummary[]> =>
      api.get<CustomerSummary[]>(base, botId ? { query: { botId } } : undefined),

    /**
     * Paginated customers list. ONLY valid when called without a `tenantId` in
     * the parent composable — the matching backend endpoint lives at
     * `/customers` (tenant owner context). The superadmin endpoint at
     * `/superadmin/companies/:id/customers` still returns a flat array.
     */
    listPaginated: (opts: ListCustomersOptions = {}): Promise<PaginatedCustomers> => {
      const query: Record<string, unknown> = {}
      if (opts.botId) query.botId = opts.botId
      if (opts.search) query.search = opts.search
      if (opts.page !== undefined) query.page = opts.page
      if (opts.pageSize !== undefined) query.pageSize = opts.pageSize
      return api.get<PaginatedCustomers>(
        base,
        Object.keys(query).length > 0 ? { query } : undefined,
      )
    },
    get: (phone: string): Promise<CustomerDetail> =>
      api.get<CustomerDetail>(`${base}/${encodeURIComponent(phone)}`),
    conversations: (phone: string): Promise<Conversation[]> =>
      api.get<Conversation[]>(`${base}/${encodeURIComponent(phone)}/conversations`),
    meetings: (phone: string, filters?: MeetingFilters): Promise<Meeting[]> => {
      const query: Record<string, unknown> = {}
      if (filters?.status) query.status = filters.status
      if (filters?.dateFrom) query.dateFrom = filters.dateFrom
      if (filters?.dateTo) query.dateTo = filters.dateTo
      return api.get<Meeting[]>(
        `${base}/${encodeURIComponent(phone)}/meetings`,
        Object.keys(query).length > 0 ? { query } : undefined,
      )
    },
  }
}
