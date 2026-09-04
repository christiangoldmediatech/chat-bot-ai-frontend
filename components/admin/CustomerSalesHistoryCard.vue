<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { CustomerSalesHistory, SaleStatus } from '~/types/sale'

/**
 * Card compacto para la ficha del cliente. Muestra:
 *   - Total gastado (currency dominante) + número de compras WON.
 *   - Últimas N compras con nombre, monto (snapshot) y fecha.
 *
 * Requiere `botId` + `customerId` — el mismo teléfono en dos bots del mismo
 * tenant son dos customers distintos; los ingresos por bot se mantienen
 * separados.
 */
const props = defineProps<{
  botId: string
  customerId: string
  maxRows?: number
}>()

const salesApi = useSales()
const data = ref<CustomerSalesHistory | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await salesApi.listForCustomer(props.botId, props.customerId)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

function statusPill(s: SaleStatus): string {
  return {
    PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
    WON: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    LOST: 'bg-slate-100 text-slate-500 ring-slate-200',
  }[s]
}

const visible = computed(() =>
  data.value ? data.value.sales.slice(0, props.maxRows ?? 5) : [],
)

await load()
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl p-5">
    <header class="flex items-start justify-between gap-2">
      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-700">
          {{ $t('admin.sales.customerHistory.title') }}
        </h3>
        <p class="text-xs text-slate-500 mt-0.5">
          {{ $t('admin.sales.customerHistory.subtitle') }}
        </p>
      </div>
      <NuxtLink
        :to="`/admin/bots/${botId}/sales?customerId=${customerId}`"
        class="text-xs font-medium text-primary-700 hover:text-primary-800"
      >
        {{ $t('admin.sales.customerHistory.viewAll') }}
      </NuxtLink>
    </header>

    <div v-if="loading" class="mt-4 text-slate-500 text-sm">{{ $t('common.loading') }}…</div>

    <p v-else-if="error" class="mt-4 rounded-xl border border-danger-200 bg-danger-50/70 p-2 text-xs text-danger-700">
      {{ error }}
    </p>

    <div v-else-if="data" class="mt-4 space-y-4">
      <div class="rounded-xl bg-slate-50 p-3">
        <div class="flex items-baseline justify-between gap-3">
          <span class="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
            {{ $t('admin.sales.customerHistory.totalSpent') }}
          </span>
          <span class="text-lg font-semibold text-slate-900">
            {{ money(data.totalSpentCents, data.currency) }}
          </span>
        </div>
        <p class="text-[11px] text-slate-500 mt-1">
          {{ $t('admin.sales.customerHistory.wonCount', { n: data.wonCount }) }}
        </p>
      </div>

      <ul class="divide-y divide-slate-100">
        <li v-if="visible.length === 0" class="py-4 text-center text-slate-400 text-sm">
          {{ $t('admin.sales.customerHistory.empty') }}
        </li>
        <li v-for="s in visible" :key="s.id" class="py-2 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm text-slate-900 truncate">{{ s.serviceNameSnapshot }}</p>
            <p class="text-[11px] text-slate-500">
              {{ s.soldAt ? new Date(s.soldAt).toISOString().slice(0, 10) : '—' }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm font-mono">{{ money(s.totalAmountCents, s.currencySnapshot) }}</p>
            <span class="text-[10px] font-semibold uppercase tracking-wider rounded-full px-1.5 py-0.5 ring-1" :class="statusPill(s.status)">
              {{ s.status }}
            </span>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
