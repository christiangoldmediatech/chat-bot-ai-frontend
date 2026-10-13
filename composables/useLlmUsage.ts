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
  }
}
