<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { BillingState } from '~/types/billing'

/**
 * Read-and-act billing panel for the superadmin company detail page.
 *
 * Behavior:
 *  - On mount, fetches `/superadmin/tenants/:id/billing`.
 *  - Renders the active cycle (or a "no active cycle" empty state) plus a
 *    slim history of the last few payments.
 *  - "Registrar pago" opens the multipart dialog. On confirm, calls the
 *    superadmin endpoint and re-fetches the state on success so the new
 *    cycle + payment row appear without a page reload.
 *  - "Desactivar manualmente" runs the kill switch with an explicit
 *    confirmation prompt.
 *
 * Re-fetching is the source of truth — never assume the dialog payload
 * matches what the server actually persisted (the server may compute
 * different dates if the cycle was already overdue).
 */

const props = defineProps<{
  tenantId: string
  tenantName: string
  planSummary?: string
}>()

const billing = useBilling()
const { t } = useI18n()

const state = ref<BillingState | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const dialogOpen = ref(false)
const dialogLoading = ref(false)
const dialogError = ref<string | null>(null)
const confirmingDeactivate = ref(false)
const deactivating = ref(false)
const banner = ref<{ kind: 'success' | 'error'; text: string } | null>(null)

const cycleTone = computed<'ok' | 'trial' | 'warning' | 'expired'>(() => {
  if (!state.value) return 'ok'
  if (state.value.tenantStatus !== 'ACTIVE') return 'expired'
  if (state.value.activeCycle?.isTrial) return 'trial'
  const days = state.value.daysRemaining
  if (days !== null && days <= 10) return 'warning'
  return 'ok'
})

