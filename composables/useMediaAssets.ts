import type {
  CreateLocationMediaAssetInput,
  CreateMediaAssetInput,
  MediaAsset,
} from '~/types/media-asset'

/**
 * Media library management for a bot. Without a tenantId, hits the
 * tenant-scoped routes. With a tenantId, hits the nested superadmin route.
 *
 * Mirrors the `useDocuments` shape so admin pages can swap them by mode.
 */
export function useMediaAssets(tenantId?: string) {
  const api = useApi()

  const base = (botId: string): string =>
    tenantId
      ? `/superadmin/companies/${tenantId}/bots/${botId}/media-assets`
      : `/bots/${botId}/media-assets`

  return {
    listForBot: (botId: string): Promise<MediaAsset[]> => {
      return api.get<MediaAsset[]>(base(botId))
    },

    /**
     * Upload an image / PDF / video / audio file. Server infers mediaType
     * from the MIME and enforces per-type size caps (5MB / 100MB / 16MB).
     * ofetch detects FormData and sets the multipart boundary automatically.
     */
    uploadFile: (
      botId: string,
      file: File,
      input: CreateMediaAssetInput,
    ): Promise<MediaAsset> => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('key', input.key)
      fd.append('description', input.description)
      if (input.displayFilename) {
        fd.append('displayFilename', input.displayFilename)
      }
      return api.post<MediaAsset>(`${base(botId)}/upload`, fd)
    },

    createLocation: (
      botId: string,
      input: CreateLocationMediaAssetInput,
    ): Promise<MediaAsset> => {
      return api.post<MediaAsset>(`${base(botId)}/location`, input)
    },

    remove: (botId: string, id: string): Promise<void> => {
      return api.delete<void>(`${base(botId)}/${id}`)
    },

    /**
     * Short-lived signed URL for previewing an outbound asset in the chat
     * viewer. Returns `{ url: null }` for LOCATION assets and other types
     * that have no payload.
     */
    getDownloadUrl: (botId: string, id: string): Promise<{ url: string | null }> => {
      return api.get<{ url: string | null }>(`${base(botId)}/${id}/download-url`)
    },
  }
}
