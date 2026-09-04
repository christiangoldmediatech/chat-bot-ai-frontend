import type { RevenueQuery, RevenueReport } from '~/types/report'

export function useReports() {
  const api = useApi()

  return {
    revenue: (botId: string, query: RevenueQuery): Promise<RevenueReport> =>
      api.get<RevenueReport>(`/bots/${botId}/reports/revenue`, {
        query: { ...query } as Record<string, unknown>,
      }),

    /**
     * Descarga el CSV. Usa fetch nativo con las mismas headers que ofetch —
     * no lo desviamos por `useApi` porque queremos el Blob crudo para
     * trigger la descarga en el navegador.
     */
    downloadRevenueCsv: async (botId: string, query: RevenueQuery): Promise<Blob> => {
      const cfg = useRuntimeConfig()
      const auth = useAuthStore()
      const params = new URLSearchParams({
        from: query.from,
        to: query.to,
        dateBasis: query.dateBasis,
        groupBy: query.groupBy,
      })
      const url = `${cfg.public.apiBaseUrl}/bots/${botId}/reports/revenue.csv?${params.toString()}`
      const res = await fetch(url, {
        headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
      })
      if (!res.ok) {
        throw new Error(`CSV download failed: ${res.status}`)
      }
      return res.blob()
    },
  }
}
