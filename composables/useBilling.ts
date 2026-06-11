import type {
  BillingState,
  ExpiringTenant,
  RegisterPaymentInput,
  SweepResult,
} from '~/types/billing'

/**
 * Days-remaining threshold at which the global banner starts surfacing the
 * "renew soon" warning. Kept here (not inlined in the banner) so both the
 * banner and any dashboard widget can share the same number.
 */
export const BILLING_WARNING_DAYS = 10

export function useBilling() {
  const api = useApi()

  return {
    me: (): Promise<BillingState> => api.get<BillingState>('/billing/me'),

    // Superadmin
    forTenant: (tenantId: string): Promise<BillingState> =>
      api.get<BillingState>(`/superadmin/tenants/${tenantId}/billing`),

    registerPayment: async (
      tenantId: string,
      input: RegisterPaymentInput,
      file: File,
    ): Promise<unknown> => {
      const form = new FormData()
      form.append('file', file)
      form.append('monthsCovered', String(input.monthsCovered))
      if (input.paidAt) form.append('paidAt', input.paidAt)
      if (input.note) form.append('note', input.note)
      // FormData uploads bypass JSON serialization; the api helper still
      // attaches the bearer token because the path is `/superadmin/...`.
      return api.post<unknown>(`/superadmin/tenants/${tenantId}/billing/payments`, form)
    },

    deactivate: (tenantId: string): Promise<void> =>
      api.delete<void>(`/superadmin/tenants/${tenantId}/billing`),

    expiringSoon: (days = 7): Promise<ExpiringTenant[]> =>
      api.get<ExpiringTenant[]>(`/superadmin/billing/expiring-soon?days=${days}`),

    runExpirationSweep: (): Promise<SweepResult> =>
      api.post<SweepResult>('/superadmin/billing/run-expiration-sweep'),
  }
}
