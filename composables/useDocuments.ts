import type { DocumentContent, DocumentItem } from '~/types/document'

/**
 * Document (RAG) management. Without a tenantId, hits the tenant-scoped
 * `/documents` routes. With a tenantId, hits the nested superadmin route
 * `/superadmin/companies/:tenantId/bots/:botId/documents` (botId required).
 */
export function useDocuments(tenantId?: string) {
  const api = useApi()
  const baseForBot = (botId: string): string =>
    tenantId
      ? `/superadmin/companies/${tenantId}/bots/${botId}/documents`
      : '/documents'

  return {
    listForBot: (botId: string): Promise<DocumentItem[]> => {
      if (tenantId) {
        return api.get<DocumentItem[]>(baseForBot(botId))
      }
      return api.get<DocumentItem[]>('/documents', { query: { botId } })
    },
    get: (id: string, botId?: string): Promise<DocumentItem> => {
      if (tenantId && botId) {
        return api.get<DocumentItem>(`${baseForBot(botId)}/${id}`)
      }
      return api.get<DocumentItem>(`/documents/${id}`)
    },
    /**
     * Upload via multipart/form-data. ofetch detects FormData and sets the
     * right Content-Type boundary automatically.
     */
    upload: (botId: string, file: File): Promise<DocumentItem> => {
      const fd = new FormData()
      fd.append('file', file)
      if (tenantId) {
        return api.post<DocumentItem>(baseForBot(botId), fd)
      }
      fd.append('botId', botId)
      return api.post<DocumentItem>('/documents', fd)
    },
    remove: (id: string, botId?: string): Promise<void> => {
      if (tenantId && botId) {
        return api.delete(`${baseForBot(botId)}/${id}`)
      }
      return api.delete(`/documents/${id}`)
    },
    /**
     * Returns the document's text (chunks joined). The original upload bytes
     * aren't kept, so this is the preview surface for the "View" action.
     */
    getContent: (id: string, botId?: string): Promise<DocumentContent> => {
      if (tenantId && botId) {
        return api.get<DocumentContent>(`${baseForBot(botId)}/${id}/content`)
      }
      return api.get<DocumentContent>(`/documents/${id}/content`)
    },
  }
}
