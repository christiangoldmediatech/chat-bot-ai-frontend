import type {
  CrmIntegration,
  TestPushResult,
  UpsertCustomWebhookInput,
} from '~/types/crm-integration'

/**
 * CRM integration management for a bot. Without a tenantId, hits the
 * tenant-scoped routes. With a tenantId, hits the nested superadmin routes.
 * Same dual-mode shape as `useMediaAssets`.
 *
 * Plan gating (Premium-only) lives in the backend service layer — calls to
 * upsert/test will throw 403 if the tenant is not on PREMIUM. The UI can
 * still call `list` to detect existing integrations regardless of plan.
 */
export function useCrmIntegration(tenantId?: string) {
  const api = useApi()

  const base = (botId: string): string =>
    tenantId
      ? `/superadmin/companies/${tenantId}/bots/${botId}/crm`
      : `/bots/${botId}/crm`

  return {
    list: (botId: string): Promise<CrmIntegration[]> => {
      return api.get<CrmIntegration[]>(base(botId))
    },

    getActive: (botId: string): Promise<CrmIntegration | null> => {
      return api.get<CrmIntegration | null>(`${base(botId)}/active`)
    },

    upsertCustom: (
      botId: string,
      input: UpsertCustomWebhookInput,
    ): Promise<CrmIntegration> => {
      return api.post<CrmIntegration>(`${base(botId)}/custom`, input)
    },

    patchCustom: (
      botId: string,
      input: UpsertCustomWebhookInput,
    ): Promise<CrmIntegration> => {
      return api.patch<CrmIntegration>(`${base(botId)}/custom`, input)
    },

    disconnect: (botId: string, id: string): Promise<void> => {
      return api.delete<void>(`${base(botId)}/${id}`)
    },

    testPush: (botId: string, id: string): Promise<TestPushResult> => {
      return api.post<TestPushResult>(`${base(botId)}/${id}/test-push`, {})
    },

    /** Get the HubSpot OAuth consent URL the user should be redirected to. */
    hubspotConnectUrl: (botId: string): Promise<{ url: string }> => {
      return api.get<{ url: string }>(`${base(botId)}/hubspot/oauth/start`)
    },

    /** Get the Salesforce OAuth consent URL. `isSandbox=true` uses test.salesforce.com. */
    salesforceConnectUrl: (
      botId: string,
      isSandbox: boolean,
    ): Promise<{ url: string }> => {
      const qs = isSandbox ? '?sandbox=true' : ''
      return api.get<{ url: string }>(`${base(botId)}/salesforce/oauth/start${qs}`)
    },

    /** Get the Zoho OAuth consent URL. Region picks the data center. */
    zohoConnectUrl: (
      botId: string,
      region: 'us' | 'eu' | 'in' | 'au' | 'jp' | 'cn',
    ): Promise<{ url: string }> => {
      return api.get<{ url: string }>(
        `${base(botId)}/zoho/oauth/start?region=${region}`,
      )
    },

    /** Get the current primary CRM provider for the bot, or null when auto. */
    getPrimary: (botId: string): Promise<{ provider: string | null }> => {
      return api.get<{ provider: string | null }>(`${base(botId)}/primary`)
    },

    /** Set the primary CRM provider. Pass null to revert to auto. */
    setPrimary: (
      botId: string,
      provider: 'SALESFORCE' | 'ZOHO_CRM' | 'HUBSPOT' | 'CUSTOM_WEBHOOK' | null,
    ): Promise<{ provider: string | null }> => {
      return api.patch<{ provider: string | null }>(`${base(botId)}/primary`, { provider })
    },
  }
}
