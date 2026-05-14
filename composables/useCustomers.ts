import type { Conversation } from '~/types/conversation'
import type { CustomerDetail, CustomerSummary } from '~/types/customer'

export function useCustomers() {
  const api = useApi()

  return {
    list: (botId?: string): Promise<CustomerSummary[]> =>
      api.get<CustomerSummary[]>('/customers', botId ? { query: { botId } } : undefined),
    get: (phone: string): Promise<CustomerDetail> =>
      api.get<CustomerDetail>(`/customers/${encodeURIComponent(phone)}`),
    conversations: (phone: string): Promise<Conversation[]> =>
      api.get<Conversation[]>(`/customers/${encodeURIComponent(phone)}/conversations`),
  }
}