const activeUntilFormatted = computed<string | null>(() => {
  const ends = state.value?.activeCycle?.endsAt
  if (!ends) return null
  return new Date(ends).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    state.value = await billing.forTenant(props.tenantId)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function onConfirmRegister(payload: { monthsCovered: number; file: File; paidAt?: string; note?: string }): Promise<void> {
  dialogLoading.value = true
  dialogError.value = null
  try {
    await billing.registerPayment(
      props.tenantId,
      { monthsCovered: payload.monthsCovered, paidAt: payload.paidAt, note: payload.note },
      payload.file,
    )
    dialogOpen.value = false
    banner.value = { kind: 'success', text: t('superadmin.billing.registerSuccess') }
    setTimeout(() => { banner.value = null }, 4000)
    await load()
  } catch (err) {
    dialogError.value = (err as ApiError).message ?? t('superadmin.billing.registerError')
  } finally {
    dialogLoading.value = false
  }
}

async function onConfirmDeactivate(): Promise<void> {
  deactivating.value = true
  try {
    await billing.deactivate(props.tenantId)
    confirmingDeactivate.value = false
    banner.value = { kind: 'success', text: t('superadmin.billing.deactivateSuccess') }
    setTimeout(() => { banner.value = null }, 4000)
    await load()
  } catch (err) {
    banner.value = { kind: 'error', text: (err as ApiError).message ?? t('superadmin.billing.deactivateError') }
  } finally {
    deactivating.value = false
  }
}
</script>

<template>
  <section class="rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5">
    <header class="flex items-start justify-between gap-3 flex-wrap">
      <div class="min-w-0">
        <h2 class="text-base font-semibold text-slate-100">{{ $t('superadmin.billing.cardTitle') }}</h2>
        <p class="mt-0.5 text-xs text-slate-500 max-w-xl">{{ $t('superadmin.billing.cardSubtitle') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition"
          :disabled="loading"
          @click="dialogOpen = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {{ $t('superadmin.billing.registerButton') }}
        </button>
        <button
          v-if="state?.tenantStatus === 'ACTIVE'"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-rose-700/60 bg-rose-950/30 px-3 py-1.5 text-sm font-medium text-rose-200 hover:bg-rose-950/60 disabled:opacity-60 transition"
          :disabled="loading"
          @click="confirmingDeactivate = true"
        >
          {{ $t('superadmin.billing.deactivateButton') }}
        </button>
      </div>
    </header>

    <p
      v-if="banner"
      class="mt-3 rounded-xl px-3 py-2 text-xs font-medium"
      :class="banner.kind === 'success' ? 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/30' : 'bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/30'"
    >
      {{ banner.text }}
    </p>

    <p v-if="error" class="mt-3 rounded-xl border border-rose-700/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-4" tone="dark" />

    <template v-else-if="state">
      <!-- Active cycle summary -->
      <div
        class="mt-4 rounded-xl p-4 ring-1"
        :class="{
          'bg-emerald-500/5 ring-emerald-500/30': cycleTone === 'ok',
          'bg-sky-500/5 ring-sky-500/30': cycleTone === 'trial',
          'bg-amber-500/5 ring-amber-500/30': cycleTone === 'warning',
          'bg-rose-500/5 ring-rose-500/30': cycleTone === 'expired',
        }"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p
              class="text-[11px] uppercase tracking-wider font-semibold"
              :class="{
                'text-emerald-300': cycleTone === 'ok',
                'text-sky-300': cycleTone === 'trial',
                'text-amber-300': cycleTone === 'warning',
                'text-rose-300': cycleTone === 'expired',
              }"
            >
              {{ $t('superadmin.billing.cycleLabel') }}
            </p>
            <template v-if="state.tenantStatus === 'SUSPENDED'">
              <p class="mt-1 text-sm font-semibold text-rose-100">{{ $t('superadmin.billing.statusSuspended') }}</p>
            </template>
            <template v-else-if="state.tenantStatus === 'PENDING_PAYMENT'">
              <p class="mt-1 text-sm font-semibold text-rose-100">{{ $t('superadmin.billing.statusPending') }}</p>
            </template>
            <template v-else-if="activeUntilFormatted">
              <p class="mt-1 text-sm font-semibold text-slate-100">
                <template v-if="state.activeCycle?.isTrial">
                  {{ $t('superadmin.billing.trialUntil', { date: activeUntilFormatted }) }}
                </template>
                <template v-else>
                  {{ $t('superadmin.billing.activeUntil', { date: activeUntilFormatted }) }}
                </template>
              </p>
              <p
                v-if="state.daysRemaining !== null"
                class="mt-0.5 text-xs"
                :class="{
                  'text-emerald-300/80': cycleTone === 'ok',
                  'text-sky-300/80': cycleTone === 'trial',
                  'text-amber-300/80': cycleTone === 'warning',
                }"
              >
                {{ state.daysRemaining === 0
                  ? $t('superadmin.billing.daysToday')
                  : $t('superadmin.billing.daysRemaining', { days: state.daysRemaining }, state.daysRemaining) }}
              </p>
            </template>
            <template v-else>
              <p class="mt-1 text-sm font-semibold text-slate-200">{{ $t('superadmin.billing.noActiveCycle') }}</p>
            </template>
          </div>

          <div v-if="state.activeCycle" class="text-right text-xs text-slate-400">
            <p>{{ $t('superadmin.billing.cycleStarted', { date: new Date(state.activeCycle.startsAt).toLocaleDateString() }) }}</p>
            <p class="mt-0.5">{{ $t('superadmin.billing.cycleMonths', { n: state.activeCycle.monthsCovered }) }}</p>
          </div>
        </div>
      </div>

      <!-- Payment history (latest first) -->
      <div class="mt-5">
        <h3 class="text-xs uppercase tracking-wider font-semibold text-slate-500">
          {{ $t('superadmin.billing.historyTitle') }}
        </h3>
        <div v-if="state.payments.length === 0" class="mt-2 rounded-xl bg-slate-950/60 ring-1 ring-slate-800 px-3 py-4 text-center text-xs text-slate-500">
          {{ $t('superadmin.billing.historyEmpty') }}
        </div>
        <ul v-else class="mt-2 divide-y divide-slate-800 rounded-xl bg-slate-950/60 ring-1 ring-slate-800 overflow-hidden">
          <li v-for="p in state.payments" :key="p.id" class="px-4 py-3 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm text-slate-100 font-medium">
                {{ p.currency }} {{ p.amount.toFixed(2) }} · {{ $t('superadmin.billing.paymentMonths', { n: p.monthsCovered }) }}
              </p>
              <p class="text-[11px] text-slate-500 mt-0.5">
                {{ new Date(p.paidAt).toLocaleString() }}
                <template v-if="p.note"> · {{ p.note }}</template>
              </p>
            </div>
            <a
              :href="p.depositImageUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {{ $t('superadmin.billing.viewReceipt') }}
            </a>
          </li>
        </ul>
      </div>
    </template>

    <SuperadminRegisterPaymentDialog
      :open="dialogOpen"
      :tenant-name="tenantName"
      :plan-summary="planSummary"
      :loading="dialogLoading"
      :error="dialogError"
      @cancel="dialogOpen = false; dialogError = null"
      @confirm="onConfirmRegister"
    />

    <ConfirmDialog
      :open="confirmingDeactivate"
      :title="$t('superadmin.billing.deactivateConfirmTitle', { name: tenantName })"
      :message="$t('superadmin.billing.deactivateConfirmMessage')"
      :confirm-label="$t('superadmin.billing.deactivateConfirmAction')"
      @cancel="confirmingDeactivate = false"
      @confirm="onConfirmDeactivate"
    />
  </section>
</template>
