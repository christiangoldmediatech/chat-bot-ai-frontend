export interface OpenRouterKeyResponse {
  botId: string
  hasKey: boolean
  hashPreview: string | null
  budgetUsd: number | null
  usageUsd: number | null
  usagePercent: number | null
  provisionedAt: string | null
}

export interface ProvisionOpenRouterKeyInput {
  limitUsd?: number
}

export interface UpdateOpenRouterKeyBudgetInput {
  limitUsd: number | null
}
