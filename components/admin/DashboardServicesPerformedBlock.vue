<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { ServicesPerformedResponse, ServicesPerformedRow } from '~/types/service-history'

const props = defineProps<{
  from: string
  to: string
  botId?: string
  tenantId?: string
}>()

const { t, locale } = useI18n()

const metrics = props.tenantId
  ? useSuperadminTenantDashboardMetrics(props.tenantId)
  : useTenantDashboardMetrics()

const data = ref<ServicesPerformedResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const sortKey = ref<'attended' | 'scheduled' | 'noShow' | 'rescheduled' | 'revenueCents'>('attended')
const sortDir = ref<'desc' | 'asc'>('desc')

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await metrics.servicesPerformed({
      from: props.from,
      to: props.to,
      botId: props.botId,
    })
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

watch(() => [props.from, props.to, props.botId], () => { void load() }, { immediate: true })

function fmtMoney(cents: number, currency: string | null): string {
  if (!currency) return cents === 0 ? '—' : String(cents / 100)
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function fmtRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)}%`
}

function fmtDelta(current: number, previous: number): { value: string, tone: string } {
  if (previous === 0) return { value: current > 0 ? '+∞' : '—', tone: current > 0 ? 'text-emerald-700' : 'text-slate-500' }
  const pct = ((current - previous) / previous) * 100
  const rounded = Math.round(pct)
  if (rounded === 0) return { value: '0%', tone: 'text-slate-500' }
  return {
    value: `${rounded > 0 ? '+' : ''}${rounded}%`,
    tone: rounded > 0 ? 'text-emerald-700' : 'text-danger-600',
  }
}

function fmtRateDelta(current: number | null, previous: number | null): { value: string, tone: string } {
  if (current === null || previous === null) return { value: '—', tone: 'text-slate-500' }
  const diff = Math.round((current - previous) * 100)
  if (diff === 0) return { value: '0 pp', tone: 'text-slate-500' }
  return {
    value: `${diff > 0 ? '+' : ''}${diff} pp`,
    tone: diff > 0 ? 'text-emerald-700' : 'text-danger-600',
  }
}

const sortedRows = computed<ServicesPerformedRow[]>(() => {
  if (!data.value) return []
  const rows = data.value.rows.slice()
  const dir = sortDir.value === 'desc' ? -1 : 1
  rows.sort((a, b) => {
    const av = a[sortKey.value] ?? 0
    const bv = b[sortKey.value] ?? 0
    if (av === bv) return 0
    return av < bv ? -dir : dir
  })
  return rows
})

const topRows = computed(() => sortedRows.value.slice(0, 8))

const CHART_COLORS = {
  attended: '#10b981',
  scheduled: '#0ea5e9',
  noShow: '#f43f5e',
  rescheduled: '#f59e0b',
  cancelled: '#94a3b8',
}

const chartRows = computed<ServicesPerformedRow[]>(() => {
  if (!data.value) return []
  return data.value.rows
    .slice()
    .sort((a, b) => (b.attended + b.scheduled) - (a.attended + a.scheduled))
    .slice(0, 10)
    .reverse()
})

const stackedChart = computed(() => {
  const rows = chartRows.value
  const categories = rows.map((r) => r.name)
  return {
    options: {
      chart: {
        type: 'bar',
        stacked: true,
        toolbar: { show: false },
        fontFamily: 'inherit',
        foreColor: '#475569',
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
          barHeight: '60%',
          dataLabels: { position: 'center' },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => (val > 0 ? String(val) : ''),
        style: { fontSize: '11px', fontWeight: 600, colors: ['#fff'] },
      },
      stroke: { width: 1, colors: ['#fff'] },
      xaxis: {
        categories,
        labels: { style: { fontSize: '11px' } },
      },
      yaxis: {
        labels: {
          style: { fontSize: '12px', fontWeight: 500 },
          maxWidth: 240,
        },
      },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 3 },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '12px',
        markers: { size: 6 },
        itemMargin: { horizontal: 12 },
      },
      colors: [
        CHART_COLORS.attended,
        CHART_COLORS.scheduled,
        CHART_COLORS.noShow,
        CHART_COLORS.rescheduled,
        CHART_COLORS.cancelled,
      ],
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val: number) => `${val} ${t('admin.dashboardServices.tooltipUnit')}`,
        },
      },
    },
    series: [
      { name: t('admin.dashboardServices.col.attended'), data: rows.map((r) => r.attended) },
      { name: t('admin.dashboardServices.col.scheduled'), data: rows.map((r) => r.scheduled) },
      { name: t('admin.dashboardServices.col.noShow'), data: rows.map((r) => r.noShow) },
      { name: t('admin.dashboardServices.col.rescheduled'), data: rows.map((r) => r.rescheduled) },
      { name: t('admin.dashboardServices.status.cancelled'), data: rows.map((r) => r.cancelled) },
    ],
  }
})

const chartHeight = computed(() => Math.max(220, chartRows.value.length * 42 + 80))

function setSort(k: typeof sortKey.value): void {
  if (sortKey.value === k) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = k
    sortDir.value = 'desc'
  }
}

function meetingLink(row: ServicesPerformedRow): string {
  const q = new URLSearchParams()
  q.set('serviceId', row.serviceId ?? '')
  q.set('dateFrom', props.from)
  q.set('dateTo', props.to)
  if (props.botId) q.set('botId', props.botId)
  return props.tenantId
    ? `/superadmin/companies/${props.tenantId}/meetings?${q.toString()}`
    : `/admin/meetings?${q.toString()}`
}
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6 space-y-5">
    <header class="flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-emerald-600" aria-hidden="true"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.dashboardServices.title') }}</h2>
        <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.dashboardServices.subtitle') }}</p>
      </div>
    </header>

    <SpinnerInline v-if="loading && !data" />

    <template v-else-if="data">
      <p v-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="rounded-xl bg-white/70 ring-1 ring-slate-200 px-4 py-3">
          <p class="text-[11px] uppercase tracking-wider text-slate-500">{{ $t('admin.dashboardServices.kpi.performed') }}</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{{ data.totals.attended }}</p>
          <p class="text-[11px] mt-0.5" :class="fmtDelta(data.totals.attended, data.previous.attended).tone">
            {{ fmtDelta(data.totals.attended, data.previous.attended).value }} <span class="text-slate-400">vs. anterior</span>
          </p>
        </div>
        <div class="rounded-xl bg-white/70 ring-1 ring-slate-200 px-4 py-3">
          <p class="text-[11px] uppercase tracking-wider text-slate-500">{{ $t('admin.dashboardServices.kpi.revenue') }}</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{{ fmtMoney(data.totals.revenueCents, data.totals.currency) }}</p>
          <p class="text-[11px] mt-0.5" :class="fmtDelta(data.totals.revenueCents, data.previous.revenueCents).tone">
            {{ fmtDelta(data.totals.revenueCents, data.previous.revenueCents).value }} <span class="text-slate-400">vs. anterior</span>
          </p>
        </div>
        <div class="rounded-xl bg-white/70 ring-1 ring-slate-200 px-4 py-3">
          <p class="text-[11px] uppercase tracking-wider text-slate-500">{{ $t('admin.dashboardServices.kpi.attendanceRate') }}</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{{ fmtRate(data.totals.attendanceRate) }}</p>
          <p class="text-[11px] mt-0.5" :class="fmtRateDelta(data.totals.attendanceRate, data.previous.attendanceRate).tone">
            {{ fmtRateDelta(data.totals.attendanceRate, data.previous.attendanceRate).value }} <span class="text-slate-400">vs. anterior</span>
          </p>
        </div>
        <div class="rounded-xl bg-white/70 ring-1 ring-slate-200 px-4 py-3">
          <p class="text-[11px] uppercase tracking-wider text-slate-500">{{ $t('admin.dashboardServices.kpi.rescheduled') }}</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{{ data.totals.rescheduled }}</p>
          <p class="text-[11px] mt-0.5" :class="fmtDelta(data.totals.rescheduled, data.previous.rescheduled).tone">
            {{ fmtDelta(data.totals.rescheduled, data.previous.rescheduled).value }} <span class="text-slate-400">vs. anterior</span>
          </p>
        </div>
      </div>

      <div v-if="data.rows.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-slate-500">
        {{ $t('admin.dashboardServices.empty') }}
      </div>

      <template v-else>
        <div class="space-y-2">
          <div class="flex items-baseline justify-between gap-2">
            <h3 class="text-xs uppercase tracking-wider text-slate-500 font-medium">{{ $t('admin.dashboardServices.rankingTitle') }}</h3>
            <span class="text-[11px] text-slate-500">{{ $t('admin.dashboardServices.chartHint') }}</span>
          </div>
          <div class="rounded-xl bg-white/60 ring-1 ring-slate-200 p-3">
            <ClientOnly>
              <apexchart
                type="bar"
                :height="chartHeight"
                :options="stackedChart.options"
                :series="stackedChart.series"
              />
            </ClientOnly>
          </div>
        </div>

        <div class="overflow-x-auto pt-2">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th class="py-2 pr-3 font-medium">{{ $t('admin.dashboardServices.col.service') }}</th>
                <th class="py-2 pr-3 font-medium cursor-pointer" @click="setSort('attended')">{{ $t('admin.dashboardServices.col.attended') }}</th>
                <th class="py-2 pr-3 font-medium cursor-pointer" @click="setSort('scheduled')">{{ $t('admin.dashboardServices.col.scheduled') }}</th>
                <th class="py-2 pr-3 font-medium cursor-pointer" @click="setSort('noShow')">{{ $t('admin.dashboardServices.col.noShow') }}</th>
                <th class="py-2 pr-3 font-medium cursor-pointer" @click="setSort('rescheduled')">{{ $t('admin.dashboardServices.col.rescheduled') }}</th>
                <th class="py-2 pr-3 font-medium">{{ $t('admin.dashboardServices.col.rate') }}</th>
                <th class="py-2 pr-3 font-medium cursor-pointer" @click="setSort('revenueCents')">{{ $t('admin.dashboardServices.col.revenue') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/70">
              <tr v-for="row in sortedRows" :key="row.serviceId ?? row.name" class="hover:bg-slate-50/50">
                <td class="py-2 pr-3">
                  <NuxtLink :to="meetingLink(row)" class="text-slate-800 hover:text-primary-700">{{ row.name }}</NuxtLink>
                </td>
                <td class="py-2 pr-3 tabular-nums text-emerald-700 font-medium">{{ row.attended }}</td>
                <td class="py-2 pr-3 tabular-nums text-slate-700">{{ row.scheduled }}</td>
                <td class="py-2 pr-3 tabular-nums text-danger-600">{{ row.noShow }}</td>
                <td class="py-2 pr-3 tabular-nums text-amber-700">{{ row.rescheduled }}</td>
                <td class="py-2 pr-3 tabular-nums text-slate-700">{{ fmtRate(row.attendanceRate) }}</td>
                <td class="py-2 pr-3 tabular-nums text-slate-900">{{ fmtMoney(row.revenueCents, row.currency) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </section>
</template>
