import type { Tenant } from '~/types/company'

/**
 * Frontend safety net for plan quotas. The backend's `planDetails.limits`
 * is the source of truth, but we cap BASIC at 1 bot here too so the UX
 * stays correct even if the catalog drifts (e.g. a staging seed accidentally
 * leaves BASIC's limit as null) — a paying-tier limit is never silently
 * relaxed to "unlimited" in the admin UI.
 */
export function resolveBotsLimit(tenant: Tenant | null | undefined): number | null {
  if (!tenant) return null
  const backendLimit = tenant.planDetails.limits.bots
  if (tenant.plan === 'BASIC') {
    return backendLimit === null ? 1 : Math.min(backendLimit, 1)
  }
  return backendLimit
}

/**
 * RAG documents per bot. Pure pass-through to the backend-reported plan
 * limit — no hard-coded numbers on the frontend. Returns `null` when the
 * tenant is missing or when the payload predates the `documentsPerBot` field;
 * callers should treat `null` as "don't know, let the backend decide" and not
 * block the UI proactively.
 */
export function resolveDocumentsPerBotLimit(
  tenant: Tenant | null | undefined,
): number | null {
  if (!tenant) return null
  return tenant.planDetails.limits.documentsPerBot ?? null
}
