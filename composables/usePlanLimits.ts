import type { Tenant } from '~/types/company'

/**
 * Frontend safety net for plan quotas. The backend's `planDetails.limits`
 * is the source of truth, but we clamp each plan to its known ceiling here
 * so the UX stays correct even if the catalog drifts — a paying-tier limit
 * is never silently relaxed to "unlimited" in the admin UI.
 */
const PLAN_BOT_FALLBACK: Record<string, number> = {
  BASIC: 1,
  PROFESSIONAL: 3,
  PREMIUM: 10,
}

export function resolveBotsLimit(tenant: Tenant | null | undefined): number | null {
  if (!tenant) return null
  const backendLimit = tenant.planDetails.limits.bots
  const fallback = PLAN_BOT_FALLBACK[tenant.plan]
  if (fallback === undefined) return backendLimit
  return backendLimit === null ? fallback : Math.min(backendLimit, fallback)
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
