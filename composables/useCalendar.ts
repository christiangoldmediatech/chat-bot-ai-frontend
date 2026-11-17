import type {
  CalendarViewResponse,
  CancelledAppointment,
  CreateManualAppointmentPayload,
  ManualAppointment,
} from '~/types/calendar'

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
    createAppointment: (
      botId: string,
      payload: CreateManualAppointmentPayload,
    ): Promise<ManualAppointment> =>
      api.post<ManualAppointment>(
        `${baseForBot(botId)}/calendar/appointments`,
        payload,
      ),
    cancelAppointment: (
      botId: string,
      appointmentId: string,
      reason?: string,
    ): Promise<CancelledAppointment> =>
      api.post<CancelledAppointment>(
        `${baseForBot(botId)}/calendar/appointments/${appointmentId}/cancel`,
        reason ? { reason } : {},
      ),
  }
}
