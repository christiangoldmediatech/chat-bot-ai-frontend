import type { Meeting, MeetingOutcome, MeetingStatus } from '~/types/meeting'

export interface AllMeetingsFilters {
  status?: MeetingStatus
  botId?: string
  customerPhone?: string
  dateFrom?: string
  dateTo?: string
}

export function useMeetings(tenantId?: string) {
  const api = useApi()
  const base = tenantId
    ? `/superadmin/companies/${tenantId}/meetings`
    : '/meetings'

  return {
    list: (filters?: AllMeetingsFilters): Promise<Meeting[]> => {
      const query: Record<string, unknown> = {}
      if (filters?.status) query.status = filters.status
      if (filters?.botId) query.botId = filters.botId
      if (filters?.customerPhone) query.customerPhone = filters.customerPhone
      if (filters?.dateFrom) query.dateFrom = filters.dateFrom
      if (filters?.dateTo) query.dateTo = filters.dateTo
      return api.get<Meeting[]>(
        base,
        Object.keys(query).length > 0 ? { query } : undefined,
      )
    },

    markOutcome: (
      eventId: string,
      outcome: MeetingOutcome,
      note?: string,
    ): Promise<{
      id: string
      status: MeetingStatus
      outcomeNote: string | null
      outcomeAskedAt: string | null
    }> =>
      api.post(`${base}/${eventId}/outcome`, {
        outcome,
        ...(note ? { note } : {}),
      }),
  }
}
