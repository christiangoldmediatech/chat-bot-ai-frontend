// Mirrors the backend Prisma enum (see chat-bot-ai-backend/prisma/schema.prisma).
// TEXT exists in the enum but never appears in MediaAsset rows — it's a
// Message-only state.
export type MediaType =
  | 'IMAGE'
  | 'DOCUMENT'
  | 'VIDEO'
  | 'AUDIO'
  | 'VOICE'
  | 'STICKER'
  | 'LOCATION'

export type MediaStorageDriver = 'S3' | 'META'

export interface MediaAsset {
  id: string
  botId: string
  key: string
  description: string
  mediaType: MediaType
  mimeType: string
  sizeBytes: number
  originalFilename?: string | null
  storageDriver: MediaStorageDriver
  // True when a Meta media_id is cached and <25 days old. Useful to surface
  // "ready to send instantly" vs. "first send will re-upload" in the UI.
  hasMetaCache: boolean
  // For LOCATION assets: { latitude, longitude, name?, address? }.
  // For media assets: usually empty.
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateMediaAssetInput {
  key: string
  description: string
  displayFilename?: string
}

export interface CreateLocationMediaAssetInput {
  key: string
  description: string
  latitude: number
  longitude: number
  name?: string
  address?: string
}
