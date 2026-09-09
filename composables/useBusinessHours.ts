import type { ApiError } from '~/types/api'
import type {
  BusinessHoursConfig,
  ReplaceBusinessHoursPayload,
} from '~/types/schedule'

export function useBusinessHours(tenantId?: string) {
  const api = useApi()
  const baseForBot = (botId: string): string =>
    tenantId
      ? `/superadmin/companies/${tenantId}/bots/${botId}`
      : `/bots/${botId}`

  return {
    async get(botId: string): Promise<BusinessHoursConfig | null> {
      try {
        return await api.get<BusinessHoursConfig>(`${baseForBot(botId)}/business-hours`)
      } catch (err) {
        if ((err as ApiError).status === 404) {
          return null
        }
        throw err
      }
    },
    replace: (
      botId: string,
      payload: ReplaceBusinessHoursPayload,
    ): Promise<BusinessHoursConfig> =>
      api.put<BusinessHoursConfig>(`${baseForBot(botId)}/business-hours`, payload),
  }
}
