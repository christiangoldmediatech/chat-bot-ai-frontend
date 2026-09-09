import type {
  CreateScheduleBlockPayload,
  ScheduleBlock,
  UpdateScheduleBlockPayload,
} from '~/types/schedule'

export function useScheduleBlocks(tenantId?: string) {
  const api = useApi()
  const baseForBot = (botId: string): string =>
    tenantId
      ? `/superadmin/companies/${tenantId}/bots/${botId}`
      : `/bots/${botId}`

  return {
    list: (
      botId: string,
      params?: { from?: string, to?: string },
    ): Promise<ScheduleBlock[]> => {
      const q = new URLSearchParams()
      if (params?.from) q.set('from', params.from)
      if (params?.to) q.set('to', params.to)
      const suffix = q.toString() ? `?${q.toString()}` : ''
      return api.get<ScheduleBlock[]>(`${baseForBot(botId)}/schedule-blocks${suffix}`)
    },
    create: (
      botId: string,
      payload: CreateScheduleBlockPayload,
    ): Promise<ScheduleBlock> =>
      api.post<ScheduleBlock>(`${baseForBot(botId)}/schedule-blocks`, payload),
    update: (
      botId: string,
      id: string,
      payload: UpdateScheduleBlockPayload,
    ): Promise<ScheduleBlock> =>
      api.patch<ScheduleBlock>(`${baseForBot(botId)}/schedule-blocks/${id}`, payload),
    remove: (botId: string, id: string): Promise<void> =>
      api.delete(`${baseForBot(botId)}/schedule-blocks/${id}`),
  }
}
