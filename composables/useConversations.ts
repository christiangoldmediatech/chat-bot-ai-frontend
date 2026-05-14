import type {
  Conversation,
  ConversationDetail,
  ConversationStatus,
  FindConversationsQuery,
  Message,
} from '~/types/conversation'
import type { Paginated } from '~/types/api'

export function useConversations() {
  const api = useApi()

  return {
    list: (query: FindConversationsQuery = {}): Promise<Paginated<Conversation>> =>
      api.get<Paginated<Conversation>>('/conversations', {
        query: query as Record<string, unknown>,
      }),
    get: (id: string): Promise<ConversationDetail> =>
      api.get<ConversationDetail>(`/conversations/${id}`),
    updateStatus: (id: string, status: ConversationStatus): Promise<Conversation> =>
      api.patch<Conversation>(`/conversations/${id}`, { status }),
    sendAgentMessage: (id: string, content: string): Promise<Message> =>
      api.post<Message>(`/conversations/${id}/messages`, { content }),
  }
}
