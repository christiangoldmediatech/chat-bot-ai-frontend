export interface Bot {
  id: string
  name: string
  description: string | null
  systemPrompt: string
  whatsappPhoneId: string
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
  description: string | null
  tone: string | null
  personality: string | null
  welcomeMessage: string | null
  responseRules: string | null
  fallbackMessage: string | null
  humanDelayMs: number
  aiProvider: string
  aiModel: string
  isActive: boolean
}

export interface CreateBotInput {
  name: string
  systemPrompt: string
  whatsappPhoneId: string
  whatsappBusinessAccountId?: string
  whatsappToken: string
  whatsappAppSecret?: string
  webhookVerifyToken: string
  isActive?: boolean
}

export interface UpdateBotInput {
  name?: string
  systemPrompt?: string
  whatsappPhoneId?: string
  whatsappBusinessAccountId?: string
  whatsappToken?: string
  whatsappAppSecret?: string
  webhookVerifyToken?: string
  isActive?: boolean
}

export interface UpdateBotConfigInput {
  description?: string | null
  tone?: string | null
  personality?: string | null
  welcomeMessage?: string | null
  responseRules?: string | null
  fallbackMessage?: string | null
  humanDelayMs?: number
  aiProvider?: string
  aiModel?: string
  isActive?: boolean
}
