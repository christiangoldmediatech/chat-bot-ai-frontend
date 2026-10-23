import type {
  OpenRouterKeyResponse,
  ProvisionOpenRouterKeyInput,
  UpdateOpenRouterKeyBudgetInput,
} from '~/types/openrouter-key'

/**
 * OpenRouter sub-key provisioning per bot. Super-admin only — the tenant
 * CRUD endpoints were removed in Phase 25 PR 5a, so this composable always
 * routes through `/superadmin/companies/:tenantId/bots/:botId/openrouter-key`.
 */
export function useOpenRouterKey(tenantId: string, botId: string) {
  const api = useApi()
  const base = `/superadmin/companies/${tenantId}/bots/${botId}/openrouter-key`

  return {
    get: (): Promise<OpenRouterKeyResponse> => api.get<OpenRouterKeyResponse>(base),
    provision: (data: ProvisionOpenRouterKeyInput): Promise<OpenRouterKeyResponse> =>
      api.post<OpenRouterKeyResponse>(base, data),
    updateBudget: (
      data: UpdateOpenRouterKeyBudgetInput,
    ): Promise<OpenRouterKeyResponse> => api.patch<OpenRouterKeyResponse>(base, data),
    revoke: (): Promise<void> => api.delete(base),
  }
}
