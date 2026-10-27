<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { OpenRouterKeyResponse } from '~/types/openrouter-key'

const { locale } = useI18n()

const props = defineProps<{
  tenantId: string
  botId: string
}>()

const service = useOpenRouterKey(props.tenantId, props.botId)

const AUTO_REFRESH_MS = 60_000

const view = ref<OpenRouterKeyResponse | null>(null)
const loading = ref(true)
const busy = ref(false)
const refreshing = ref(false)
const error = ref<string | null>(null)
const lastRefreshAt = ref<number | null>(null)
const nowTick = ref(Date.now())

const provisionOpen = ref(false)
const editBudgetOpen = ref(false)
const confirmingRevoke = ref(false)
const savedAt = ref<number | null>(null)

const provisionForm = reactive({ limitUsd: 10 })
const budgetForm = reactive({ limitUsd: null as number | null })

let refreshTimer: ReturnType<typeof setInterval> | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null

const budgetBarColor = computed(() => {
  const pct = view.value?.usagePercent
  if (pct === null || pct === undefined) return 'bg-ink-cardHi'
  if (pct >= 90) return 'bg-danger-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
  if (pct >= 70) return 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
  return 'bg-brand-gradient shadow-halo-glow'
})

const formattedProvisionedAt = computed(() => {
  if (!view.value?.provisionedAt) return null
  return new Date(view.value.provisionedAt).toLocaleString()
})

