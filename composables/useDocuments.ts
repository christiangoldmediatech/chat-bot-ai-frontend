import type { DocumentItem } from '~/types/document'

export function useDocuments() {
  const api = useApi()

  return {
    listForBot: (botId: string): Promise<DocumentItem[]> =>
      api.get<DocumentItem[]>('/documents', { query: { botId } }),
    get: (id: string): Promise<DocumentItem> => api.get<DocumentItem>(`/documents/${id}`),
    /**
     * Upload via multipart/form-data. ofetch detects FormData and sets the
     * right Content-Type boundary automatically; we just package the file +
     * botId here and hand it off to useApi.
     */
    upload: (botId: string, file: File): Promise<DocumentItem> => {
      const fd = new FormData()
      fd.append('botId', botId)
      fd.append('file', file)
      return api.post<DocumentItem>('/documents', fd)
    },
    remove: (id: string): Promise<void> => api.delete(`/documents/${id}`),
  }
}
