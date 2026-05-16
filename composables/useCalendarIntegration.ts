import type { ApiError } from '~/types/api'
import type { ConnectUrlResponse, Integration } from '~/types/integration'

/**
 * Wraps the bot ↔ Google Calendar integration endpoints. `get` returns null
 * (instead of throwing) when the backend reports a 404 — the empty state is a
 * legitimate, non-error outcome the UI needs to render.
 *
 * Without a tenantId, calls the tenant-scoped `/bots/:id/...` routes.
 * With a tenantId, calls the nested superadmin route
 * `/superadmin/companies/:tenantId/bots/:botId/...`.
 */
export function useCalendarIntegration(tenantId?: string) {
  const api = useApi()
  const baseForBot = (botId: string): string =>
    tenantId
      ? `/superadmin/companies/${tenantId}/bots/${botId}`
      : `/bots/${botId}`

  return {
    async get(botId: string): Promise<Integration | null> {
      try {
        return await api.get<Integration>(`${baseForBot(botId)}/integration`)
      } catch (err) {
        if ((err as ApiError).status === 404) {
          return null
        }
        throw err
      }
    },
    connectUrl: (botId: string): Promise<ConnectUrlResponse> =>
      api.get<ConnectUrlResponse>(`${baseForBot(botId)}/google/connect`),
    disconnect: (botId: string): Promise<void> =>
      api.delete(`${baseForBot(botId)}/integration`),
  }
}
