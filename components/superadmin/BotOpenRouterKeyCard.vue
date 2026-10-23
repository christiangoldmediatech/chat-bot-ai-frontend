<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { OpenRouterKeyResponse } from '~/types/openrouter-key'

const props = defineProps<{
  tenantId: string
  botId: string
}>()

const service = useOpenRouterKey(props.tenantId, props.botId)

const view = ref<OpenRouterKeyResponse | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref<string | null>(null)

const provisionOpen = ref(false)
const editBudgetOpen = ref(false)
const confirmingRevoke = ref(false)
const savedAt = ref<number | null>(null)

const provisionForm = reactive({ limitUsd: 10 })
const budgetForm = reactive({ limitUsd: null as number | null })

const budgetBarColor = computed(() => {
  const pct = view.value?.usagePercent
  if (pct === null || pct === undefined) return 'bg-slate-300'
  if (pct >= 90) return 'bg-danger-500'
  if (pct >= 70) return 'bg-amber-500'
  return 'bg-emerald-500'
})

const formattedProvisionedAt = computed(() => {
  if (!view.value?.provisionedAt) return null
  return new Date(view.value.provisionedAt).toLocaleString()
})

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    view.value = await service.get()
    budgetForm.limitUsd = view.value.budgetUsd
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
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

onMounted(load)
</script>

<template>
  <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-6">
    <!-- Error banner with retry -->
    <div
      v-if="error"
      class="mb-4 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 flex items-start justify-between gap-3"
    >
      <span class="min-w-0 leading-relaxed">{{ error }}</span>
      <button
        type="button"
        class="shrink-0 rounded-md border border-danger-300 bg-white px-3 py-1 text-xs font-semibold text-danger-700 hover:bg-danger-100"
        :disabled="busy"
        @click="load"
      >
        {{ $t('common.retry') }}
      </button>
    </div>

    <div
      v-if="savedAt"
      class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
    >
      {{ $t('common.saved') }}
    </div>

    <SpinnerInline v-if="loading" />

    <!-- Provisioned state -->
    <template v-else-if="view && view.hasKey">
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <div class="min-w-0">
          <dt class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {{ $t('superadmin.openrouterKey.fieldHash') }}
          </dt>
          <dd class="mt-1 text-slate-900 font-mono text-sm truncate">
            {{ view.hashPreview }}
          </dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {{ $t('superadmin.openrouterKey.fieldProvisionedAt') }}
          </dt>
          <dd class="mt-1 text-slate-900 text-sm">
            {{ formattedProvisionedAt }}
          </dd>
        </div>
      </dl>

      <div class="mt-6">
        <div class="flex items-baseline justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {{ $t('superadmin.openrouterKey.fieldBudget') }}
          </span>
          <span v-if="view.budgetUsd !== null" class="text-sm text-slate-800">
            <span v-if="view.usageUsd !== null" class="font-mono font-semibold">
              ${{ view.usageUsd.toFixed(2) }}
            </span>
            <span v-else class="text-slate-400">—</span>
            <span class="text-slate-400"> / </span>
            <span class="font-mono">${{ view.budgetUsd.toFixed(2) }}</span>
          </span>
          <span v-else class="text-sm text-slate-500">
            {{ $t('superadmin.openrouterKey.budgetUncapped') }}
          </span>
        </div>
        <div
          v-if="view.budgetUsd !== null && view.usagePercent !== null"
          class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            class="h-full transition-all"
            :class="budgetBarColor"
            :style="{ width: `${view.usagePercent}%` }"
          />
        </div>
        <p
          v-if="view.budgetUsd !== null && view.usageUsd === null"
          class="mt-2 text-xs text-amber-700"
        >
          {{ $t('superadmin.openrouterKey.usageUnavailable') }}
        </p>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          :disabled="busy"
          @click="editBudgetOpen = true"
        >
          {{ $t('superadmin.openrouterKey.actionUpdateBudget') }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-danger-200 bg-white px-4 py-2 text-sm font-semibold text-danger-700 hover:bg-danger-50 disabled:opacity-60"
          :disabled="busy"
          @click="confirmingRevoke = true"
        >
          {{ $t('superadmin.openrouterKey.actionRevoke') }}
        </button>
        <button
          type="button"
          class="ml-auto text-xs text-slate-500 hover:text-slate-700"
          :disabled="busy"
          @click="load"
        >
          {{ $t('common.reload') }}
        </button>
      </div>

      <!-- Edit budget inline form -->
      <div
        v-if="editBudgetOpen"
        class="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          {{ $t('superadmin.openrouterKey.fieldNewBudget') }}
        </label>
        <div class="mt-2 flex items-center gap-2">
          <span class="text-sm text-slate-500">$</span>
          <input
            v-model.number="budgetForm.limitUsd"
            type="number"
            min="0"
            step="0.01"
            class="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
            :placeholder="$t('superadmin.openrouterKey.placeholderUncapped')"
          >
        </div>
        <p class="mt-2 text-xs text-slate-600">
          {{ $t('superadmin.openrouterKey.budgetHelp') }}
        </p>
        <div class="mt-4 flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            :disabled="busy"
            @click="onSaveBudget"
          >
            {{ $t('common.save') }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            :disabled="busy"
            @click="editBudgetOpen = false"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </div>

      <!-- Revoke confirmation -->
      <div
        v-if="confirmingRevoke"
        class="mt-5 rounded-lg border border-danger-200 bg-danger-50 p-4"
      >
        <p class="text-sm text-danger-700 leading-relaxed">
          {{ $t('superadmin.openrouterKey.confirmRevoke') }}
        </p>
        <div class="mt-4 flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg bg-danger-600 px-4 py-2 text-sm font-semibold text-white hover:bg-danger-700 disabled:opacity-60"
            :disabled="busy"
            @click="onRevoke"
          >
            {{ $t('superadmin.openrouterKey.confirmRevokeYes') }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            :disabled="busy"
            @click="confirmingRevoke = false"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </div>
    </template>

    <!-- Not provisioned (also fallback when GET failed) -->
    <template v-else>
      <div v-if="!provisionOpen" class="text-center py-6">
        <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-7 text-slate-500"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p class="mx-auto max-w-md text-sm text-slate-600 leading-relaxed">
          {{ $t('superadmin.openrouterKey.notProvisioned') }}
        </p>
        <button
          type="button"
          class="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          :disabled="busy"
          @click="provisionOpen = true"
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
        class="rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          {{ $t('superadmin.openrouterKey.fieldMonthlyBudget') }}
        </label>
        <div class="mt-2 flex items-center gap-2">
          <span class="text-sm text-slate-500">$</span>
          <input
            v-model.number="provisionForm.limitUsd"
            type="number"
            min="0"
            step="0.01"
            class="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
        </div>
        <p class="mt-2 text-xs text-slate-600">
          {{ $t('superadmin.openrouterKey.budgetHelp') }}
        </p>
        <div class="mt-4 flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            :disabled="busy"
            @click="onProvision"
          >
            {{ $t('superadmin.openrouterKey.actionProvisionConfirm') }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            :disabled="busy"
            @click="provisionOpen = false"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </div>
    </template>

    <p class="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
      {{ $t('superadmin.openrouterKey.footerNote') }}
      <a
        href="https://openrouter.ai/activity"
        target="_blank"
        rel="noopener noreferrer"
        class="font-medium text-indigo-600 underline hover:text-indigo-700"
        >openrouter.ai/activity</a
      >.
    </p>
  </section>
</template>
