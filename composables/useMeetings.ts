import type {
  MeetingOutcome,
  MeetingStatus,
  MeetingsTab,
  PaginatedMeetings,
} from '~/types/meeting'

export interface AllMeetingsFilters {
  status?: MeetingStatus
  botId?: string
  customerPhone?: string
  dateFrom?: string
  dateTo?: string
  tab?: MeetingsTab
  search?: string
  page?: number
  pageSize?: number
}

export function useMeetings(tenantId?: string) {
  const api = useApi()
  const base = tenantId
    ? `/superadmin/companies/${tenantId}/meetings`
    : '/meetings'

  return {
    list: (filters?: AllMeetingsFilters): Promise<PaginatedMeetings> => {
      const query: Record<string, unknown> = {}
      if (filters?.status) query.status = filters.status
      if (filters?.botId) query.botId = filters.botId
      if (filters?.customerPhone) query.customerPhone = filters.customerPhone
      if (filters?.dateFrom) query.dateFrom = filters.dateFrom
      if (filters?.dateTo) query.dateTo = filters.dateTo
      if (filters?.tab) query.tab = filters.tab
      if (filters?.search) query.search = filters.search
      if (filters?.page) query.page = filters.page
      if (filters?.pageSize) query.pageSize = filters.pageSize
      return api.get<PaginatedMeetings>(
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
