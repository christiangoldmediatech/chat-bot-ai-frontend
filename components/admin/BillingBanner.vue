<script setup lang="ts">
import type { BillingState } from '~/types/billing'

import { BILLING_WARNING_DAYS } from '~/composables/useBilling'

/**
 * Global notice strip rendered on top of every admin layout view. Surfaces
 * three escalating states:
 *
 *  1. `SUSPENDED`            — red, "Account suspended".
 *  2. `PENDING_PAYMENT`      — red, "Subscription expired".
 *  3. `ACTIVE` + days ≤ N    — amber, "Renews in X days" (renewal nudge).
 *
 * Hidden when the tenant is ACTIVE with more than `BILLING_WARNING_DAYS` of
 * runway. Auto-refetches once on mount; the parent layout decides when to
 * refresh by changing the component key.
 *
 * `/billing/me` is whitelisted server-side via `@SkipBillingCheck()` so this
 * call also works when the tenant is already suspended.
 */
const billing = useBilling()
const state = ref<BillingState | null>(null)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  try {
    state.value = await billing.me()
    error.value = null
  } catch (err) {
    // Silent — the banner is best-effort decoration; if /billing/me itself
    // fails we don't want to push a second error on top of whatever the
    // page is already showing.
    state.value = null
    error.value = err instanceof Error ? err.message : String(err)
  }
}

onMounted(load)

const variant = computed<'suspended' | 'pending' | 'warning' | null>(() => {
  if (!state.value) return null
  if (state.value.tenantStatus === 'SUSPENDED') return 'suspended'
  if (state.value.tenantStatus === 'PENDING_PAYMENT') return 'pending'
  const days = state.value.daysRemaining
  if (days !== null && days <= BILLING_WARNING_DAYS) return 'warning'
  return null
})

const days = computed(() => state.value?.daysRemaining ?? 0)
</script>

<template>
  <div v-if="variant" :class="bannerClass(variant)" role="status">
    <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-5 shrink-0"
        aria-hidden="true"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <p class="flex-1 text-sm font-medium">
        <template v-if="variant === 'suspended'">{{ $t('billing.banner.suspended') }}</template>
        <template v-else-if="variant === 'pending'">{{ $t('billing.banner.pendingPayment') }}</template>
        <template v-else-if="days === 0">{{ $t('billing.banner.renewToday') }}</template>
        <template v-else>{{ $t('billing.banner.renewSoon', { days }, days) }}</template>
      </p>
    </div>
  </div>
</template>

<script lang="ts">
function bannerClass(variant: 'suspended' | 'pending' | 'warning'): string {
  // Tailwind needs the literal class strings to be resolvable at build time,
  // so we return a fixed string per variant rather than composing classes.
  if (variant === 'warning') return 'bg-amber-50 text-amber-900 border-b border-amber-200'
  return 'bg-red-50 text-red-900 border-b border-red-200'
}
</script>
