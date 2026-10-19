import type {
  CreateTemplateInput,
  ListTemplatesQuery,
  TestSendTemplateInput,
  TestSendTemplateResponse,
  UpdateTemplateInput,
  WhatsappTemplate,
} from '~/types/whatsapp-template'

export function useTemplates(tenantId?: string) {
  const api = useApi()

  const base = (botId: string): string =>
    tenantId
      ? `/superadmin/companies/${tenantId}/bots/${botId}/templates`
      : `/bots/${botId}/templates`

  function withQuery(url: string, query?: ListTemplatesQuery): string {
    if (!query) return url
    const parts: string[] = []
    if (query.usage) parts.push(`usage=${encodeURIComponent(query.usage)}`)
    if (query.status) parts.push(`status=${encodeURIComponent(query.status)}`)
    return parts.length ? `${url}?${parts.join('&')}` : url
  }

  return {
    listForBot: (botId: string, query?: ListTemplatesQuery): Promise<WhatsappTemplate[]> => {
      return api.get<WhatsappTemplate[]>(withQuery(base(botId), query))
    },

    listManualForBot: (botId: string): Promise<WhatsappTemplate[]> => {
      return api.get<WhatsappTemplate[]>(withQuery(base(botId), { usage: 'MANUAL', status: 'ACTIVE' }))
    },

    getById: (botId: string, id: string): Promise<WhatsappTemplate> => {
      return api.get<WhatsappTemplate>(`${base(botId)}/${id}`)
    },

    create: (botId: string, input: CreateTemplateInput): Promise<WhatsappTemplate> => {
      return api.post<WhatsappTemplate>(base(botId), input)
    },

    update: (botId: string, id: string, input: UpdateTemplateInput): Promise<WhatsappTemplate> => {
      return api.patch<WhatsappTemplate>(`${base(botId)}/${id}`, input)
    },

    remove: (botId: string, id: string): Promise<void> => {
      return api.delete(`${base(botId)}/${id}`)
    },

    testSend: (
      botId: string,
      id: string,
      input: TestSendTemplateInput,
    ): Promise<TestSendTemplateResponse> => {
      return api.post<TestSendTemplateResponse>(`${base(botId)}/${id}/test-send`, input)
    },
  }
}
