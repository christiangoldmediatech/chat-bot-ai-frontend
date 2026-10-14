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

export type DocumentType =
  | 'SERVICE'
  | 'POLICY'
  | 'FAQ'
  | 'PREPARATION'
  | 'LOCATION'
  | 'PAYMENTS'
  | 'OTHER'

export interface DocumentCoverageSummary {
  totalServices: number
  servicesWithCompleteData: number
  completenessPercent: number
  totalDocs: number
  docsWithoutServiceLink: number
}

export interface DocWithoutService {
  documentId: string
  title?: string | null
  fileName: string
  documentType?: DocumentType | null
}

export interface ServiceWithIncompleteFields {
  serviceId: string
  name: string
  missing: string[]
}

export interface DocumentCoverage {
  summary: DocumentCoverageSummary
  docsWithoutServices: DocWithoutService[]
  servicesWithIncompleteFields: ServiceWithIncompleteFields[]
}
