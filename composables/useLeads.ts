import type {
  Lead,
  LeadDetail,
  LeadFilters,
  ListLeadsOptions,
  PaginatedLeads,
  UpdateLeadPayload,
} from '~/types/lead'

/**
 * Tenant-aware leads API.
 *
 * Without `tenantId` → owner / tenant admin (`/leads`).
 * With `tenantId` → superadmin per-company drill-down
 *   (`/superadmin/companies/:tenantId/leads`).
 *
 * The cross-tenant superadmin global view (`/superadmin/leads`) is a
 * separate composable concern — added in Phase 4.
 */
export function useLeads(tenantId?: string) {
  const api = useApi()
  const base = tenantId
    ? `/superadmin/companies/${tenantId}/leads`
    : '/leads'

  function buildQuery(filters?: LeadFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {}
    if (filters?.status) query.status = filters.status
    if (filters?.interest) query.interest = filters.interest
    if (filters?.botId) query.botId = filters.botId
    if (filters?.customerPhone) query.customerPhone = filters.customerPhone
    if (filters?.hasCrm !== undefined) query.hasCrm = filters.hasCrm
    if (filters?.dateFrom) query.dateFrom = filters.dateFrom
    if (filters?.dateTo) query.dateTo = filters.dateTo
    return query
  }

  return {
    /** Flat list used by the superadmin per-company page (no pagination). */
    list: (filters?: LeadFilters): Promise<Lead[]> => {
      const query = buildQuery(filters)
      return api.get<Lead[]>(
        base,
        Object.keys(query).length > 0 ? { query } : undefined,
      )
    },

    /** Paginated list — admin (tenant owner) UI. */
    listPaginated: (opts: ListLeadsOptions = {}): Promise<PaginatedLeads> => {
      const query = buildQuery(opts)
      if (opts.search) query.search = opts.search
      if (opts.page !== undefined) query.page = opts.page
      if (opts.pageSize !== undefined) query.pageSize = opts.pageSize
      return api.get<PaginatedLeads>(
        base,
        Object.keys(query).length > 0 ? { query } : undefined,
      )
    },

    get: (id: string): Promise<LeadDetail> =>
      api.get<LeadDetail>(`${base}/${id}`),

    update: (id: string, payload: UpdateLeadPayload): Promise<Lead> =>
      api.patch<Lead>(`${base}/${id}`, payload),

    /**
     * Enqueue a manual CRM sync retry. Returns void — the backend responds
     * 202 Accepted; poll `get()` for the updated `crmSyncStatus`.
     */
    syncCrm: (id: string): Promise<void> =>
      api.post<void>(`${base}/${id}/sync-crm`, {}),

    /**
     * Build the public URL for the CSV export endpoint. Returns a fully-
     * qualified URL the browser can use as `<a href>` — we deliberately
     * skip going through `useApi` here because file downloads need a
     * direct request the browser controls (so the Content-Disposition
     * header triggers the save dialog).
     */
    exportCsvUrl: (filters?: ListLeadsOptions): string => {
      const config = useRuntimeConfig()
      const apiBase = config.public.apiBaseUrl as string
      const query = new URLSearchParams()
      if (filters?.status) query.set('status', filters.status)
      if (filters?.interest) query.set('interest', filters.interest)
      if (filters?.botId) query.set('botId', filters.botId)
      if (filters?.customerPhone) query.set('customerPhone', filters.customerPhone)
      if (filters?.hasCrm !== undefined) query.set('hasCrm', String(filters.hasCrm))
      if (filters?.dateFrom) query.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo) query.set('dateTo', filters.dateTo)
      const qs = query.toString()
      return `${apiBase}${base}/export${qs ? `?${qs}` : ''}`
    },

    /**
     * Trigger the CSV download programmatically. Uses fetch with the bearer
     * token (export endpoint is JWT-protected) and streams the response to
     * a Blob, then triggers an `<a download>` click.
     */
    downloadCsv: async (filters?: ListLeadsOptions): Promise<void> => {
      if (!import.meta.client) return
      const config = useRuntimeConfig()
      const apiBase = config.public.apiBaseUrl as string
      const query = new URLSearchParams()
      if (filters?.status) query.set('status', filters.status)
      if (filters?.interest) query.set('interest', filters.interest)
      if (filters?.botId) query.set('botId', filters.botId)
      if (filters?.customerPhone) query.set('customerPhone', filters.customerPhone)
      if (filters?.hasCrm !== undefined) query.set('hasCrm', String(filters.hasCrm))
      if (filters?.dateFrom) query.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo) query.set('dateTo', filters.dateTo)
      const qs = query.toString()
      const url = `${apiBase}${base}/export${qs ? `?${qs}` : ''}`

      // Pick the right auth store based on whether this is a tenant or
      // superadmin call — useApi() does this automatically, but here we
      // need raw fetch to keep the response as a Blob.
      const token = tenantId
        ? useSuperadminAuthStore().token
        : useAuthStore().token
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`)
      }
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    },

    /**
     * Trigger the CRM backfill — enqueues a sync job for every Lead that
     * is currently NOT_CONFIGURED (optionally filtered by bot). Returns
     * the number of jobs enqueued. Useful after connecting a CRM that
     * was inactive when leads were originally created.
     */
    backfillCrm: (botId?: string): Promise<{ enqueued: number }> =>
      api.post<{ enqueued: number }>(
        `${base}/backfill-crm${botId ? `?botId=${botId}` : ''}`,
        {},
      ),
  }
}

/**
 * Cross-tenant leads list — only available to platform superadmins. Backed
 * by `GET /superadmin/leads` which bypasses tenant scoping. Use this for
 * the global view; for per-company drill-down, prefer `useLeads(tenantId)`
 * which goes through the tenant-scoped Prisma proxy.
 */
export interface GlobalLeadFilters {
  tenantId?: string
  status?: import('~/types/lead').LeadStatus
  interest?: import('~/types/lead').LeadInterest
  botId?: string
  hasCrm?: boolean
}

export interface GlobalLeadsListOptions extends GlobalLeadFilters {
  search?: string
  page?: number
  pageSize?: number
}

export function useSuperadminLeads() {
  const api = useApi()

  return {
    /**
     * Cross-tenant paginated list. The global /superadmin/leads page uses
     * this with a `pageSize` of 50 so the most recent leads always show
     * up first regardless of how many leads exist platform-wide.
     */
    listPaginated: (opts: GlobalLeadsListOptions = {}): Promise<import('~/types/lead').PaginatedLeads> => {
      const query: Record<string, unknown> = {}
      if (opts.tenantId) query.tenantId = opts.tenantId
      if (opts.status) query.status = opts.status
      if (opts.interest) query.interest = opts.interest
      if (opts.botId) query.botId = opts.botId
      if (opts.hasCrm !== undefined) query.hasCrm = opts.hasCrm
      if (opts.search) query.search = opts.search
      if (opts.page !== undefined) query.page = opts.page
      if (opts.pageSize !== undefined) query.pageSize = opts.pageSize
      return api.get<import('~/types/lead').PaginatedLeads>(
        '/superadmin/leads',
        Object.keys(query).length > 0 ? { query } : undefined,
      )
    },

    /**
     * Cross-tenant single-lead detail. Lets the superadmin open any lead
     * by id without first knowing its tenantId.
     */
    get: (id: string): Promise<import('~/types/lead').LeadDetail> =>
      api.get<import('~/types/lead').LeadDetail>(`/superadmin/leads/${id}`),

    /** Cross-tenant update (status / note / name / email). */
    update: (
      id: string,
      payload: import('~/types/lead').UpdateLeadPayload,
    ): Promise<import('~/types/lead').Lead> =>
      api.patch<import('~/types/lead').Lead>(`/superadmin/leads/${id}`, payload),

    /** Cross-tenant manual CRM sync retry. Backend responds 202. */
    syncCrm: (id: string): Promise<void> =>
      api.post<void>(`/superadmin/leads/${id}/sync-crm`, {}),

    /**
     * Cross-tenant backfill — only callable by platform admins. Without
     * filters it sweeps every NOT_CONFIGURED lead in every tenant; with
     * `tenantId` or `botId` it narrows the scope. Returns the number of
     * sync jobs enqueued.
     */
    backfillAllCrm: (opts: { tenantId?: string; botId?: string } = {}): Promise<{ enqueued: number }> => {
      const params = new URLSearchParams()
      if (opts.tenantId) params.set('tenantId', opts.tenantId)
      if (opts.botId) params.set('botId', opts.botId)
      const qs = params.toString()
      return api.post<{ enqueued: number }>(
        `/superadmin/leads/backfill-crm${qs ? `?${qs}` : ''}`,
        {},
      )
    },
  }
}
