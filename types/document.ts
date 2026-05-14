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
