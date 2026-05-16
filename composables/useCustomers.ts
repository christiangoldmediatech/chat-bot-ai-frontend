import type { Conversation } from '~/types/conversation'
import type { CustomerDetail, CustomerSummary } from '~/types/customer'
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
    list: (botId?: string): Promise<CustomerSummary[]> =>
      api.get<CustomerSummary[]>(base, botId ? { query: { botId } } : undefined),
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
