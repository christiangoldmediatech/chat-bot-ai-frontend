import type {
  ServiceHistoryQuery,
  ServiceHistoryResponse,
} from '~/types/service-history'

function query(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

export function useServiceHistory(tenantId?: string) {
  const api = useApi()
  const base = (botId: string, phone: string): string =>
    tenantId
      ? `/superadmin/companies/${tenantId}/bots/${botId}/customers/${encodeURIComponent(phone)}/service-history`
      : `/bots/${botId}/customers/${encodeURIComponent(phone)}/service-history`

  return {
    get: (
      botId: string,
      phone: string,
      params: ServiceHistoryQuery = {},
    ): Promise<ServiceHistoryResponse> =>
      api.get<ServiceHistoryResponse>(base(botId, phone), {
        query: query(params as unknown as Record<string, unknown>),
      }),
  }
}
