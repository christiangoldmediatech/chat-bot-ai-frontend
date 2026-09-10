<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { ServicesPerformedResponse } from '~/types/service-history'
import { CHART_DONUT_SERIES_COLORS, DASHBOARD_PALETTE } from '~/utils/dashboard-palette'

const props = defineProps<{
  from: string
  to: string
  botId?: string
  tenantId?: string
  fillHeight?: boolean
}>()

const { t, locale } = useI18n()
const metrics = props.tenantId
  ? useSuperadminTenantDashboardMetrics(props.tenantId)
  : useTenantDashboardMetrics()

const data = ref<ServicesPerformedResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

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

const topRows = computed(() => {
  if (!data.value) return []
  return data.value.rows
    .filter(r => r.attended > 0)
    .slice()
    .sort((a, b) => b.attended - a.attended)
    .slice(0, 8)
})

const totalAttended = computed(() => data.value?.totals.attended ?? 0)

const donutChart = computed(() => {
  const rows = topRows.value
  return {
    options: {
      chart: { type: 'donut', fontFamily: 'inherit', foreColor: '#475569', parentHeightOffset: 0, offsetY: 0 },
      colors: CHART_DONUT_SERIES_COLORS,
      labels: rows.map(r => r.name),
      legend: { show: false },
      stroke: { colors: ['#ffffff'], width: 3 },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '78%',
            labels: {
              show: true,
              name: { show: false },
              value: {
                show: true,
                fontSize: '28px',
                fontWeight: 700,
                color: DASHBOARD_PALETTE.navy,
                offsetY: 6,
                formatter: (val: string) => String(val),
              },
              total: {
                show: true,
                showAlways: true,
                label: t('admin.dashboardRedesign.donut.centerLabel'),
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b',
                formatter: () => String(totalAttended.value),
              },
            },
          },
        },
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val} ${t('admin.dashboardRedesign.donut.unit')}`,
        },
      },
    },
    series: rows.map(r => r.attended),
  }
})

function pctOfTotal(value: number): number {
  if (totalAttended.value === 0) return 0
  return Math.round((value / totalAttended.value) * 100)
}

function fmtRevenue(cents: number, currency: string | null): string {
  if (!currency || cents === 0) return '—'
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

const totalRevenue = computed(() => {
  if (!data.value) return { cents: 0, currency: null }
  return { cents: data.value.totals.revenueCents, currency: data.value.totals.currency }
})
</script>

<template>
  <section
    class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass h-full"
    :class="fillHeight ? 'p-3 flex flex-col min-h-0 min-w-0 overflow-hidden' : 'p-5'"
  >
    <header class="mb-2 flex items-start justify-between gap-3 shrink-0">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">{{ $t('admin.dashboardRedesign.donut.title') }}</h3>
        <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.dashboardRedesign.donut.subtitle') }}</p>
      </div>
      <div v-if="totalRevenue.cents > 0" class="text-right">
        <p class="text-[11px] uppercase tracking-wider text-slate-500">{{ $t('admin.dashboardRedesign.donut.revenue') }}</p>
        <p class="text-lg font-semibold text-slate-900 tabular-nums mt-0.5">{{ fmtRevenue(totalRevenue.cents, totalRevenue.currency) }}</p>
      </div>
    </header>

    <div v-if="loading && !data" :class="fillHeight ? 'flex-1 min-h-0 rounded-xl bg-slate-100/60 animate-pulse' : 'h-64 rounded-xl bg-slate-100/60 animate-pulse'" />

    <p v-else-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>

    <div v-else-if="topRows.length === 0" :class="fillHeight ? 'flex-1 min-h-0 flex items-center justify-center text-sm text-slate-400 text-center px-4' : 'h-64 flex items-center justify-center text-sm text-slate-400 text-center px-4'">
      {{ $t('admin.dashboardRedesign.donut.empty') }}
    </div>

    <div
      v-else
      class="gap-3 items-center"
      :class="fillHeight
        ? 'flex-1 min-h-0 min-w-0 flex flex-row'
        : 'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'"
    >
      <div :class="fillHeight ? 'relative h-full aspect-square shrink-0 min-h-0 min-w-0 overflow-hidden' : ''">
        <ClientOnly>
          <apexchart
            type="donut"
            :height="fillHeight ? '100%' : 240"
            :width="fillHeight ? '100%' : undefined"
            :options="donutChart.options"
            :series="donutChart.series"
          />
        </ClientOnly>
      </div>
      <ul
        class="grid grid-cols-1 gap-x-3 gap-y-1 pr-1 min-w-0"
        :class="fillHeight ? 'flex-1 h-full min-h-0 overflow-y-auto content-start' : 'max-h-64 overflow-y-auto'"
      >
        <li v-for="(row, i) in topRows" :key="row.serviceId ?? row.name" class="flex items-center gap-2 text-xs">
          <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: CHART_DONUT_SERIES_COLORS[i % CHART_DONUT_SERIES_COLORS.length] }" />
          <span class="flex-1 min-w-0 text-slate-800 truncate">{{ row.name }}</span>
          <span class="tabular-nums text-slate-900 font-semibold">{{ row.attended }}</span>
          <span class="tabular-nums text-slate-500 w-9 text-right">{{ pctOfTotal(row.attended) }}%</span>
        </li>
      </ul>
    </div>
  </section>
</template>
