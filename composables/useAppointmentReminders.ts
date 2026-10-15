import type {
  FindRemindersQuery,
  PaginatedAppointmentReminders,
} from '~/types/appointment-reminder'

export function useAppointmentReminders(tenantId?: string) {
  const api = useApi()

  const base = (botId: string): string =>
    tenantId
      ? `/superadmin/companies/${tenantId}/bots/${botId}/appointment-reminders`
      : `/bots/${botId}/appointment-reminders`

  function toQuery(q?: FindRemindersQuery): string {
    if (!q) return ''
    const parts: string[] = []
    if (q.status) parts.push(`status=${encodeURIComponent(q.status)}`)
    if (q.trigger) parts.push(`trigger=${encodeURIComponent(q.trigger)}`)
    if (q.dateFrom) parts.push(`dateFrom=${encodeURIComponent(q.dateFrom)}`)
    if (q.dateTo) parts.push(`dateTo=${encodeURIComponent(q.dateTo)}`)
    if (q.calendarEventId) parts.push(`calendarEventId=${encodeURIComponent(q.calendarEventId)}`)
    if (q.page) parts.push(`page=${q.page}`)
    if (q.pageSize) parts.push(`pageSize=${q.pageSize}`)
    return parts.length ? `?${parts.join('&')}` : ''
  }

  return {
    listForBot: (
      botId: string,
      query?: FindRemindersQuery,
    ): Promise<PaginatedAppointmentReminders> => {
      return api.get<PaginatedAppointmentReminders>(`${base(botId)}${toQuery(query)}`)
    },
  }
}
