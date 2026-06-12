/**
 * Single source of truth for VAT (IVA) and currency formatting across the
 * payment page, billing banner, and any future surface that needs to quote
 * the customer how much to deposit.
 *
 * The rate is driven by `NUXT_PUBLIC_IVA_RATE` (see `nuxt.config.ts`). Default
 * is 0.15 (Ecuador, June 2026) — if the rate changes, override the env var,
 * don't grep for "15" across the codebase.
 */
export interface PriceBreakdown {
  subtotal: number
  iva: number
  total: number
}

export function usePricing() {
  const config = useRuntimeConfig()
  const { locale } = useI18n()

  // `runtimeConfig.public.ivaRate` is typed as `unknown` when overridden via
  // env var, so coerce defensively and fall back to the documented default.
  const rawRate = config.public.ivaRate
  const ivaRate = typeof rawRate === 'number' && rawRate >= 0 ? rawRate : 0.15

  function breakdown(subtotal: number): PriceBreakdown {
    const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0
    const iva = safeSubtotal * ivaRate
    return {
      subtotal: safeSubtotal,
      iva,
      total: safeSubtotal + iva,
    }
  }

  function formatMoney(amount: number, currency = 'USD'): string {
    const tag = locale.value === 'es' ? 'es-EC' : 'en-US'
    return new Intl.NumberFormat(tag, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Whole-number percent for display (15 from 0.15). Falls back to one
  // decimal if the rate isn't a clean integer (e.g. 0.125 → "12.5").
  const ivaPercentLabel = computed(() => {
    const pct = ivaRate * 100
    return Number.isInteger(pct) ? String(pct) : pct.toFixed(1)
  })

  return {
    ivaRate,
    ivaPercentLabel,
    breakdown,
    formatMoney,
  }
}
