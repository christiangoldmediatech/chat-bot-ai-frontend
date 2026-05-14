import type { ApiError } from '~/types/api'
import type { ConnectUrlResponse, Integration } from '~/types/integration'

/**
 * Wraps the bot ↔ Google Calendar integration endpoints. `get` returns null
 * (instead of throwing) when the backend reports a 404 — the empty state is a
 * legitimate, non-error outcome the UI needs to render.
 */
export function useCalendarIntegration() {
  const api = useApi()

  return {
    async get(botId: string): Promise<Integration | null> {
      try {
        return await api.get<Integration>(`/bots/${botId}/integration`)
      } catch (err) {
        if ((err as ApiError).status === 404) {
          return null
        }
        throw err
      }
    },
    connectUrl: (botId: string): Promise<ConnectUrlResponse> =>
      api.get<ConnectUrlResponse>(`/bots/${botId}/google/connect`),
    disconnect: (botId: string): Promise<void> =>
      api.delete(`/bots/${botId}/integration`),
  }
}
