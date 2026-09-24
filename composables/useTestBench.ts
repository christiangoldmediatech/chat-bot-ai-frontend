export interface TestBenchToolCall {
  name: string
  input: unknown
  result: unknown
}

export interface TestBenchIntent {
  type: 'text' | 'image' | 'document' | 'video' | 'audio' | 'location'
  message?: string
  resourceKey?: string
  /** MediaAsset.id set by the enricher for service images. */
  assetId?: string
  caption?: string
  latitude?: number
  longitude?: number
}

export interface TestBenchRagChunk {
  documentId: string
  label: string
  distance: number
}

export interface TestBenchResponse {
  intents: TestBenchIntent[]
  toolCalls: TestBenchToolCall[]
  systemPromptPreview: string
  ragChunks: TestBenchRagChunk[]
}

export interface TestBenchTurn {
  role: 'USER' | 'ASSISTANT'
  content: string
}

/**
 * Cliente del banco de pruebas en seco. Corre turnos contra `runTestTurn`
 * del backend — sin persistencia, sin WhatsApp, sin side-effects.
 */
export function useTestBench() {
  const api = useApi()

  return {
    run: (
      botId: string,
      message: string,
      priorHistory: TestBenchTurn[] = [],
    ): Promise<TestBenchResponse> => {
      return api.post<TestBenchResponse>(`/bots/${botId}/test-bench/run`, {
        message,
        priorHistory,
      })
    },
  }
}
