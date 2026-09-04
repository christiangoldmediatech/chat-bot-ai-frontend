<script setup lang="ts">
import type { Service } from '~/types/service'

/**
 * Modal reutilizable: "Marcar como vendido" desde detalle de conversación,
 * lead o cita. Precarga soldAt = hoy. serviceDate opcional, editable. El
 * caller decide el flujo real (shortcut endpoint o crear+won a mano).
 */
const props = defineProps<{
  open: boolean
  services: Service[]
  submitting?: boolean
  /** Cuando este dialog se usa desde una cita ya agendada, pre-fijamos serviceDate al startTime. */
  defaultServiceDate?: string
}>()

const emit = defineEmits<{
  submit: [payload: {
    serviceId: string
    soldAt: string
    serviceDate: string | undefined
    quantity: number
    discountCents: number
    notes: string | undefined
  }]
  close: []
}>()

const serviceId = ref('')
const soldAt = ref(new Date().toISOString().slice(0, 10))
const serviceDate = ref(props.defaultServiceDate ?? '')
const quantity = ref(1)
const discountUnits = ref('0.00')
const notes = ref('')

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  serviceId.value = props.services[0]?.id ?? ''
  soldAt.value = new Date().toISOString().slice(0, 10)
  serviceDate.value = props.defaultServiceDate ?? ''
  quantity.value = 1
  discountUnits.value = '0.00'
  notes.value = ''
})

function unitsToCents(v: string): number {
  const n = v.replace(/\s+/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(n)) return 0
  return Math.round(parseFloat(n) * 100)
}

const canSubmit = computed(
  () => !props.submitting && serviceId.value.length > 0 && quantity.value >= 1,
)

function onSubmit(): void {
  emit('submit', {
    serviceId: serviceId.value,
    soldAt: new Date(soldAt.value).toISOString(),
    serviceDate: serviceDate.value
      ? new Date(serviceDate.value).toISOString()
      : undefined,
    quantity: quantity.value,
    discountCents: unitsToCents(discountUnits.value),
    notes: notes.value.trim() || undefined,
  })
}
</script>

<template>
  <Modal :open="open" :title="$t('admin.sales.markSoldTitle')" size="md" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.sales.field.service') }}
        </label>
        <select
          v-model="serviceId"
          class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        >
          <option value="" disabled>{{ $t('admin.sales.field.servicePlaceholder') }}</option>
          <option v-for="s in services" :key="s.id" :value="s.id">
            {{ s.name }} — {{ s.priceFormatted }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {{ $t('admin.sales.field.soldAt') }}
          </label>
          <input
            v-model="soldAt"
            type="date"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
          <p class="text-[10px] text-slate-500 mt-1">{{ $t('admin.sales.field.soldAtHint') }}</p>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {{ $t('admin.sales.field.serviceDate') }}
          </label>
          <input
            v-model="serviceDate"
            type="date"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
          <p class="text-[10px] text-slate-500 mt-1">{{ $t('admin.sales.field.serviceDateHint') }}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {{ $t('admin.sales.field.quantity') }}
          </label>
          <input
            v-model.number="quantity"
            type="number"
            min="1"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {{ $t('admin.sales.field.discount') }}
          </label>
          <input
            v-model="discountUnits"
            type="text"
            inputmode="decimal"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.sales.field.notes') }}
        </label>
        <textarea
          v-model="notes"
          rows="2"
          maxlength="2000"
          class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          :disabled="!canSubmit"
        >
          {{ submitting ? $t('common.saving') : $t('admin.sales.markSoldSubmit') }}
        </button>
      </div>
    </form>
  </Modal>
</template>
