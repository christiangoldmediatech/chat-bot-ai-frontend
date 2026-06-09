import type {
  Company,
  CompanyDetail,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '~/types/company'

/**
 * Cross-tenant company management. Only callable with a platform-admin JWT —
 * useApi automatically routes /superadmin/* requests through the superadmin
 * auth store.
 */
export function useCompanies() {
  const api = useApi()

  return {
    list: (): Promise<Company[]> => api.get<Company[]>('/superadmin/companies'),
    get: (id: string): Promise<CompanyDetail> =>
      api.get<CompanyDetail>(`/superadmin/companies/${id}`),
    create: (data: CreateCompanyInput): Promise<CompanyDetail> =>
      api.post<CompanyDetail>('/superadmin/companies', data),
    update: (id: string, data: UpdateCompanyInput): Promise<Company> =>
      api.patch<Company>(`/superadmin/companies/${id}`, data),
    remove: (id: string): Promise<void> => api.delete(`/superadmin/companies/${id}`),
    resetUserPassword: (
      tenantId: string,
      userId: string,
      newPassword: string,
    ): Promise<void> =>
      api.patch<void>(
        `/superadmin/companies/${tenantId}/users/${userId}/password`,
        { newPassword },
      ),
  }
}
