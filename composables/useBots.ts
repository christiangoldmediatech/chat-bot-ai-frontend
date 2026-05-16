import type {
  Bot,
  BotConfig,
  CreateBotInput,
  UpdateBotConfigInput,
  UpdateBotInput,
} from '~/types/bot'

/**
 * Bot CRUD. Without a tenantId, hits the tenant-scoped `/bots/*` routes
 * (auth via the current tenant JWT). With a tenantId, hits
 * `/superadmin/companies/:tenantId/bots/*` instead — `useApi` automatically
 * swaps in the superadmin token for any path starting with `/superadmin`.
 */
export function useBots(tenantId?: string) {
  const api = useApi()
  const base = tenantId ? `/superadmin/companies/${tenantId}/bots` : '/bots'

  return {
    list: (): Promise<Bot[]> => api.get<Bot[]>(base),
    get: (id: string): Promise<Bot> => api.get<Bot>(`${base}/${id}`),
    create: (data: CreateBotInput): Promise<Bot> => api.post<Bot>(base, data),
    update: (id: string, data: UpdateBotInput): Promise<Bot> =>
      api.patch<Bot>(`${base}/${id}`, data),
    remove: (id: string): Promise<void> => api.delete(`${base}/${id}`),
    getConfig: (id: string): Promise<BotConfig> =>
      api.get<BotConfig>(`${base}/${id}/config`),
    updateConfig: (id: string, data: UpdateBotConfigInput): Promise<BotConfig> =>
      api.patch<BotConfig>(`${base}/${id}/config`, data),
  }
}
