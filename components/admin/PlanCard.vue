<script setup lang="ts">
import type { PlanDetails } from '~/types/company'

const props = withDefaults(defineProps<{
  plan: PlanDetails
  /** Compact mode renders a smaller card without the full feature list. */
  compact?: boolean
  /** Dark mode for the superadmin layout (light text on dark background). */
  dark?: boolean
}>(), {
  compact: false,
  dark: false,
})

const { t } = useI18n()
const pricing = usePricing()

const formattedPrice = computed(() =>
  pricing.formatMoney(props.plan.monthlyPrice, props.plan.currency),
)

const priceBreakdown = computed(() => {
  const { subtotal, iva, total } = pricing.breakdown(props.plan.monthlyPrice)
  return {
    subtotal: pricing.formatMoney(subtotal, props.plan.currency),
    iva: pricing.formatMoney(iva, props.plan.currency),
    total: pricing.formatMoney(total, props.plan.currency),
  }
})

// Plan-specific accent so the card visually communicates tier.
const accent = computed(() => {
  switch (props.plan.code) {
    case 'PREMIUM':
      return {
        chip: 'bg-violet-500/10 text-violet-700 ring-violet-200',
        chipDark: 'bg-violet-500/15 text-violet-200 ring-violet-500/30',
        bar: 'from-violet-500 to-violet-600',
        icon: 'text-violet-600',
        iconDark: 'text-violet-300',
      }
    case 'PROFESSIONAL':
      return {
        chip: 'bg-indigo-500/10 text-indigo-700 ring-indigo-200',
        chipDark: 'bg-indigo-500/15 text-indigo-200 ring-indigo-500/30',
        bar: 'from-indigo-500 to-indigo-600',
        icon: 'text-indigo-600',
        iconDark: 'text-indigo-300',
      }
    case 'BASIC':
    default:
      return {
        chip: 'bg-emerald-500/10 text-emerald-700 ring-emerald-200',
        chipDark: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30',
        bar: 'from-emerald-500 to-emerald-600',
        icon: 'text-emerald-600',
        iconDark: 'text-emerald-300',
      }
  }
})

const botsLimitLabel = computed(() => {
  if (props.plan.limits.bots === null) return t('admin.planCard.unlimitedBots')
  return props.plan.limits.bots === 1
    ? t('admin.planCard.oneBotIncluded')
    : t('admin.planCard.upToBots', { count: props.plan.limits.bots })
})
</script>

<template>
  <div
    class="overflow-hidden rounded-2xl shadow-glass-lg ring-1"
    :class="dark ? 'bg-slate-900/70 backdrop-blur-xl ring-slate-700/50' : 'bg-white/80 backdrop-blur-xl ring-white/60'"
  >
    <div class="h-1 w-full bg-gradient-to-r" :class="accent.bar" aria-hidden="true" />
    <div class="p-5">
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1"
            :class="dark ? accent.chipDark : accent.chip"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
              <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2" />
            </svg>
            {{ plan.code }}
          </span>
          <h3
            class="mt-2 text-lg font-semibold leading-tight"
            :class="dark ? 'text-slate-100' : 'text-slate-900'"
          >
            {{ plan.displayName }}
          </h3>
          <p class="mt-0.5 text-xs" :class="dark ? 'text-slate-400' : 'text-slate-500'">
            {{ botsLimitLabel }}
          </p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-2xl font-bold" :class="dark ? 'text-slate-100' : 'text-slate-900'">
            {{ formattedPrice }}
          </p>
          <p class="text-[11px]" :class="dark ? 'text-slate-500' : 'text-slate-500'">
            {{ $t('admin.planCard.perMonth', { currency: plan.currency }) }}
          </p>
        </div>
      </header>

      <!-- Pricing breakdown: subtotal + IVA + total. IVA rate is driven by
           `NUXT_PUBLIC_IVA_RATE` via `usePricing` (no hardcoded "15%" here). -->
      <dl
        class="mt-4 rounded-xl ring-1 p-3 text-xs space-y-1.5"
        :class="dark ? 'bg-slate-800/60 ring-slate-700/60' : 'bg-slate-50/80 ring-slate-200/70'"
      >
        <div class="flex items-center justify-between gap-2">
          <dt :class="dark ? 'text-slate-400' : 'text-slate-500'">
            {{ $t('admin.planCard.priceSubtotal') }}
          </dt>
          <dd
            class="font-mono font-medium tabular-nums"
            :class="dark ? 'text-slate-200' : 'text-slate-800'"
          >
            {{ priceBreakdown.subtotal }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-2">
          <dt :class="dark ? 'text-slate-400' : 'text-slate-500'">
            {{ $t('admin.planCard.priceIva', { percent: pricing.ivaPercentLabel.value }) }}
          </dt>
          <dd
            class="font-mono font-medium tabular-nums"
            :class="dark ? 'text-slate-200' : 'text-slate-800'"
          >
            {{ priceBreakdown.iva }}
          </dd>
        </div>
        <div
          class="flex items-center justify-between gap-2 pt-1.5 border-t"
          :class="dark ? 'border-slate-700/60' : 'border-slate-200'"
        >
          <dt
            class="text-[11px] uppercase tracking-wider font-semibold"
            :class="dark ? accent.iconDark : accent.icon"
          >
            {{ $t('admin.planCard.priceTotal') }}
          </dt>
          <dd
            class="font-mono text-sm font-semibold tabular-nums"
            :class="dark ? 'text-slate-100' : 'text-slate-900'"
          >
            {{ priceBreakdown.total }}
          </dd>
        </div>
      </dl>

      <ul v-if="!compact" class="mt-4 space-y-1.5 text-sm" :class="dark ? 'text-slate-300' : 'text-slate-700'">
        <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4 mt-0.5 shrink-0"
            :class="dark ? accent.iconDark : accent.icon"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span class="leading-snug">{{ feature }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
