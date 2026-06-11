<script setup lang="ts">
import type { BillingState } from '~/types/billing'

import { BILLING_WARNING_DAYS } from '~/composables/useBilling'

/**
 * Global notice strip rendered on top of every admin layout view. Surfaces
 * three escalating states:
 *
 *  1. `SUSPENDED`            — rose, "Account suspended".
 *  2. `PENDING_PAYMENT`      — rose, "Subscription expired".
 *  3. `ACTIVE` + days ≤ N    — amber, "Renews in X days" (renewal nudge).
 *
 * Hidden when the tenant is ACTIVE with more than `BILLING_WARNING_DAYS` of
 * runway. Auto-refetches once on mount; the parent layout decides when to
 * refresh by changing the component key.
 *
 * `/billing/me` is whitelisted server-side via `@SkipBillingCheck()` so this
 * call also works when the tenant is already suspended.
 */
const { t } = useI18n()
const billing = useBilling()
const auth = useAuthStore()
const state = ref<BillingState | null>(null)
const error = ref<string | null>(null)

// The platform owner account (info@kaibots.com) is exempt: it's the company's
// own tenant, always active, so we don't surface renewal warnings or
// suspension states to it.
const PLATFORM_OWNER_EMAIL = 'info@kaibots.com'
const isPlatformOwner = computed(() =>
  auth.user?.email?.toLowerCase() === PLATFORM_OWNER_EMAIL,
)

async function load(): Promise<void> {
  try {
    state.value = await billing.me()
    error.value = null
  } catch (err) {
    state.value = null
    error.value = err instanceof Error ? err.message : String(err)
  }
}

onMounted(load)

type Variant = 'suspended' | 'pending' | 'warning'

const variant = computed<Variant | null>(() => {
  if (isPlatformOwner.value) return null
  if (!state.value) return null
  if (state.value.tenantStatus === 'SUSPENDED') return 'suspended'
  if (state.value.tenantStatus === 'PENDING_PAYMENT') return 'pending'
  const days = state.value.daysRemaining
  if (days !== null && days <= BILLING_WARNING_DAYS) return 'warning'
  return null
})

const days = computed(() => state.value?.daysRemaining ?? 0)
const SUPPORT_EMAIL = 'info@kaibots.com'
const supportEmail = computed(() => SUPPORT_EMAIL)

const title = computed<string>(() => {
  switch (variant.value) {
    case 'suspended':
      return t('billing.banner.suspendedTitle')
    case 'pending':
      return t('billing.banner.pendingTitle')
    case 'warning':
      return days.value === 0
        ? t('billing.banner.warningTitleToday')
        : t('billing.banner.warningTitle')
    default:
      return ''
  }
})

const message = computed<string>(() => {
  const email = supportEmail.value
  switch (variant.value) {
    case 'suspended':
      return t('billing.banner.suspended', { email })
    case 'pending':
      return t('billing.banner.pendingPayment', { email })
    case 'warning':
      return days.value === 0
        ? t('billing.banner.renewToday', { email })
        : t('billing.banner.renewSoon', { days: days.value, email }, days.value)
    default:
      return ''
  }
})

const mailtoHref = computed(() => {
  const subject = encodeURIComponent(`[Kaibots] ${title.value}`)
  return `mailto:${supportEmail.value}?subject=${subject}`
})

// Returns literal Tailwind classes (build-time resolvable) per variant.
const styles = computed(() => {
  switch (variant.value) {
    case 'suspended':
      return {
        wrapper: 'bg-gradient-to-r from-rose-50 via-rose-50 to-white text-rose-900 border-b border-rose-200/80',
        accent: 'bg-gradient-to-r from-rose-500 via-rose-500 to-rose-400',
        iconRing: 'bg-rose-100 text-rose-700 ring-rose-200',
        title: 'text-rose-900',
        body: 'text-rose-800/90',
        emailChip: 'bg-white/80 text-rose-700 ring-rose-200 hover:bg-white hover:ring-rose-300',
        cta: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600',
      }
    case 'pending':
      return {
        wrapper: 'bg-gradient-to-r from-rose-50 via-rose-50 to-white text-rose-900 border-b border-rose-200/80',
        accent: 'bg-gradient-to-r from-rose-500 via-rose-500 to-rose-400',
        iconRing: 'bg-rose-100 text-rose-700 ring-rose-200',
        title: 'text-rose-900',
        body: 'text-rose-800/90',
        emailChip: 'bg-white/80 text-rose-700 ring-rose-200 hover:bg-white hover:ring-rose-300',
        cta: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600',
      }
    case 'warning':
      return {
        wrapper: 'bg-gradient-to-r from-amber-50 via-amber-50 to-white text-amber-900 border-b border-amber-200/80',
        accent: 'bg-gradient-to-r from-amber-500 via-amber-500 to-amber-400',
        iconRing: 'bg-amber-100 text-amber-700 ring-amber-200',
        title: 'text-amber-900',
        body: 'text-amber-800/90',
        emailChip: 'bg-white/80 text-amber-800 ring-amber-200 hover:bg-white hover:ring-amber-300',
        cta: 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:outline-amber-500',
      }
    default:
      return null
  }
})
</script>

<template>
  <div v-if="variant && styles" :class="['relative', styles.wrapper]" role="status">
    <span :class="['absolute inset-x-0 top-0 h-0.5', styles.accent]" aria-hidden="true" />

    <div class="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:items-center sm:gap-4 sm:px-6">
      <div
        :class="['flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', styles.iconRing]"
        aria-hidden="true"
      >
        <svg
          v-if="variant === 'suspended'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
        <svg
          v-else-if="variant === 'pending'"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-5"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-5"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p :class="['text-sm font-semibold leading-5', styles.title]">{{ title }}</p>
          <a
            :href="`mailto:${supportEmail}`"
            :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset transition', styles.emailChip]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {{ supportEmail }}
          </a>
        </div>
        <p :class="['mt-0.5 text-[13px] leading-5', styles.body]">{{ message }}</p>
      </div>

      <a
        :href="mailtoHref"
        :class="['shrink-0 hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2', styles.cta]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        {{ $t('billing.banner.sendReceipt') }}
      </a>
    </div>
  </div>
</template>
