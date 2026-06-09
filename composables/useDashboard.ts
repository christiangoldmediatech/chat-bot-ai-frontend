import type {
  DashboardSummary,
  MessagesActivity,
  MessagesActivityRange,
  SuperadminDashboardSummary,
} from '~/types/dashboard'

export interface MessagesActivityOptions {
  range: MessagesActivityRange
  botId?: string
}

export function useDashboard() {
  const api = useApi()
  return {
    summary: (): Promise<DashboardSummary> =>
      api.get<DashboardSummary>('/admin/dashboard/summary'),
    messagesActivity: (opts: MessagesActivityOptions): Promise<MessagesActivity> =>
      api.get<MessagesActivity>('/admin/dashboard/messages-activity', {
        query: { range: opts.range, ...(opts.botId ? { botId: opts.botId } : {}) },
      }),
    superadminSummary: (): Promise<SuperadminDashboardSummary> =>
      api.get<SuperadminDashboardSummary>('/superadmin/dashboard/summary'),
  }
}
