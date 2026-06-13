import type {
  Conversation,
  ConversationDetail,
  ConversationStatus,
  FindConversationsQuery,
  Message,
} from '~/types/conversation'
import type { Paginated } from '~/types/api'

/**
 * Conversations API. Pass `tenantId` to route through the read-only
 * superadmin endpoints (`/superadmin/companies/:tenantId/conversations`).
 * Mutating actions (status update, agent message) only exist on the
 * tenant-scoped path, so they throw when a tenantId is provided.
 */
export function useConversations(tenantId?: string) {
  const api = useApi()
  const base = tenantId
    ? `/superadmin/companies/${tenantId}/conversations`
    : '/conversations'

  return {
    list: (query: FindConversationsQuery = {}): Promise<Paginated<Conversation>> =>
      api.get<Paginated<Conversation>>(base, {
        query: query as Record<string, unknown>,
      }),
    get: (id: string): Promise<ConversationDetail> =>
      api.get<ConversationDetail>(`${base}/${id}`),
    updateStatus: (id: string, status: ConversationStatus): Promise<Conversation> => {
      if (tenantId) {
        return Promise.reject(
          new Error('Superadmin cannot mutate conversation status'),
        )
      }
      return api.patch<Conversation>(`/conversations/${id}`, { status })
    },
    sendAgentMessage: (id: string, content: string): Promise<Message> => {
      if (tenantId) {
        return Promise.reject(
          new Error('Superadmin cannot send agent messages'),
        )
      }
      return api.post<Message>(`/conversations/${id}/messages`, { content })
    },
  }
}
