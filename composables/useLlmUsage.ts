export interface UsageRow {
  model: string
  kind: string
  calls: number
  inputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  costUsd: number
}

export interface UsageSummary {
  rangeHours: number
  totalCalls: number
  totalCostUsd: number
  avgCostPerConversation: number
  avgCostPerCall: number
  byModelKind: UsageRow[]
}

export interface UsageByBotRow {
  botId: string | null
  botName: string | null
  tenantId: string | null
  tenantName: string | null
  calls: number
  costUsd: number
}

export interface PlatformUsageSummary extends UsageSummary {
  byBot: UsageByBotRow[]
}

export function useLlmUsage() {
  const api = useApi()
  return {
    summary: (opts: { botId?: string, hours?: number } = {}): Promise<UsageSummary> => {
      const query: Record<string, unknown> = {}
      if (opts.botId) query.botId = opts.botId
      if (opts.hours !== undefined) query.hours = opts.hours
      return api.get<UsageSummary>(
        '/admin/llm-usage/summary',
        Object.keys(query).length > 0 ? { query } : undefined,
      )
    },
    platformSummary: (opts: { tenantId?: string, botId?: string, hours?: number } = {}): Promise<PlatformUsageSummary> => {
      const query: Record<string, unknown> = {}
      if (opts.tenantId) query.tenantId = opts.tenantId
      if (opts.botId) query.botId = opts.botId
      if (opts.hours !== undefined) query.hours = opts.hours
      return api.get<PlatformUsageSummary>(
        '/superadmin/llm-usage/summary',
        Object.keys(query).length > 0 ? { query } : undefined,
      )
    },
  }
}
