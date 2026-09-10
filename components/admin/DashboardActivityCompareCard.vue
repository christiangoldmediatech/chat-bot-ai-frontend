<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { MetricsInterval, MetricsTimeseriesResponse, TimeseriesMetric } from '~/types/dashboard'
import { CHART_COLORS, DASHBOARD_PALETTE } from '~/utils/dashboard-palette'

const props = defineProps<{
  from: string
  to: string
  interval: MetricsInterval
  botId?: string
  tenantId?: string
}>()

const { t } = useI18n()
const metrics = props.tenantId
  ? useSuperadminTenantDashboardMetrics(props.tenantId)
  : useTenantDashboardMetrics()

type Pair = { key: string, labelKey: string, a: TimeseriesMetric, b: TimeseriesMetric, colorA: string, colorB: string }
const PAIRS: Pair[] = [
  { key: 'conv-leads', labelKey: 'convVsLeads', a: 'conversations', b: 'leads', colorA: CHART_COLORS.conversations, colorB: CHART_COLORS.leads },
  { key: 'sched-held', labelKey: 'schedVsHeld', a: 'meetingsScheduled', b: 'meetingsHeld', colorA: CHART_COLORS.scheduled, colorB: CHART_COLORS.held },
  { key: 'sent-recv', labelKey: 'sentVsRecv', a: 'messagesSentByBot', b: 'messagesReceived', colorA: CHART_COLORS.conversations, colorB: DASHBOARD_PALETTE.accent },
]

const activePair = ref<Pair>(PAIRS[0])
const seriesA = ref<MetricsTimeseriesResponse | null>(null)
const seriesB = ref<MetricsTimeseriesResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [a, b] = await Promise.all([
      metrics.timeseries(activePair.value.a, { from: props.from, to: props.to, interval: props.interval, botId: props.botId }),
      metrics.timeseries(activePair.value.b, { from: props.from, to: props.to, interval: props.interval, botId: props.botId }),
    ])
    seriesA.value = a
    seriesB.value = b
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

watch(() => [props.from, props.to, props.interval, props.botId, activePair.value.key], () => { void load() }, { immediate: true })

const totalA = computed(() => seriesA.value?.total ?? 0)
const totalB = computed(() => seriesB.value?.total ?? 0)

const chart = computed(() => {
  const labels = seriesA.value?.buckets.map(b => b.date) ?? []
  return {
    options: {
      chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', foreColor: '#475569', zoom: { enabled: false } },
      colors: [activePair.value.colorA, activePair.value.colorB],
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] },
      },
      dataLabels: { enabled: false },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 3 },
      xaxis: {
        categories: labels,
        labels: { style: { fontSize: '10px' }, rotate: 0, hideOverlappingLabels: true },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { fontSize: '11px' } } },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '12px',
        markers: { size: 6 },
        itemMargin: { horizontal: 12 },
      },
      tooltip: { theme: 'light' },
    },
    series: [
      { name: t(`admin.dashboardRedesign.compare.metrics.${activePair.value.a}`), data: seriesA.value?.buckets.map(b => b.value) ?? [] },
      { name: t(`admin.dashboardRedesign.compare.metrics.${activePair.value.b}`), data: seriesB.value?.buckets.map(b => b.value) ?? [] },
    ],
  }
})
</script>

<template>
  <section class="rounded-2xl bg-white backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-5 h-full">
    <header class="flex items-start justify-between gap-3 mb-3 flex-wrap">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">{{ $t('admin.dashboardRedesign.compare.title') }}</h3>
        <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.dashboardRedesign.compare.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-4 text-sm">
        <div class="flex items-baseline gap-1.5">
          <span class="size-2.5 rounded-full" :style="{ backgroundColor: activePair.colorA }" />
          <span class="tabular-nums font-semibold text-slate-900">{{ totalA.toLocaleString() }}</span>
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="size-2.5 rounded-full" :style="{ backgroundColor: activePair.colorB }" />
          <span class="tabular-nums font-semibold text-slate-900">{{ totalB.toLocaleString() }}</span>
        </div>
      </div>
    </header>

    <div class="mb-3 inline-flex rounded-xl bg-slate-100 p-1">
      <button v-for="p in PAIRS" :key="p.key" type="button"
              class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
              :class="activePair.key === p.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              @click="activePair = p">
        {{ $t(`admin.dashboardRedesign.compare.pair.${p.labelKey}`) }}
      </button>
    </div>

    <div v-if="loading && !seriesA" class="h-64 rounded-xl bg-slate-100/60 animate-pulse" />
    <p v-else-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>
    <div v-else>
      <ClientOnly>
        <apexchart type="area" height="260" :options="chart.options" :series="chart.series" />
      </ClientOnly>
    </div>
  </section>
</template>
