import type {
  CreateServiceInput,
  Service,
  UpdateServiceInput,
} from '~/types/service'

/**
 * Catálogo de servicios del bot. Sin tenantId → tenant-scoped
 * (`/bots/:botId/services`). Con tenantId → path super-admin
 * (`/superadmin/companies/:tenantId/bots/:botId/services`). Mismo patrón que
 * `useMediaAssets` — el mismo componente sirve para admin y super-admin.
 */
export function useServices(tenantId?: string) {
  const api = useApi()
  const base = (botId: string): string =>
    tenantId
      ? `/superadmin/companies/${tenantId}/bots/${botId}/services`
      : `/bots/${botId}/services`

  return {
    list: (botId: string): Promise<Service[]> => api.get<Service[]>(base(botId)),
    get: (botId: string, id: string): Promise<Service> =>
      api.get<Service>(`${base(botId)}/${id}`),
    create: (botId: string, input: CreateServiceInput): Promise<Service> =>
      api.post<Service>(base(botId), input),
    update: (botId: string, id: string, input: UpdateServiceInput): Promise<Service> =>
      api.patch<Service>(`${base(botId)}/${id}`, input),
    remove: (botId: string, id: string): Promise<void> =>
      api.delete<void>(`${base(botId)}/${id}`),
    uploadImage: (botId: string, id: string, file: File): Promise<Service> => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post<Service>(`${base(botId)}/${id}/image`, fd)
    },
  }
}
