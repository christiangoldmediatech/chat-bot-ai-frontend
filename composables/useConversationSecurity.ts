import type {
  BlockedConversationListResponse,
  ListBlockedQuery,
  SecurityAuditEntry,
  SecurityStatus,
} from '~/types/security'

export function useConversationSecurity(tenantId?: string) {
  const api = useApi()

  const conversationsBase = tenantId
    ? `/superadmin/companies/${tenantId}/conversations`
    : '/conversations'

  const rootBase = tenantId
    ? `/superadmin/companies/${tenantId}`
    : ''

  return {
    getStatus: (id: string): Promise<SecurityStatus> =>
      api.get<SecurityStatus>(`${conversationsBase}/${id}/security`),

    unblock: (id: string, reason?: string): Promise<SecurityStatus> =>
      api.post<SecurityStatus>(`${conversationsBase}/${id}/security/unblock`, {
        reason,
      }),

    block: (id: string, reason?: string): Promise<SecurityStatus> => {
      if (!tenantId) {
        return Promise.reject(
          new Error('Manual block is only available in the superadmin context'),
        )
      }
      return api.post<SecurityStatus>(`${conversationsBase}/${id}/security/block`, {
        reason,
      })
    },

    listAudit: (id: string, limit = 50): Promise<SecurityAuditEntry[]> =>
      api.get<SecurityAuditEntry[]>(`${conversationsBase}/${id}/security/audit`, {
        query: { limit },
      }),

    listBlocked: (query: ListBlockedQuery = {}): Promise<BlockedConversationListResponse> =>
      api.get<BlockedConversationListResponse>(
        `${rootBase}/conversations/security/blocked`,
        { query: query as Record<string, unknown> },
      ),
  }
}
