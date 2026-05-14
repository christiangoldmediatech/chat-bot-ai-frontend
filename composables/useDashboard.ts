import type {
  DashboardSummary,
  SuperadminDashboardSummary,
} from '~/types/dashboard'

export function useDashboard() {
  const api = useApi()
  return {
    summary: (): Promise<DashboardSummary> =>
      api.get<DashboardSummary>('/admin/dashboard/summary'),
    superadminSummary: (): Promise<SuperadminDashboardSummary> =>
      api.get<SuperadminDashboardSummary>('/superadmin/dashboard/summary'),
  }
}
