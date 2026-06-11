<script setup lang="ts">
import type { ApiError } from '~/types/api'

/**
 * Superadmin-only card that fires the billing expiration sweep manually.
 *
 * The same job runs automatically every day at 03:00 (server time) via the
 * backend `BillingCronService`. The manual trigger exists for two cases:
 *  - Forcing the sweep ahead of the next tick when a tenant has just
 *    deactivated, to validate the flow visually.
 *  - Re-running it after a server outage that crossed the 03:00 window.
 *
 * Result is shown inline; the action is idempotent — clicking it twice in a
 * row will report 0 expired cycles on the second click.
 */
const billing = useBilling()
const { t } = useI18n()

const running = ref(false)
const message = ref<{ kind: 'success' | 'error'; text: string } | null>(null)

async function onRun(): Promise<void> {
  if (running.value) return
  running.value = true
  message.value = null
  try {
    const { expired } = await billing.runExpirationSweep()
    message.value = {
      kind: 'success',
      text: expired > 0
        ? t('superadmin.billing.sweepDone', { count: expired })
        : t('superadmin.billing.sweepNoneClosed'),
    }
  } catch (err) {
    const apiError = err as ApiError
    message.value = {
      kind: 'error',
      text: apiError?.message ?? t('superadmin.billing.sweepError'),
    }
  } finally {
    running.value = false
  }
}
</script>

<template>
  <div class="rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-slate-100">{{ $t('superadmin.billing.sweepTitle') }}</h3>
        <p class="mt-1 text-xs text-slate-400 max-w-xl">
          {{ $t('superadmin.billing.sweepDescription') }}
        </p>
      </div>
      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
        :disabled="running"
        @click="onRun"
      >
        <svg
          v-if="running"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-4 animate-spin"
          aria-hidden="true"
        >
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
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
          class="size-4"
          aria-hidden="true"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {{ running ? $t('superadmin.billing.sweepRunning') : $t('superadmin.billing.sweepButton') }}
      </button>
    </div>

    <p
      v-if="message"
      class="mt-3 rounded-xl px-3 py-2 text-xs font-medium"
      :class="message.kind === 'success' ? 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/30' : 'bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/30'"
    >
      {{ message.text }}
    </p>
  </div>
</template>
