import type {
  Case,
  CaseFilters,
  ListCasesOptions,
  PaginatedCases,
  UpdateCasePayload,
} from '~/types/case'

/**
 * Tenant-aware cases API.
 *
 * Without `tenantId` → owner / tenant context (`/cases`, `/customers/:phone/cases`).
 * With `tenantId` → superadmin (`/superadmin/companies/:tenantId/cases`,
 * `/superadmin/companies/:tenantId/customers/:phone/cases`).
 */
export function useCases(tenantId?: string) {
  const api = useApi()
  const casesBase = tenantId
    ? `/superadmin/companies/${tenantId}/cases`
    : '/cases'
  const customersBase = tenantId
    ? `/superadmin/companies/${tenantId}/customers`
    : '/customers'

  function buildQuery(filters?: CaseFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {}
    if (filters?.status) query.status = filters.status
    if (filters?.botId) query.botId = filters.botId
    if (filters?.customerPhone) query.customerPhone = filters.customerPhone
    if (filters?.dateFrom) query.dateFrom = filters.dateFrom
    if (filters?.dateTo) query.dateTo = filters.dateTo
    return query
  }

  return {
    // Legacy unpaginated list — still used by the superadmin company-detail
    // cases page, which keeps the array contract.
    list: (filters?: CaseFilters): Promise<Case[]> => {
      const query = buildQuery(filters)
      return api.get<Case[]>(
        casesBase,
        Object.keys(query).length > 0 ? { query } : undefined,
      )
    },

    /**
     * Paginated cases list for the admin (tenant owner) UI. Only call this
     * without `tenantId` — the matching backend endpoint lives at `/cases`.
     * The superadmin endpoint still returns a flat array via `list()`.
     */
    listPaginated: (opts: ListCasesOptions = {}): Promise<PaginatedCases> => {
      const query = buildQuery(opts)
      if (opts.search) query.search = opts.search
      if (opts.page !== undefined) query.page = opts.page
      if (opts.pageSize !== undefined) query.pageSize = opts.pageSize
      return api.get<PaginatedCases>(
        casesBase,
        Object.keys(query).length > 0 ? { query } : undefined,
      )
    },
    byCustomer: (phone: string, filters?: CaseFilters): Promise<Case[]> => {
      const query = buildQuery(filters)
      return api.get<Case[]>(
        `${customersBase}/${encodeURIComponent(phone)}/cases`,
        Object.keys(query).length > 0 ? { query } : undefined,
      )
    },
    get: (id: string): Promise<Case> =>
      api.get<Case>(`${casesBase}/${id}`),
    update: (id: string, payload: UpdateCasePayload): Promise<Case> =>
      api.patch<Case>(`${casesBase}/${id}`, payload),
    markAttended: (id: string): Promise<Case> =>
      api.patch<Case>(`${casesBase}/${id}`, { status: 'ATTENDED' }),
    markResolved: (id: string, resolution?: string): Promise<Case> =>
      api.patch<Case>(`${casesBase}/${id}`, {
        status: 'RESOLVED',
        ...(resolution ? { resolution } : {}),
      }),
  }
}