const lastRefreshRelative = computed(() => {
  if (!lastRefreshAt.value) return null
  const diffMs = nowTick.value - lastRefreshAt.value
  const diffSec = Math.max(0, Math.round(diffMs / 1000))
  const isEs = (locale.value || 'es').startsWith('es')
  if (diffSec < 10) return isEs ? 'justo ahora' : 'just now'
  if (diffSec < 60) return isEs ? `hace ${diffSec} s` : `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  return isEs ? `hace ${diffMin} min` : `${diffMin} min ago`
})

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    view.value = await service.get()
    budgetForm.limitUsd = view.value.budgetUsd
    lastRefreshAt.value = Date.now()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function refresh(): Promise<void> {
  if (refreshing.value || loading.value) return
  refreshing.value = true
  try {
    const next = await service.get()
    view.value = next
    budgetForm.limitUsd = next.budgetUsd
    lastRefreshAt.value = Date.now()
    error.value = null
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    refreshing.value = false
  }
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    void refresh()
  }
}

async function onProvision(): Promise<void> {
  busy.value = true
  error.value = null
  try {
    const limit = provisionForm.limitUsd > 0 ? provisionForm.limitUsd : undefined
    view.value = await service.provision({ limitUsd: limit })
    budgetForm.limitUsd = view.value.budgetUsd
    provisionOpen.value = false
    flashSaved()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    busy.value = false
  }
}

async function onSaveBudget(): Promise<void> {
  busy.value = true
  error.value = null
  try {
    view.value = await service.updateBudget({ limitUsd: budgetForm.limitUsd })
    editBudgetOpen.value = false
    flashSaved()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    busy.value = false
  }
}

async function onRevoke(): Promise<void> {
  busy.value = true
  error.value = null
  try {
    await service.revoke()
    view.value = await service.get()
    budgetForm.limitUsd = view.value.budgetUsd
    confirmingRevoke.value = false
    flashSaved()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    busy.value = false
  }
}

function flashSaved(): void {
  savedAt.value = Date.now()
  setTimeout(() => {
    if (savedAt.value && Date.now() - savedAt.value >= 2500) {
      savedAt.value = null
    }
  }, 2600)
}

onMounted(async () => {
  await load()
  refreshTimer = setInterval(() => {
    void refresh()
  }, AUTO_REFRESH_MS)
  tickTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 15_000)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (tickTimer) clearInterval(tickTimer)
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
})
</script>

<template>
  <section class="space-y-5">
    <div
      v-if="error"
      class="rounded-xl border border-danger-500/40 bg-danger-500/10 backdrop-blur-sm px-4 py-3 text-sm text-danger-200 flex items-start justify-between gap-3"
    >
      <span class="min-w-0 leading-relaxed">{{ error }}</span>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-danger-500/50 bg-danger-500/10 px-3 py-1 text-xs font-semibold text-danger-100 hover:bg-danger-500/20 transition disabled:opacity-60"
        :disabled="busy"
        @click="load"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <div
      v-if="savedAt"
      class="rounded-xl border border-success-500/40 bg-success-500/10 px-4 py-3 text-sm text-success-200 flex items-center gap-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {{ $t('common.saved') }}
    </div>

    <SpinnerInline v-if="loading" tone="dark" />

    <template v-else-if="view && view.hasKey">
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="rounded-2xl bg-ink-card/60 ring-1 ring-line p-4 min-w-0 backdrop-blur-sm">
          <dt class="text-[10px] uppercase tracking-[0.18em] font-semibold text-mist mb-1.5">
            {{ $t('superadmin.openrouterKey.fieldHash') }}
          </dt>
          <dd class="text-pearl font-mono text-sm break-all">
            {{ view.hashPreview }}
          </dd>
        </div>
        <div class="rounded-2xl bg-ink-card/60 ring-1 ring-line p-4 min-w-0 backdrop-blur-sm">
          <dt class="text-[10px] uppercase tracking-[0.18em] font-semibold text-mist mb-1.5">
            {{ $t('superadmin.openrouterKey.fieldProvisionedAt') }}
          </dt>
          <dd class="text-pearl text-sm">
            {{ formattedProvisionedAt }}
          </dd>
        </div>
      </dl>

      <div class="rounded-2xl bg-ink-card/60 ring-1 ring-line p-5 backdrop-blur-sm">
        <div class="flex items-baseline justify-between gap-3 flex-wrap">
          <span class="text-[10px] uppercase tracking-[0.18em] font-semibold text-mist">
            {{ $t('superadmin.openrouterKey.fieldBudget') }}
          </span>
          <span v-if="view.budgetUsd !== null" class="inline-flex items-baseline gap-1 text-pearl">
            <span v-if="view.usageUsd !== null" class="font-mono font-semibold text-2xl text-pearl">
              ${{ view.usageUsd.toFixed(2) }}
            </span>
            <span v-else class="text-mist text-2xl">—</span>
            <span class="text-mist mx-1">/</span>
            <span class="font-mono text-sm text-mist">${{ view.budgetUsd.toFixed(2) }}</span>
          </span>
          <span v-else class="text-sm text-mist">
            {{ $t('superadmin.openrouterKey.budgetUncapped') }}
          </span>
        </div>
        <div
          v-if="view.budgetUsd !== null && view.usagePercent !== null"
          class="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink-surface ring-1 ring-line"
        >
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="budgetBarColor"
            :style="{ width: `${view.usagePercent}%` }"
          />
        </div>
        <p
          v-if="view.budgetUsd !== null && view.usageUsd === null"
          class="mt-2 text-xs text-amber-300"
        >
          {{ $t('superadmin.openrouterKey.usageUnavailable') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="rounded-xl bg-brand-gradient text-ink-tealDeep px-4 py-2 text-sm font-semibold hover:brightness-110 disabled:opacity-60 shadow-halo-glow transition"
          :disabled="busy"
          @click="editBudgetOpen = true"
        >
          {{ $t('superadmin.openrouterKey.actionUpdateBudget') }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-danger-500/40 bg-danger-500/10 px-4 py-2 text-sm font-semibold text-danger-200 hover:bg-danger-500/20 disabled:opacity-60 transition"
          :disabled="busy"
          @click="confirmingRevoke = true"
        >
          {{ $t('superadmin.openrouterKey.actionRevoke') }}
        </button>
        <div class="ml-auto flex items-center gap-3">
          <span v-if="lastRefreshRelative" class="text-xs text-mist">
            {{ $t('superadmin.openrouterKey.lastRefresh') }}: {{ lastRefreshRelative }}
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ink-card/60 px-3 py-1.5 text-sm font-semibold text-pearl hover:bg-ink-cardHi/60 disabled:opacity-60 transition"
            :disabled="busy || refreshing"
            @click="refresh"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-4"
              :class="refreshing ? 'animate-spin' : ''"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {{ $t('superadmin.openrouterKey.actionRefresh') }}
          </button>
        </div>
      </div>

      <div
        v-if="editBudgetOpen"
        class="rounded-2xl border border-line bg-ink-card/60 backdrop-blur-sm p-5"
      >
        <label class="block text-[10px] uppercase tracking-[0.18em] font-semibold text-mist mb-2">
          {{ $t('superadmin.openrouterKey.fieldNewBudget') }}
        </label>
        <div class="flex items-center gap-2">
          <span class="text-sm text-mist">$</span>
          <input
            v-model.number="budgetForm.limitUsd"
            type="number"
            min="0"
            step="0.01"
            class="w-40 rounded-xl border border-line bg-ink-surface/70 !text-pearl !caret-pearl placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-halo focus:border-halo transition"
            :placeholder="$t('superadmin.openrouterKey.placeholderUncapped')"
          >
        </div>
        <p class="mt-2 text-xs text-mist leading-relaxed">
          {{ $t('superadmin.openrouterKey.budgetHelp') }}
        </p>
        <div class="mt-4 flex items-center gap-2">
          <button
            type="button"
            class="rounded-xl bg-brand-gradient text-ink-tealDeep px-4 py-2 text-sm font-semibold hover:brightness-110 disabled:opacity-60 shadow-halo-glow transition"
            :disabled="busy"
            @click="onSaveBudget"
          >
            {{ $t('common.save') }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-line bg-ink-surface/40 px-4 py-2 text-sm font-semibold text-pearl hover:bg-ink-card/60 disabled:opacity-60 transition"
            :disabled="busy"
            @click="editBudgetOpen = false"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </div>

      <div
        v-if="confirmingRevoke"
        class="rounded-2xl border border-danger-500/40 bg-danger-500/10 backdrop-blur-sm p-5"
      >
        <p class="text-sm text-danger-200 leading-relaxed">
          {{ $t('superadmin.openrouterKey.confirmRevoke') }}
        </p>
        <div class="mt-4 flex items-center gap-2">
          <button
            type="button"
            class="rounded-xl bg-danger-500 text-white px-4 py-2 text-sm font-semibold hover:bg-danger-400 disabled:opacity-60 transition"
            :disabled="busy"
            @click="onRevoke"
          >
            {{ $t('superadmin.openrouterKey.confirmRevokeYes') }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-line bg-ink-surface/40 px-4 py-2 text-sm font-semibold text-pearl hover:bg-ink-card/60 disabled:opacity-60 transition"
            :disabled="busy"
            @click="confirmingRevoke = false"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="!provisionOpen" class="text-center py-8">
        <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-ink-card/60 ring-1 ring-line backdrop-blur-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-7 text-halo"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p class="mx-auto max-w-md text-sm text-mist leading-relaxed">
          {{ $t('superadmin.openrouterKey.notProvisioned') }}
        </p>
        <button
          type="button"
          class="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-gradient text-ink-tealDeep px-5 py-2.5 text-sm font-semibold shadow-halo-glow hover:brightness-110 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-halo transition"
          :disabled="busy"
          @click="provisionOpen = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {{ $t('superadmin.openrouterKey.actionProvision') }}
        </button>
      </div>

      <div
        v-else
        class="rounded-2xl border border-line bg-ink-card/60 backdrop-blur-sm p-5"
      >
        <label class="block text-[10px] uppercase tracking-[0.18em] font-semibold text-mist mb-2">
          {{ $t('superadmin.openrouterKey.fieldMonthlyBudget') }}
        </label>
        <div class="flex items-center gap-2">
          <span class="text-sm text-mist">$</span>
          <input
            v-model.number="provisionForm.limitUsd"
            type="number"
            min="0"
            step="0.01"
            class="w-40 rounded-xl border border-line bg-ink-surface/70 !text-pearl !caret-pearl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-halo focus:border-halo transition"
          >
        </div>
        <p class="mt-2 text-xs text-mist leading-relaxed">
          {{ $t('superadmin.openrouterKey.budgetHelp') }}
        </p>
        <div class="mt-4 flex items-center gap-2">
          <button
            type="button"
            class="rounded-xl bg-brand-gradient text-ink-tealDeep px-4 py-2 text-sm font-semibold hover:brightness-110 disabled:opacity-60 shadow-halo-glow transition"
            :disabled="busy"
            @click="onProvision"
          >
            {{ $t('superadmin.openrouterKey.actionProvisionConfirm') }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-line bg-ink-surface/40 px-4 py-2 text-sm font-semibold text-pearl hover:bg-ink-card/60 disabled:opacity-60 transition"
            :disabled="busy"
            @click="provisionOpen = false"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </div>
    </template>

    <p class="pt-4 border-t border-line text-xs text-mist leading-relaxed">
      {{ $t('superadmin.openrouterKey.footerNote') }}
      <a
        href="https://openrouter.ai/activity"
        target="_blank"
        rel="noopener noreferrer"
        class="font-medium text-halo underline underline-offset-2 hover:text-halo-dim transition"
      >openrouter.ai/activity</a>.
    </p>
  </section>
</template>
