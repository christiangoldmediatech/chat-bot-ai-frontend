<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { MetricsInterval, MetricsTimeseriesResponse } from '~/types/dashboard'
import { CHART_COLORS } from '~/utils/dashboard-palette'

const props = defineProps<{
  from: string
  to: string
  interval: MetricsInterval
  botId?: string
  tenantId?: string
  fillHeight?: boolean
}>()

const { t } = useI18n()
const metrics = props.tenantId
  ? useSuperadminTenantDashboardMetrics(props.tenantId)
  : useTenantDashboardMetrics()

const data = ref<MetricsTimeseriesResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await metrics.timeseries('meetingsHeld', {
      from: props.from,
      to: props.to,
      interval: props.interval,
      botId: props.botId,
    })
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

watch(() => [props.from, props.to, props.interval, props.botId], () => { void load() }, { immediate: true })

const total = computed(() => data.value?.total ?? 0)
const previousTotal = computed(() => data.value?.previousTotal ?? 0)

const delta = computed(() => {
  if (previousTotal.value === 0) return total.value > 0 ? { text: '+∞', tone: 'text-emerald-700' } : null
  const pct = ((total.value - previousTotal.value) / previousTotal.value) * 100
  const rounded = Math.round(pct)
  if (rounded === 0) return { text: '0%', tone: 'text-slate-500' }
  return {
    text: `${rounded > 0 ? '+' : ''}${rounded}%`,
    tone: rounded > 0 ? 'text-emerald-700' : 'text-danger-600',
  }
})

const average = computed(() => {
  const buckets = data.value?.buckets ?? []
  if (buckets.length === 0) return 0
  return total.value / buckets.length
})

const chart = computed(() => {
  const buckets = data.value?.buckets ?? []
  return {
    options: {
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', foreColor: '#475569' },
      colors: [CHART_COLORS.held],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      stroke: { show: false },
      dataLabels: { enabled: false },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 3 },
      xaxis: {
        categories: buckets.map(b => b.date),
        labels: { style: { fontSize: '10px' }, rotate: 0, hideOverlappingLabels: true },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { fontSize: '11px' } } },
      annotations: {
        yaxis: average.value > 0 ? [{
          y: average.value,
          borderColor: '#94a3b8',
          strokeDashArray: 4,
          label: {
            borderColor: '#94a3b8',
            style: { color: '#fff', background: '#64748b', fontSize: '10px', fontWeight: 600 },
            text: `${t('admin.dashboardRedesign.attended.avg')}: ${average.value.toFixed(1)}`,
          },
        }] : [],
      },
      tooltip: { theme: 'light' },
    },
    series: [{ name: t('admin.dashboardRedesign.attended.seriesName'), data: buckets.map(b => b.value) }],
  }
})
</script>

<template>
  <section
    class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass h-full"
    :class="fillHeight ? 'p-4 flex flex-col min-h-0' : 'p-5'"
  >
    <header class="flex items-start justify-between gap-3 mb-3 flex-wrap shrink-0">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">{{ $t('admin.dashboardRedesign.attended.title') }}</h3>
        <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.dashboardRedesign.attended.subtitle') }}</p>
      </div>
      <div class="text-right">
        <p class="text-2xl font-bold text-slate-900 tabular-nums leading-none">{{ total.toLocaleString() }}</p>
        <p v-if="delta" class="text-[11px] mt-1 font-semibold" :class="delta.tone">{{ delta.text }} <span class="text-slate-400 font-normal">vs. período anterior</span></p>
      </div>
    </header>

    <div v-if="loading && !data" :class="fillHeight ? 'flex-1 min-h-0 rounded-xl bg-slate-100/60 animate-pulse' : 'h-56 rounded-xl bg-slate-100/60 animate-pulse'" />
    <p v-else-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>
    <div v-else-if="total === 0" :class="fillHeight ? 'flex-1 min-h-0 flex items-center justify-center text-sm text-slate-400 text-center px-4' : 'h-56 flex items-center justify-center text-sm text-slate-400 text-center px-4'">
      {{ $t('admin.dashboardRedesign.attended.empty') }}
    </div>
    <div v-else :class="fillHeight ? 'flex-1 min-h-0' : ''">
      <ClientOnly>
        <apexchart type="bar" :height="fillHeight ? '100%' : 220" :options="chart.options" :series="chart.series" />
      </ClientOnly>
    </div>
  </section>
</template>
