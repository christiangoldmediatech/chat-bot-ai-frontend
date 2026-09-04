<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  ListSalesQuery,
  Sale,
  SaleDateBasis,
  SaleStatus,
} from '~/types/sale'
import type { Service } from '~/types/service'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const route = useRoute()
const botId = String(route.params.id)
const salesApi = useSales()
const servicesApi = useServices()

const rows = ref<Sale[]>([])
const services = ref<Service[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const total = ref(0)
const page = ref(1)
const pageSize = ref(50)

const filters = reactive<{
  status: SaleStatus | ''
  serviceId: string
  from: string
  to: string
  dateBasis: SaleDateBasis
}>({
  status: '',
  serviceId: '',
  from: '',
  to: '',
  dateBasis: 'soldAt',
})

const workingSale = ref<Sale | null>(null)
const showMarkLost = ref(false)
const submitting = ref(false)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const query: ListSalesQuery = {
      status: filters.status || undefined,
      serviceId: filters.serviceId || undefined,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to + 'T23:59:59').toISOString() : undefined,
      dateBasis: filters.dateBasis,
      page: page.value,
      pageSize: pageSize.value,
    }
    const [paged, catalog] = await Promise.all([
      salesApi.list(botId, query),
      services.value.length ? Promise.resolve(services.value) : servicesApi.list(botId),
    ])
    rows.value = paged.items
    total.value = paged.total
    services.value = catalog
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onMarkWonQuick(sale: Sale): Promise<void> {
  submitting.value = true
  try {
    await salesApi.markWon(botId, sale.id, {})
    await load()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    submitting.value = false
  }
}

async function onSubmitMarkLost(payload: { lostReason: string | undefined }): Promise<void> {
  if (!workingSale.value) return
  submitting.value = true
  try {
    await salesApi.markLost(botId, workingSale.value.id, payload)
    showMarkLost.value = false
    workingSale.value = null
    await load()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    submitting.value = false
  }
}

function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toISOString().slice(0, 10)
}

function statusPill(s: SaleStatus): string {
  return {
    PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
    WON: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    LOST: 'bg-slate-100 text-slate-500 ring-slate-200',
  }[s]
}

await load()

watch(
  [
    () => filters.status,
    () => filters.serviceId,
    () => filters.from,
    () => filters.to,
    () => filters.dateBasis,
    page,
  ],
  () => load(),
)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('admin.sales.title') }}</h1>
        <p class="text-slate-500 text-sm mt-1 max-w-2xl">{{ $t('admin.sales.subtitle') }}</p>
      </div>
      <NuxtLink
        :to="`/admin/bots/${botId}/reports/revenue`"
        class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 shadow-glass transition"
      >
        {{ $t('admin.sales.goToRevenue') }}
      </NuxtLink>
    </div>

    <p v-if="error" class="mt-4 rounded-2xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <div class="mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl p-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
      <div>
        <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.sales.filter.status') }}
        </label>
        <select
          v-model="filters.status"
          class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{{ $t('admin.sales.filter.allStatuses') }}</option>
          <option value="PENDING">PENDING</option>
          <option value="WON">WON</option>
          <option value="LOST">LOST</option>
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.sales.filter.service') }}
        </label>
        <select
          v-model="filters.serviceId"
          class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{{ $t('admin.sales.filter.allServices') }}</option>
          <option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.sales.filter.dateBasis') }}
        </label>
        <select
          v-model="filters.dateBasis"
          class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="soldAt">{{ $t('admin.sales.filter.soldAt') }}</option>
          <option value="serviceDate">{{ $t('admin.sales.filter.serviceDate') }}</option>
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.sales.filter.from') }}
        </label>
        <input
          v-model="filters.from"
          type="date"
          class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
      </div>
      <div>
        <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.sales.filter.to') }}
        </label>
        <input
          v-model="filters.to"
          type="date"
          class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
      </div>
    </div>

    <div v-if="loading" class="mt-6 text-slate-500 text-sm">{{ $t('common.loading') }}…</div>

    <EmptyState
      v-else-if="rows.length === 0"
      :title="$t('admin.sales.emptyTitle')"
      :description="$t('admin.sales.emptyDescription')"
      class="mt-6"
    />

    <div v-else class="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th class="px-3 py-2 text-left">{{ $t('admin.sales.col.service') }}</th>
            <th class="px-3 py-2 text-left">{{ $t('admin.sales.col.status') }}</th>
            <th class="px-3 py-2 text-right">{{ $t('admin.sales.col.total') }}</th>
            <th class="px-3 py-2 text-left">{{ $t('admin.sales.col.soldAt') }}</th>
            <th class="px-3 py-2 text-left">{{ $t('admin.sales.col.serviceDate') }}</th>
            <th class="px-3 py-2 text-right"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="row in rows" :key="row.id">
            <td class="px-3 py-2">
              <div class="font-medium text-slate-900">{{ row.serviceNameSnapshot }}</div>
              <div class="text-[10px] text-slate-400 font-mono">{{ row.id.slice(0, 8) }}</div>
            </td>
            <td class="px-3 py-2">
              <span class="text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ring-1" :class="statusPill(row.status)">
                {{ row.status }}
              </span>
            </td>
            <td class="px-3 py-2 text-right font-mono">{{ money(row.totalAmountCents, row.currencySnapshot) }}</td>
            <td class="px-3 py-2 text-slate-600">{{ fmtDate(row.soldAt) }}</td>
            <td class="px-3 py-2 text-slate-600">{{ fmtDate(row.serviceDate) }}</td>
            <td class="px-3 py-2 text-right">
              <div class="flex justify-end gap-2">
                <button
                  v-if="row.status === 'PENDING'"
                  type="button"
                  class="text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-40"
                  :disabled="submitting"
                  @click="onMarkWonQuick(row)"
                >
                  {{ $t('admin.sales.markSold') }}
                </button>
                <button
                  v-if="row.status !== 'LOST'"
                  type="button"
                  class="text-xs font-medium text-slate-500 hover:text-slate-800"
                  @click="workingSale = row; showMarkLost = true"
                >
                  {{ $t('admin.sales.markLost') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && total > pageSize" class="mt-4 flex items-center justify-between">
      <p class="text-xs text-slate-500">
        {{ $t('admin.sales.paginationCount', { total }) }}
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          :disabled="page <= 1"
          @click="page--"
        >
          ←
        </button>
        <span class="text-xs text-slate-500 self-center">{{ page }}</span>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          :disabled="page * pageSize >= total"
          @click="page++"
        >
          →
        </button>
      </div>
    </div>

    <MarkAsLostDialog
      :open="showMarkLost"
      :submitting="submitting"
      @close="showMarkLost = false; workingSale = null"
      @submit="onSubmitMarkLost"
    />
  </div>
</template>
