import type {
  CreateSaleInput,
  CustomerSalesHistory,
  ListSalesQuery,
  MarkLostInput,
  MarkWonInput,
  PaginatedSales,
  Sale,
  SaleDetail,
  UpdateSaleInput,
} from '~/types/sale'

export function useSales() {
  const api = useApi()
  const base = (botId: string): string => `/bots/${botId}/sales`

  return {
    list: (botId: string, query: ListSalesQuery = {}): Promise<PaginatedSales> =>
      api.get<PaginatedSales>(base(botId), { query: { ...query } as Record<string, unknown> }),
    get: (botId: string, id: string): Promise<SaleDetail> =>
      api.get<SaleDetail>(`${base(botId)}/${id}`),
    create: (botId: string, input: CreateSaleInput): Promise<Sale> =>
      api.post<Sale>(base(botId), input),
    update: (botId: string, id: string, input: UpdateSaleInput): Promise<Sale> =>
      api.patch<Sale>(`${base(botId)}/${id}`, input),
    markWon: (botId: string, id: string, input: MarkWonInput): Promise<Sale> =>
      api.post<Sale>(`${base(botId)}/${id}/won`, input),
    markLost: (botId: string, id: string, input: MarkLostInput): Promise<Sale> =>
      api.post<Sale>(`${base(botId)}/${id}/lost`, input),
    remove: (botId: string, id: string): Promise<void> =>
      api.delete<void>(`${base(botId)}/${id}`),

    listForCustomer: (
      botId: string,
      customerId: string,
    ): Promise<CustomerSalesHistory> =>
      api.get<CustomerSalesHistory>(
        `/bots/${botId}/customers/${customerId}/sales`,
      ),

    createFromConversation: (
      conversationId: string,
      serviceId: string,
      appointmentId?: string,
    ): Promise<Sale> =>
      api.post<Sale>(`/conversations/${conversationId}/sales`, {
        serviceId,
        ...(appointmentId ? { appointmentId } : {}),
      }),

    createWonFromAppointment: (
      appointmentId: string,
      input: MarkWonInput & { serviceId: string },
    ): Promise<Sale> =>
      api.post<Sale>(`/appointments/${appointmentId}/sales/won`, input),
  }
}
