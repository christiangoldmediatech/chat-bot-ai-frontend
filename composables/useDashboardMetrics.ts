import type {
  MeetingsByCustomerResponse,
  MeetingsSummaryResponse,
  MetricsInterval,
  MetricsSummaryResponse,
  MetricsTimeseriesResponse,
  PlatformByBotRow,
  PlatformByTenantRow,
  TimeseriesMetric,
  TodayTimelineResponse,
} from '~/types/dashboard'
import type { ServicesPerformedResponse } from '~/types/service-history'

/**
 * Two backends live behind these composables:
 *   - Tenant admin: /admin/dashboard/*
 *   - Super admin (platform-wide): /superadmin/dashboard/*
 *   - Super admin peeking a tenant: /superadmin/companies/:tenantId/dashboard/*
 *
 * We keep them explicit rather than "route based on role" so a call site
 * always knows which scope it's on.
 */

export interface RangeInput {
  from?: string
  to?: string
  interval?: MetricsInterval
  botId?: string
}

function query(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

export function useTenantDashboardMetrics() {
  const api = useApi()
  const base = '/admin/dashboard/metrics'

  return {
    summary: (input: RangeInput = {}): Promise<MetricsSummaryResponse> =>
      api.get<MetricsSummaryResponse>(`${base}/summary`, { query: query({ ...input }) }),

    timeseries: (
      metric: TimeseriesMetric,
      input: RangeInput = {},
    ): Promise<MetricsTimeseriesResponse> =>
      api.get<MetricsTimeseriesResponse>(`${base}/timeseries`, {
        query: query({ ...input, metric }),
      }),

    todayTimeline: (botId?: string): Promise<TodayTimelineResponse> =>
      api.get<TodayTimelineResponse>(`${base}/today-timeline`, {
        query: query({ botId }),
      }),

    meetingsSummary: (input: RangeInput = {}): Promise<MeetingsSummaryResponse> =>
      api.get<MeetingsSummaryResponse>(`${base}/meetings/summary`, { query: query({ ...input }) }),

    meetingsByCustomer: (
      input: RangeInput & { page?: number; pageSize?: number; sort?: string } = {},
    ): Promise<MeetingsByCustomerResponse> =>
      api.get<MeetingsByCustomerResponse>(`${base}/meetings/by-customer`, {
        query: query({ ...input }),
      }),

    servicesPerformed: (input: RangeInput = {}): Promise<ServicesPerformedResponse> =>
      api.get<ServicesPerformedResponse>(`${base}/services-performed`, {
        query: query({ ...input }),
      }),
  }
}

export function usePlatformDashboardMetrics() {
  const api = useApi()
  const base = '/superadmin/dashboard/metrics'

  return {
    summary: (input: RangeInput = {}): Promise<MetricsSummaryResponse> =>
      api.get<MetricsSummaryResponse>(`${base}/summary`, { query: query({ ...input }) }),

    timeseries: (
      metric: TimeseriesMetric,
      input: RangeInput = {},
    ): Promise<MetricsTimeseriesResponse> =>
      api.get<MetricsTimeseriesResponse>(`${base}/timeseries`, {
        query: query({ ...input, metric }),
      }),

    byTenant: (
      input: RangeInput = {},
    ): Promise<{ range: { from: string; to: string }; rows: PlatformByTenantRow[] }> =>
      api.get<{ range: { from: string; to: string }; rows: PlatformByTenantRow[] }>(
        `${base}/by-tenant`,
        { query: query({ ...input }) },
      ),

    byBot: (
      input: RangeInput = {},
    ): Promise<{ range: { from: string; to: string }; rows: PlatformByBotRow[] }> =>
      api.get<{ range: { from: string; to: string }; rows: PlatformByBotRow[] }>(
        `${base}/by-bot`,
        { query: query({ ...input }) },
      ),
  }
}

export function useSuperadminTenantDashboardMetrics(tenantId: string) {
  const api = useApi()
  const base = `/superadmin/companies/${tenantId}/dashboard/metrics`

  return {
    summary: (input: RangeInput = {}): Promise<MetricsSummaryResponse> =>
      api.get<MetricsSummaryResponse>(`${base}/summary`, { query: query({ ...input }) }),

    timeseries: (
      metric: TimeseriesMetric,
      input: RangeInput = {},
    ): Promise<MetricsTimeseriesResponse> =>
      api.get<MetricsTimeseriesResponse>(`${base}/timeseries`, {
        query: query({ ...input, metric }),
      }),

    todayTimeline: (botId?: string): Promise<TodayTimelineResponse> =>
      api.get<TodayTimelineResponse>(`${base}/today-timeline`, {
        query: query({ botId }),
      }),

    meetingsSummary: (input: RangeInput = {}): Promise<MeetingsSummaryResponse> =>
      api.get<MeetingsSummaryResponse>(`${base}/meetings/summary`, { query: query({ ...input }) }),

    meetingsByCustomer: (
      input: RangeInput & { page?: number; pageSize?: number; sort?: string } = {},
    ): Promise<MeetingsByCustomerResponse> =>
      api.get<MeetingsByCustomerResponse>(`${base}/meetings/by-customer`, {
        query: query({ ...input }),
      }),

    servicesPerformed: (input: RangeInput = {}): Promise<ServicesPerformedResponse> =>
      api.get<ServicesPerformedResponse>(`${base}/services-performed`, {
        query: query({ ...input }),
      }),
  }
}
