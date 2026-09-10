<script setup lang="ts">
import type { MetricsSummaryTotals } from '~/types/dashboard'
import { DASHBOARD_PALETTE } from '~/utils/dashboard-palette'

const props = defineProps<{
  totals: MetricsSummaryTotals
  previous: MetricsSummaryTotals
}>()

const { t } = useI18n()

interface MetricRow {
  key: keyof MetricsSummaryTotals
  labelKey: string
  current: number
  previous: number
}

const rows = computed<MetricRow[]>(() => {
  const keys: Array<{ key: keyof MetricsSummaryTotals, labelKey: string }> = [
    { key: 'messagesSentByBot', labelKey: 'messagesSentByBot' },
    { key: 'conversationsTotal', labelKey: 'conversations' },
    { key: 'leadsTotal', labelKey: 'leads' },
    { key: 'meetingsScheduled', labelKey: 'meetingsScheduled' },
    { key: 'uniqueCustomers', labelKey: 'uniqueCustomers' },
    { key: 'conversationsHandledByHuman', labelKey: 'handledByHuman' },
    { key: 'leadsNew', labelKey: 'leadsNew' },
    { key: 'leadsWon', labelKey: 'leadsWon' },
  ]
  return keys.map(k => ({
    key: k.key,
    labelKey: k.labelKey,
    current: props.totals[k.key] ?? 0,
    previous: props.previous[k.key] ?? 0,
  }))
})

const isAllZero = computed(() =>
  rows.value.every(r => r.current === 0 && r.previous === 0),
)

const chart = computed(() => {
  const categories = rows.value.map(r => t(`admin.dashboardRedesign.summaryChart.metric.${r.labelKey}`))
  return {
    options: {
      chart: {
        type: 'bar',
        toolbar: { show: false },
        fontFamily: 'inherit',
        foreColor: '#475569',
      },
      colors: [DASHBOARD_PALETTE.primary, DASHBOARD_PALETTE.accent],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
          barHeight: '75%',
          dataLabels: { position: 'top' },
        },
      },
      dataLabels: {
        enabled: true,
        offsetX: 24,
        formatter: (val: number) => (val > 0 ? String(val) : ''),
        style: { fontSize: '11px', fontWeight: 700, colors: ['#0f172a'] },
      },
      stroke: { width: 1, colors: ['#fff'] },
      xaxis: {
        categories,
        labels: { style: { fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontSize: '11px', fontWeight: 600, colors: ['#334155'] },
          maxWidth: 200,
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
      tooltip: { theme: 'light' },
    },
    series: [
      {
        name: t('admin.dashboardRedesign.summaryChart.currentPeriod'),
        data: rows.value.map(r => r.current),
      },
      {
        name: t('admin.dashboardRedesign.summaryChart.previousPeriod'),
        data: rows.value.map(r => r.previous),
      },
    ],
  }
})
</script>

<template>
  <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-5">
    <header class="mb-4">
      <h3 class="text-sm font-semibold text-slate-900">{{ $t('admin.dashboardRedesign.summaryChart.title') }}</h3>
      <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.dashboardRedesign.summaryChart.subtitle') }}</p>
    </header>

    <div v-if="isAllZero" class="h-48 flex items-center justify-center text-sm text-slate-400 text-center">
      {{ $t('admin.dashboardRedesign.summaryChart.empty') }}
    </div>

    <ClientOnly v-else>
      <apexchart type="bar" height="440" :options="chart.options" :series="chart.series" />
    </ClientOnly>
  </section>
</template>
