export interface Bot {
  id: string
  name: string
  assistantName: string | null
  description: string | null
  systemPrompt: string
  whatsappPhoneId: string
  phoneNumber: string | null
  whatsappBusinessAccountId: string | null
  webhookVerifyToken: string
  hasAppSecret: boolean
  aiProvider: string
  aiModel: string
  isActive: boolean
  createdAt: string
}

export interface BotConfig {
  id: string
  name: string
  assistantName: string | null
  description: string | null
  tone: string | null
  personality: string | null
  welcomeMessage: string | null
  responseRules: string | null
  fallbackMessage: string | null
  humanDelayMs: number
  followupInactivityEnabled: boolean
  followupInactivityHours: number
  followupInactivityMaxCount: number
  aiProvider: string
  aiModel: string
  isActive: boolean
  createMeetEnabled: boolean
}

export interface CreateBotInput {
  name: string
  assistantName?: string | null
  systemPrompt: string
  whatsappPhoneId: string
  phoneNumber?: string
  whatsappBusinessAccountId?: string
  whatsappToken: string
  whatsappAppSecret?: string
  webhookVerifyToken: string
  isActive?: boolean
}

export interface UpdateBotInput {
  name?: string
  assistantName?: string | null
  systemPrompt?: string
  whatsappPhoneId?: string
  phoneNumber?: string
  whatsappBusinessAccountId?: string
  whatsappToken?: string
  whatsappAppSecret?: string
  webhookVerifyToken?: string
  isActive?: boolean
}

export interface UpdateBotConfigInput {
  assistantName?: string | null
  description?: string | null
  tone?: string | null
  personality?: string | null
  welcomeMessage?: string | null
  responseRules?: string | null
  fallbackMessage?: string | null
  humanDelayMs?: number
  followupInactivityEnabled?: boolean
  followupInactivityHours?: number
  followupInactivityMaxCount?: number
  aiProvider?: string
  aiModel?: string
  isActive?: boolean
  createMeetEnabled?: boolean
}

export interface BotDataResetDeleted {
  customers: number
  conversations: number
  messages: number
  leads: number
  cases: number
  sales: number
  appointments: number
  appointmentReminders: number
  qualityEvents: number
  llmUsage: number
  securityBlockAudits: number
}

export interface BotDataResetResult {
  botId: string
  botName: string
  deleted: BotDataResetDeleted
}
