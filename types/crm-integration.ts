import type { IntegrationProvider } from '~/types/integration'

export type CrmWebhookMethod = 'POST' | 'PUT' | 'PATCH'
export type CrmCustomAuthType = 'NONE' | 'BEARER' | 'BASIC' | 'API_KEY_HEADER'

export type ZohoRegion = 'us' | 'eu' | 'in' | 'au' | 'jp' | 'cn'

/**
 * Mirrors `CrmIntegrationResponseDto` in the backend. The encrypted secrets
 * (`refreshToken`, `customAuthSecret`) are NOT exposed — `hasRefreshToken`
 * and `hasAuthSecret` indicate whether one is stored.
 */
export interface CrmIntegration {
  id: string
  botId: string
  provider: IntegrationProvider
  isActive: boolean
  accountEmail: string | null
  instanceUrl: string | null
  apiDomain: string | null
  accountId: string | null
  isSandbox: boolean
  defaultLeadOwnerId: string | null
  hasRefreshToken: boolean

  // Custom webhook
  customName: string | null
  customEndpointUrl: string | null
  customMethod: CrmWebhookMethod | null
  customAuthType: CrmCustomAuthType | null
  customAuthHeaderName: string | null
  customHeaders: Record<string, unknown> | null
  customPayloadTemplate: Record<string, unknown> | null
  customSuccessStatusCodes: number[]
  customLeadIdJsonPath: string | null
  customLeadUrlTemplate: string | null
  hasAuthSecret: boolean

  // Tracking
  lastSyncAt: string | null
  lastSyncError: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Body para POST/PATCH `/bots/:botId/crm/custom`. Todos los campos son
 * opcionales — la validación de "requerido al crear" la hace el backend.
 * `customAuthSecret` se envía en texto plano (HTTPS) y se cifra del lado
 * del servidor con CryptoService.
 */
export interface UpsertCustomWebhookInput {
  customName?: string
  customEndpointUrl?: string
  customMethod?: CrmWebhookMethod
  customAuthType?: CrmCustomAuthType
  customAuthSecret?: string
  customAuthHeaderName?: string
  customHeaders?: Record<string, string>
  customPayloadTemplate?: Record<string, unknown>
  customSuccessStatusCodes?: number[]
  customLeadIdJsonPath?: string
  customLeadUrlTemplate?: string
  isActive?: boolean
}

export interface TestPushResult {
  ok: boolean
  leadId: string | null
  leadUrl: string | null
  error: string | null
  durationMs: number | null
}
