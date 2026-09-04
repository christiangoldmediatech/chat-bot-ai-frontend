<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  RevenueDateBasis,
  RevenueGroupBy,
  RevenueReport,
  RevenueTotalByCurrency,
} from '~/types/report'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const route = useRoute()
const botId = String(route.params.id)
const reports = useReports()

const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

const filters = reactive<{
  from: string
  to: string
  dateBasis: RevenueDateBasis
  groupBy: RevenueGroupBy
}>({
  from: firstOfMonth.toISOString().slice(0, 10),
  to: today.toISOString().slice(0, 10),
  dateBasis: 'soldAt',
  groupBy: 'service',
})

const report = ref<RevenueReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const downloading = ref(false)

function buildQuery() {
  return {
    from: new Date(filters.from + 'T00:00:00').toISOString(),
    to: new Date(filters.to + 'T23:59:59').toISOString(),
    dateBasis: filters.dateBasis,
    groupBy: filters.groupBy,
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    report.value = await reports.revenue(botId, buildQuery())
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onDownloadCsv(): Promise<void> {
  downloading.value = true
  error.value = null
  try {
    const blob = await reports.downloadRevenueCsv(botId, buildQuery())
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue-${filters.from}-to-${filters.to}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    downloading.value = false
  }
}

function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

/**
 * Suma total del "revenue" — devolvemos una fila por currency para dejar
 * clara la separación en la UI. Nunca sumamos monedas distintas.
 */
const totalsSection = (totals: RevenueTotalByCurrency[]): RevenueTotalByCurrency[] => totals

await load()

watch(
  [() => filters.from, () => filters.to, () => filters.dateBasis, () => filters.groupBy],
  () => load(),
)
</script>

<template>
  <div>
    <NuxtLink :to="`/admin/bots/${botId}`" class="inline-flex items-center gap-1 text-sm text-white/80 hover:text-pearl drop-shadow-sm transition">{{ $t('admin.reports.back') }}</NuxtLink>
    <div class="mt-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('admin.reports.revenueTitle') }}</h1>
        <p class="text-slate-500 text-sm mt-1 max-w-2xl">{{ $t('admin.reports.revenueSubtitle') }}</p>
      </div>
      <button
        type="button"
        class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 shadow-glass transition"
        :disabled="downloading || !report"
        @click="onDownloadCsv"
      >
        {{ downloading ? $t('common.downloading') : $t('admin.reports.downloadCsv') }}
      </button>
    </div>

    <p v-if="error" class="mt-4 rounded-2xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <div class="mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div>
        <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.reports.filter.from') }}
        </label>
        <input v-model="filters.from" type="date" class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
      </div>
      <div>
        <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.reports.filter.to') }}
        </label>
        <input v-model="filters.to" type="date" class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
      </div>
      <div>
        <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.reports.filter.dateBasis') }}
        </label>
        <select v-model="filters.dateBasis" class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
          <option value="soldAt">{{ $t('admin.reports.filter.soldAt') }}</option>
          <option value="serviceDate">{{ $t('admin.reports.filter.serviceDate') }}</option>
        </select>
        <p class="text-[10px] text-slate-400 mt-1">{{ $t('admin.reports.filter.dateBasisHint') }}</p>
      </div>
      <div>
        <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.reports.filter.groupBy') }}
        </label>
        <select v-model="filters.groupBy" class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
          <option value="service">{{ $t('admin.reports.filter.groupService') }}</option>
          <option value="customer">{{ $t('admin.reports.filter.groupCustomer') }}</option>
          <option value="month">{{ $t('admin.reports.filter.groupMonth') }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="mt-6 text-slate-500 text-sm">{{ $t('common.loading') }}…</div>

    <template v-else-if="report">
      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            {{ $t('admin.reports.section.totalRevenue') }}
          </h3>
          <div v-if="totalsSection(report.totalRevenue).length === 0" class="mt-1 text-sm text-emerald-900/60">—</div>
          <div v-for="t in report.totalRevenue" :key="t.currency" class="mt-1">
            <p class="text-xl font-semibold text-emerald-900">{{ money(t.totalCents, t.currency) }}</p>
            <p class="text-[11px] text-emerald-700/70">{{ t.saleCount }} {{ $t('admin.reports.section.sales') }}</p>
          </div>
        </div>
        <div class="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-amber-700">
            {{ $t('admin.reports.section.pipeline') }}
          </h3>
          <div v-if="report.pipeline.length === 0" class="mt-1 text-sm text-amber-900/60">—</div>
          <div v-for="t in report.pipeline" :key="t.currency" class="mt-1">
            <p class="text-xl font-semibold text-amber-900">{{ money(t.totalCents, t.currency) }}</p>
            <p class="text-[11px] text-amber-700/70">{{ t.saleCount }} PENDING</p>
          </div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-700">
            {{ $t('admin.reports.section.lost') }}
          </h3>
          <div v-if="report.lost.length === 0" class="mt-1 text-sm text-slate-900/60">—</div>
          <div v-for="t in report.lost" :key="t.currency" class="mt-1">
            <p class="text-xl font-semibold text-slate-800">{{ money(t.totalCents, t.currency) }}</p>
            <p class="text-[11px] text-slate-500">{{ t.saleCount }} LOST</p>
          </div>
        </div>
        <div class="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            {{ $t('admin.reports.section.notDelivered') }}
          </h3>
          <div v-if="report.notDelivered.length === 0" class="mt-1 text-sm text-indigo-900/60">—</div>
          <div v-for="t in report.notDelivered" :key="t.currency" class="mt-1">
            <p class="text-xl font-semibold text-indigo-900">{{ money(t.totalCents, t.currency) }}</p>
            <p class="text-[11px] text-indigo-700/70">{{ t.saleCount }} {{ $t('admin.reports.section.sales') }}</p>
          </div>
        </div>
      </div>

      <div class="mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">{{ $t('admin.reports.breakdown.label') }}</th>
              <th class="px-3 py-2 text-left">{{ $t('admin.reports.breakdown.currency') }}</th>
              <th class="px-3 py-2 text-right">{{ $t('admin.reports.breakdown.count') }}</th>
              <th class="px-3 py-2 text-right">{{ $t('admin.reports.breakdown.units') }}</th>
              <th class="px-3 py-2 text-right">{{ $t('admin.reports.breakdown.total') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in report.breakdown" :key="`${row.key}-${row.currency}`">
              <td class="px-3 py-2 text-slate-900 font-medium">{{ row.label }}</td>
              <td class="px-3 py-2 text-slate-500 font-mono">{{ row.currency }}</td>
              <td class="px-3 py-2 text-right">{{ row.count }}</td>
              <td class="px-3 py-2 text-right">{{ row.unitsSold }}</td>
              <td class="px-3 py-2 text-right font-mono">{{ money(row.totalCents, row.currency) }}</td>
            </tr>
            <tr v-if="report.breakdown.length === 0">
              <td colspan="5" class="px-3 py-6 text-center text-slate-400 text-sm">
                {{ $t('admin.reports.breakdown.empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
