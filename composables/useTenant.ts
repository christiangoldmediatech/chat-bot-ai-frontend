import type { Tenant } from '~/types/company'

export function useTenant() {
  const api = useApi()

  return {
    me: (): Promise<Tenant> => api.get<Tenant>('/tenants/me'),
    update: (data: Partial<Pick<Tenant, 'name' | 'slug'>>): Promise<Tenant> =>
      api.patch<Tenant>('/tenants/me', data),
  }
}
