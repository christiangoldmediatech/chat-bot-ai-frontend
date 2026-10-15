export type WhatsappTemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'
export type WhatsappTemplateStatus = 'ACTIVE' | 'PAUSED'
export type WhatsappTemplateUsage = 'MANUAL' | 'AUTOMATIC'
export type WhatsappTemplateTrigger = 'APPOINTMENT_REMINDER'

export const REMINDER_VARIABLE_KEYS = [
  'attendeeName',
  'serviceName',
  'appointmentDay',
  'appointmentTime',
  'businessName',
] as const
export type ReminderVariableKey = typeof REMINDER_VARIABLE_KEYS[number]

export interface TemplateAutomation {
  reminderOffsetMinutes?: number
  variableMapping?: Record<string, ReminderVariableKey>
}

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
  usage: WhatsappTemplateUsage
  trigger: WhatsappTemplateTrigger | null
  automation: TemplateAutomation
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
  usage?: WhatsappTemplateUsage
  trigger?: WhatsappTemplateTrigger | null
  automation?: TemplateAutomation
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

export interface ListTemplatesQuery {
  usage?: WhatsappTemplateUsage
  status?: WhatsappTemplateStatus
}
