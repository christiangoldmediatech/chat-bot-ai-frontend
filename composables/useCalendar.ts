import type { CalendarViewResponse } from '~/types/calendar'

export function useCalendar(tenantId?: string) {
  const api = useApi()
  const baseForBot = (botId: string): string =>
    tenantId
      ? `/superadmin/companies/${tenantId}/bots/${botId}`
      : `/bots/${botId}`

  return {
    get: (
      botId: string,
      from: string,
      to: string,
    ): Promise<CalendarViewResponse> =>
      api.get<CalendarViewResponse>(`${baseForBot(botId)}/calendar`, {
        query: { from, to },
      }),
  }
}
