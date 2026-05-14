import type {
  Bot,
  BotConfig,
  CreateBotInput,
  UpdateBotConfigInput,
  UpdateBotInput,
} from '~/types/bot'

export function useBots() {
  const api = useApi()

  return {
    list: (): Promise<Bot[]> => api.get<Bot[]>('/bots'),
    get: (id: string): Promise<Bot> => api.get<Bot>(`/bots/${id}`),
    create: (data: CreateBotInput): Promise<Bot> => api.post<Bot>('/bots', data),
    update: (id: string, data: UpdateBotInput): Promise<Bot> =>
      api.patch<Bot>(`/bots/${id}`, data),
    remove: (id: string): Promise<void> => api.delete(`/bots/${id}`),
    getConfig: (id: string): Promise<BotConfig> => api.get<BotConfig>(`/bots/${id}/config`),
    updateConfig: (id: string, data: UpdateBotConfigInput): Promise<BotConfig> =>
      api.patch<BotConfig>(`/bots/${id}/config`, data),
  }
}
