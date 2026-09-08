<script setup lang="ts">
import type { Sale } from '~/types/sale'

/**
 * Confirmación para "Marcar como vendida" una Sale que ya existe en PENDING.
 * Repite el contexto (servicio, total, cliente, cita) para que la decisión
 * sea informada. Si la cita no está ATTENDED, exige un motivo antes de
 * continuar (no bloqueo — advertencia útil).
 */
const props = defineProps<{
  open: boolean
  sale: Sale | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { reason: string | undefined }]
  close: []
}>()

const { locale } = useI18n()
const reason = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) reason.value = ''
  },
)

const attendanceWarning = computed<boolean>(() => {
  if (!props.sale) return false
  return props.sale.attendanceSummary !== 'ATTENDED'
})

const canSubmit = computed<boolean>(() => {
  if (props.submitting) return false
  if (attendanceWarning.value && reason.value.trim().length === 0) return false
  return true
})

function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(locale.value === 'es' ? 'es-EC' : 'en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

function onSubmit(): void {
  emit('submit', { reason: reason.value.trim() || undefined })
}
</script>

<template>
  <Modal :open="open" :title="$t('admin.sales.markSoldTitle')" size="md" @close="emit('close')">
    <form v-if="sale" class="space-y-4" @submit.prevent="onSubmit">
      <div class="rounded-xl bg-slate-50 p-3 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-slate-500">{{ $t('admin.sales.confirm.service') }}</span>
          <span class="font-medium text-slate-900">{{ sale.serviceNameSnapshot }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">{{ $t('admin.sales.confirm.total') }}</span>
          <span class="font-mono">{{ money(sale.totalAmountCents, sale.currencySnapshot) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">{{ $t('admin.sales.confirm.customer') }}</span>
          <span v-if="sale.customer" class="font-medium text-slate-900">
            {{ sale.customer.name || $t('admin.sales.confirm.noName') }}
            <span class="text-slate-400 font-mono ml-1">{{ sale.customer.phone }}</span>
          </span>
          <span v-else class="text-amber-700">{{ $t('admin.sales.confirm.noCustomer') }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-500">{{ $t('admin.sales.confirm.appointment') }}</span>
          <AttendanceBadge :attendance="sale.attendanceSummary" :appointment="sale.appointment" compact />
        </div>
      </div>

      <div
        v-if="attendanceWarning"
        class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
      >
        {{ $t('admin.sales.confirm.attendanceWarning') }}
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ attendanceWarning
            ? $t('admin.sales.confirm.reasonRequired')
            : $t('admin.sales.confirm.reasonOptional') }}
        </label>
        <textarea
          v-model="reason"
          rows="3"
          maxlength="500"
          class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          :placeholder="$t('admin.sales.confirm.reasonPlaceholder')"
          :required="attendanceWarning"
        />
      </div>

      <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          class="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          @click="emit('close')"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          type="submit"
          class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          :disabled="!canSubmit"
        >
          {{ submitting ? $t('common.saving') : $t('admin.sales.markSoldConfirmSubmit') }}
        </button>
      </div>
    </form>
  </Modal>
</template>
