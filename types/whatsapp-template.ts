export type WhatsappTemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'
export type WhatsappTemplateStatus = 'ACTIVE' | 'PAUSED'

export interface TemplateVariable {
  index: number
  label: string
  example?: string
}

export interface WhatsappTemplate {
  id: string
  botId: string
  name: string
  language: string
  category: WhatsappTemplateCategory
  bodyPreview: string
  variables: TemplateVariable[]
  status: WhatsappTemplateStatus
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTemplateInput {
  name: string
  language: string
  category?: WhatsappTemplateCategory
  bodyPreview: string
  variables?: TemplateVariable[]
  status?: WhatsappTemplateStatus
}

export type UpdateTemplateInput = Partial<CreateTemplateInput>

export interface TestSendTemplateInput {
  to: string
  variables?: string[]
  language?: string
}

export interface TestSendTemplateResponse {
  wamid: string
}
