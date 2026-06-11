<script setup lang="ts">
import type { ApiError } from '~/types/api'

/**
 * Multipart payment registration dialog. The superadmin picks the months
 * covered (1–12), uploads the deposit image, optionally adds a paid-at
 * date and a free-text note, and submits. The amount is computed on the
 * server from `plan.monthlyPrice * monthsCovered` — the form does NOT
 * accept it.
 *
 * Emits `confirm` with the form payload (the parent owns the API call so
 * it can refresh its own state on success). Emits `cancel` for both the
 * close button and Esc / overlay click.
 */

const props = defineProps<{
  open: boolean
  tenantName: string
  // Hint for the modal subtitle — e.g. "BASIC · USD 99.99/mo".
  planSummary?: string
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  cancel: []
  confirm: [payload: { monthsCovered: number; file: File; paidAt?: string; note?: string }]
}>()

const { t } = useI18n()

const monthsCovered = ref(1)
const file = ref<File | null>(null)
const paidAt = ref('')
const note = ref('')
const localError = ref<string | null>(null)

const monthOptions = computed(() =>
  Array.from({ length: 12 }, (_, i) => i + 1),
)

const canSubmit = computed(() =>
  !props.loading && Boolean(file.value) && monthsCovered.value >= 1 && monthsCovered.value <= 12,
)

watch(
  () => props.open,
  (open) => {
    if (open) {
      // Reset everything on re-open so the previous payment's data isn't
      // accidentally re-submitted.
      monthsCovered.value = 1
      file.value = null
      paidAt.value = ''
      note.value = ''
      localError.value = null
    }
  },
)

function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const selected = target.files?.[0] ?? null
  file.value = selected
  localError.value = null
}

function onSubmit(): void {
  if (!canSubmit.value || !file.value) return
  emit('confirm', {
    monthsCovered: monthsCovered.value,
    file: file.value,
    paidAt: paidAt.value ? new Date(paidAt.value).toISOString() : undefined,
    note: note.value ? note.value.trim() : undefined,
  })
}

function onCancel(): void {
  if (props.loading) return
  emit('cancel')
}

const surfacedError = computed<string | null>(() => {
  if (localError.value) return localError.value
  if (props.error) {
    const e = props.error as unknown
    return typeof e === 'string' ? e : (e as ApiError)?.message ?? null
  }
  return null
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        @click.self="onCancel"
        @keydown.esc="onCancel"
      >
        <div class="w-full max-w-lg rounded-2xl bg-slate-900 ring-1 ring-slate-700 shadow-2xl">
          <header class="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-slate-100">
                {{ $t('superadmin.billing.dialogTitle', { name: tenantName }) }}
              </h2>
              <p v-if="planSummary" class="mt-1 text-xs text-slate-500 truncate">
                {{ planSummary }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              :aria-label="$t('common.close')"
              :disabled="loading"
              @click="onCancel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <form class="space-y-4 px-5 py-4" @submit.prevent="onSubmit">
            <p v-if="surfacedError" class="rounded-xl border border-rose-700/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
              {{ surfacedError }}
            </p>

            <!-- Months covered -->
            <div>
              <label for="monthsCovered" class="block text-xs font-medium uppercase tracking-wider text-slate-400">
                {{ $t('superadmin.billing.fieldMonths') }}
              </label>
              <select
                id="monthsCovered"
                v-model.number="monthsCovered"
                class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                :disabled="loading"
              >
                <option v-for="m in monthOptions" :key="m" :value="m">
                  {{ m === 1 ? $t('superadmin.billing.monthOne') : $t('superadmin.billing.monthMany', { count: m }) }}
                </option>
              </select>
              <p class="mt-1 text-[11px] text-slate-500">
                {{ $t('superadmin.billing.fieldMonthsHint') }}
              </p>
            </div>

            <!-- Deposit image upload -->
            <div>
              <label for="depositFile" class="block text-xs font-medium uppercase tracking-wider text-slate-400">
                {{ $t('superadmin.billing.fieldFile') }}
              </label>
              <input
                id="depositFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-200 hover:file:bg-slate-700 transition"
                :disabled="loading"
                @change="onFileChange"
              >
              <p class="mt-1 text-[11px] text-slate-500">
                {{ $t('superadmin.billing.fieldFileHint') }}
              </p>
            </div>

            <!-- Paid at (optional) -->
            <div>
              <label for="paidAt" class="block text-xs font-medium uppercase tracking-wider text-slate-400">
                {{ $t('superadmin.billing.fieldPaidAt') }}
              </label>
              <input
                id="paidAt"
                v-model="paidAt"
                type="date"
                class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                :disabled="loading"
              >
              <p class="mt-1 text-[11px] text-slate-500">
                {{ $t('superadmin.billing.fieldPaidAtHint') }}
              </p>
            </div>

            <!-- Note (optional) -->
            <div>
              <label for="note" class="block text-xs font-medium uppercase tracking-wider text-slate-400">
                {{ $t('superadmin.billing.fieldNote') }}
              </label>
              <textarea
                id="note"
                v-model="note"
                rows="2"
                maxlength="500"
                class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                :placeholder="$t('superadmin.billing.fieldNotePlaceholder')"
                :disabled="loading"
              />
            </div>

            <footer class="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                class="rounded-xl border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition"
                :disabled="loading"
                @click="onCancel"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                class="rounded-xl bg-white px-4 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
                :disabled="!canSubmit"
              >
                {{ loading ? $t('superadmin.billing.submitting') : $t('superadmin.billing.submit') }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
