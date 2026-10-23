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
  <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-slate-900">
          {{ $t('superadmin.openrouterKey.cardTitle') }}
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          {{ $t('superadmin.openrouterKey.cardDescription') }}
        </p>
      </div>
      <button
        v-if="!loading"
        type="button"
        class="shrink-0 text-xs text-slate-500 hover:text-slate-700"
        :disabled="busy"
        @click="load"
      >
        {{ $t('common.reload') }}
      </button>
    </div>

    <p
      v-if="error"
      class="mt-3 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700"
    >
      {{ error }}
    </p>

    <p
      v-if="savedAt"
      class="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
    >
      {{ $t('common.saved') }}
    </p>

    <SpinnerInline v-if="loading" class="mt-3" />

    <template v-else-if="view && view.hasKey">
      <!-- Provisioned state -->
      <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div class="min-w-0">
          <dt class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {{ $t('superadmin.openrouterKey.fieldHash') }}
          </dt>
          <dd class="mt-0.5 text-slate-900 font-mono text-xs truncate">
            {{ view.hashPreview }}
          </dd>
        </div>
        <div class="min-w-0">
          <dt class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {{ $t('superadmin.openrouterKey.fieldProvisionedAt') }}
          </dt>
          <dd class="mt-0.5 text-slate-900 text-xs">
            {{ formattedProvisionedAt }}
          </dd>
        </div>
      </dl>

      <div class="mt-4">
        <div class="flex items-baseline justify-between text-xs">
          <span class="font-semibold uppercase tracking-wider text-slate-500">
            {{ $t('superadmin.openrouterKey.fieldBudget') }}
          </span>
          <span v-if="view.budgetUsd !== null" class="text-slate-700">
            <span v-if="view.usageUsd !== null" class="font-mono"
              >${{ view.usageUsd.toFixed(2) }}</span
            >
            <span v-else class="text-slate-400">—</span>
            <span class="text-slate-400"> / </span>
            <span class="font-mono">${{ view.budgetUsd.toFixed(2) }}</span>
          </span>
          <span v-else class="text-slate-500">
            {{ $t('superadmin.openrouterKey.budgetUncapped') }}
          </span>
        </div>
        <div
          v-if="view.budgetUsd !== null && view.usagePercent !== null"
          class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            class="h-full transition-all"
            :class="budgetBarColor"
            :style="{ width: `${view.usagePercent}%` }"
          />
        </div>
        <p
          v-if="view.budgetUsd !== null && view.usageUsd === null"
          class="mt-2 text-[11px] text-amber-700"
        >
          {{ $t('superadmin.openrouterKey.usageUnavailable') }}
        </p>
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          :disabled="busy"
          @click="editBudgetOpen = true"
        >
          {{ $t('superadmin.openrouterKey.actionUpdateBudget') }}
        </button>
        <button
          type="button"
          class="rounded-md border border-danger-200 bg-white px-3 py-1.5 text-xs font-medium text-danger-700 hover:bg-danger-50 disabled:opacity-60"
          :disabled="busy"
          @click="confirmingRevoke = true"
        >
          {{ $t('superadmin.openrouterKey.actionRevoke') }}
        </button>
      </div>

      <!-- Edit budget inline form -->
      <div
        v-if="editBudgetOpen"
        class="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3"
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
            class="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
            :placeholder="$t('superadmin.openrouterKey.placeholderUncapped')"
          >
        </div>
        <p class="mt-1 text-[11px] text-slate-500">
          {{ $t('superadmin.openrouterKey.budgetHelp') }}
        </p>
        <div class="mt-3 flex items-center gap-2">
          <button
            type="button"
            class="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            :disabled="busy"
            @click="onSaveBudget"
          >
            {{ $t('common.save') }}
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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
        class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3"
      >
        <p class="text-xs text-danger-700">
          {{ $t('superadmin.openrouterKey.confirmRevoke') }}
        </p>
        <div class="mt-3 flex items-center gap-2">
          <button
            type="button"
            class="rounded-md bg-danger-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-700 disabled:opacity-60"
            :disabled="busy"
            @click="onRevoke"
          >
            {{ $t('superadmin.openrouterKey.confirmRevokeYes') }}
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            :disabled="busy"
            @click="confirmingRevoke = false"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </div>
    </template>

    <template v-else-if="view && !view.hasKey">
      <!-- Not provisioned state -->
      <p class="mt-4 text-sm text-slate-600">
        {{ $t('superadmin.openrouterKey.notProvisioned') }}
      </p>

      <button
        v-if="!provisionOpen"
        type="button"
        class="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        :disabled="busy"
        @click="provisionOpen = true"
      >
        {{ $t('superadmin.openrouterKey.actionProvision') }}
      </button>

      <div
        v-else
        class="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3"
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
            class="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
        </div>
        <p class="mt-1 text-[11px] text-slate-500">
          {{ $t('superadmin.openrouterKey.budgetHelp') }}
        </p>
        <div class="mt-3 flex items-center gap-2">
          <button
            type="button"
            class="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            :disabled="busy"
            @click="onProvision"
          >
            {{ $t('superadmin.openrouterKey.actionProvisionConfirm') }}
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            :disabled="busy"
            @click="provisionOpen = false"
          >
            {{ $t('common.cancel') }}
          </button>
        </div>
      </div>
    </template>

    <p class="mt-4 text-[11px] text-slate-400">
      {{ $t('superadmin.openrouterKey.footerNote') }}
      <a
        href="https://openrouter.ai/activity"
        target="_blank"
        rel="noopener noreferrer"
        class="underline hover:text-slate-600"
        >openrouter.ai/activity</a
      >.
    </p>
  </section>
</template>
