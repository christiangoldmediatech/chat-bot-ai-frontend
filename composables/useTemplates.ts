import type {
  CreateTemplateInput,
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

  return {
    listForBot: (botId: string): Promise<WhatsappTemplate[]> => {
      return api.get<WhatsappTemplate[]>(base(botId))
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
      return api.delete<void>(`${base(botId)}/${id}`)
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
