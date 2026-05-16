export type DocumentStatus = 'PROCESSING' | 'READY' | 'ERROR'

export interface DocumentItem {
  id: string
  botId: string
  fileName: string
  fileType: string
  status: DocumentStatus
  chunkCount?: number
  createdAt: string
}

export interface DocumentContent {
  id: string
  fileName: string
  fileType: string
  chunkCount: number
  // Stored chunks joined with double newlines. Empty for non-READY docs.
  content: string
}
