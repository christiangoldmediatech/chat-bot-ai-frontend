<script setup lang="ts">
import type {
  CreateServiceInput,
  Service,
  ServicePriceType,
} from '~/types/service'

/**
 * Formulario reutilizable de servicio (create + edit).
 *
 * Precio: el input captura unidades normales ("150.50"). El componente
 * convierte a centavos enteros antes de emitir — el backend siempre trabaja
 * en centavos. Al pintar (modo edit), convierte de centavos a unidades.
 */
const props = defineProps<{
  initial?: Service
  saving?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateServiceInput]
}>()

const name = ref(props.initial?.name ?? '')
const slug = ref(props.initial?.slug ?? '')
const description = ref(props.initial?.description ?? '')
const shortDescription = ref(props.initial?.shortDescription ?? '')
const priceUnits = ref(
  props.initial ? (props.initial.priceCents / 100).toFixed(2) : '0.00',
)
const currency = ref(props.initial?.currency ?? 'USD')
const priceType = ref<ServicePriceType>(props.initial?.priceType ?? 'FIXED')
const showPrice = ref(props.initial?.showPrice ?? true)
const isActive = ref(props.initial?.isActive ?? true)
const sortOrder = ref(props.initial?.sortOrder ?? 0)

/**
 * Convierte "150.50" o "150,50" a 15050 (centavos). Devuelve null si el
 * input no es un número válido — la validación de UI marca el error abajo.
 */
function unitsToCents(v: string): number | null {
  const normalized = v.replace(/\s+/g, '').replace(',', '.')
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(parseFloat(normalized) * 100)
}

const priceError = computed<string | null>(() => {
  if (priceType.value === 'QUOTE') return null
  const cents = unitsToCents(priceUnits.value)
  if (cents === null) return 'invalid'
  if (cents < 0) return 'negative'
  return null
})

const canSubmit = computed(() => {
  if (props.saving) return false
  if (name.value.trim().length === 0) return false
  if (!/^[a-z0-9-]+$/.test(slug.value)) return false
  if (description.value.trim().length === 0) return false
  if (priceError.value) return false
  return true
})

function onSubmit(): void {
  const cents = priceType.value === 'QUOTE' ? 0 : unitsToCents(priceUnits.value) ?? 0
  emit('submit', {
    name: name.value.trim(),
    slug: slug.value.trim(),
    description: description.value.trim(),
    shortDescription: shortDescription.value.trim() || undefined,
    priceCents: cents,
    currency: currency.value.toUpperCase(),
    priceType: priceType.value,
    showPrice: showPrice.value,
    isActive: isActive.value,
    sortOrder: sortOrder.value,
  })
}

// Slug auto-suggerido a partir del nombre solo mientras el usuario no lo
// haya tocado a mano (evita sobrescribir su edición).
const slugTouched = ref(false)
watch(name, (n) => {
  if (slugTouched.value || props.initial) return
  slug.value = n
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
})
</script>

<template>
  <form class="space-y-5" @submit.prevent="onSubmit">
    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {{ $t('admin.services.field.name') }}
      </label>
      <input
        v-model="name"
        type="text"
        maxlength="120"
        class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        required
      >
    </div>

    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {{ $t('admin.services.field.slug') }}
      </label>
      <input
        v-model="slug"
        type="text"
        maxlength="80"
        pattern="^[a-z0-9-]+$"
        class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="slugTouched = true"
      >
      <p class="text-[11px] text-slate-500 mt-1">{{ $t('admin.services.field.slugHint') }}</p>
    </div>

    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {{ $t('admin.services.field.shortDescription') }}
      </label>
      <input
        v-model="shortDescription"
        type="text"
        maxlength="240"
        class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
    </div>

    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {{ $t('admin.services.field.description') }}
      </label>
      <textarea
        v-model="description"
        rows="4"
        maxlength="2000"
        class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        required
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.services.field.priceType') }}
        </label>
        <select
          v-model="priceType"
          class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="FIXED">{{ $t('admin.services.priceType.fixed') }}</option>
          <option value="FROM">{{ $t('admin.services.priceType.from') }}</option>
          <option value="QUOTE">{{ $t('admin.services.priceType.quote') }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.services.field.currency') }}
        </label>
        <input
          v-model="currency"
          type="text"
          maxlength="3"
          class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
      </div>
    </div>

    <div v-if="priceType !== 'QUOTE'">
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {{ $t('admin.services.field.price') }}
      </label>
      <input
        v-model="priceUnits"
        type="text"
        inputmode="decimal"
        class="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2"
        :class="priceError
          ? 'border-danger-300 focus:ring-danger-500'
          : 'border-slate-200 focus:ring-primary-500'"
      >
      <p class="text-[11px] mt-1" :class="priceError ? 'text-danger-600' : 'text-slate-500'">
        {{ priceError ? $t('admin.services.field.priceError') : $t('admin.services.field.priceHint') }}
      </p>
    </div>

    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input v-model="showPrice" type="checkbox" class="rounded border-slate-300">
        {{ $t('admin.services.field.showPrice') }}
      </label>
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input v-model="isActive" type="checkbox" class="rounded border-slate-300">
        {{ $t('common.active') }}
      </label>
    </div>

    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {{ $t('admin.services.field.sortOrder') }}
      </label>
      <input
        v-model.number="sortOrder"
        type="number"
        min="0"
        class="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
    </div>

    <div class="flex justify-end">
      <button
        type="submit"
        class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-glass transition"
        :disabled="!canSubmit"
      >
        {{ $t('common.save') }}
      </button>
    </div>
  </form>
</template>
