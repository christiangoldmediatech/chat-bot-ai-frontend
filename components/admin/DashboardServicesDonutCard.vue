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

// Bug fix 2026-09-17 (second follow-up): the ApexCharts custom tooltip lives
// inside `.apexcharts-canvas` which is nested under several `overflow-hidden`
// ancestors (the dashboard shell has `lg:overflow-hidden` and cannot be
// removed without changing the app-shell scroll UX). We disable ApexCharts's
// tooltip entirely and render our own tooltip via `<Teleport to="body">`,
// positioned with `position: fixed` and clamped to the viewport with a flip
// when it would overflow. This way the tooltip is legible regardless of the
// chart's position on screen and regardless of any ancestor's overflow.
interface DonutTooltipContent {
  name: string
  value: number
  pct: number
  color: string
}
const tooltipVisible = ref(false)
const tooltipContent = ref<DonutTooltipContent | null>(null)
const tooltipPos = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const TOOLTIP_MAX_WIDTH = 260
const TOOLTIP_EST_HEIGHT = 64
const TOOLTIP_OFFSET = 12

function updateTooltipPos(clientX: number, clientY: number): void {
  const vw = typeof window === 'undefined' ? 1280 : window.innerWidth
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight
  // Prefer to the right of the cursor; flip left if it would overflow.
  let x = clientX + TOOLTIP_OFFSET
  if (x + TOOLTIP_MAX_WIDTH > vw - 8) {
    x = clientX - TOOLTIP_OFFSET - TOOLTIP_MAX_WIDTH
  }
  x = Math.max(8, x)
  // Prefer below the cursor; flip up if it would overflow.
  let y = clientY + TOOLTIP_OFFSET
  if (y + TOOLTIP_EST_HEIGHT > vh - 8) {
    y = clientY - TOOLTIP_OFFSET - TOOLTIP_EST_HEIGHT
  }
  y = Math.max(8, y)
  tooltipPos.value = { x, y }
}

function onDataPointEnter(
  event: MouseEvent | undefined,
  _ctx: unknown,
  config: { dataPointIndex: number },
): void {
  const i = config?.dataPointIndex
  if (i == null || i < 0) return
  const row = topRows.value[i]
  if (!row) return
  tooltipContent.value = {
    name: row.name,
    value: row.attended,
    pct: pctOfTotal(row.attended),
    color: CHART_DONUT_SERIES_COLORS[i % CHART_DONUT_SERIES_COLORS.length],
  }
  if (event) updateTooltipPos(event.clientX, event.clientY)
  tooltipVisible.value = true
}

function onDataPointLeave(): void {
  tooltipVisible.value = false
}

function onMouseMove(event: MouseEvent | undefined): void {
  if (!tooltipVisible.value || !event) return
  updateTooltipPos(event.clientX, event.clientY)
}

const donutChart = computed(() => {
  const rows = topRows.value
  return {
    options: {
      chart: {
        type: 'donut',
        fontFamily: 'inherit',
        foreColor: '#475569',
        parentHeightOffset: 0,
        offsetY: 0,
        events: {
          dataPointMouseEnter: onDataPointEnter,
          dataPointMouseLeave: onDataPointLeave,
          mouseMove: onMouseMove,
          mouseLeave: onDataPointLeave,
        },
      },
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
      // ApexCharts tooltip disabled: we render our own via <Teleport to="body">
      // so it escapes all `overflow-hidden` ancestors (see the state block above).
      tooltip: { enabled: false },
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
    :class="fillHeight ? 'p-3 flex flex-col min-h-0 min-w-0' : 'p-5'"
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
      <div :class="fillHeight ? 'relative h-full aspect-square shrink-0 min-h-0 min-w-0' : ''">
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
        <!-- Bug fix 2026-09-17: legend items used `truncate` without a `title`
             attribute, so long service names collapsed to "Li..." "Tra..."
             with no way to recover the full name. Now the full name is always
             readable via the native browser tooltip; if the flex row is still
             too narrow, at least the hover restores context. -->
        <li v-for="(row, i) in topRows" :key="row.serviceId ?? row.name" class="flex items-center gap-2 text-xs">
          <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: CHART_DONUT_SERIES_COLORS[i % CHART_DONUT_SERIES_COLORS.length] }" />
          <span class="flex-1 min-w-0 text-slate-800 truncate" :title="row.name">{{ row.name }}</span>
          <span class="tabular-nums text-slate-900 font-semibold">{{ row.attended }}</span>
          <span class="tabular-nums text-slate-500 w-9 text-right">{{ pctOfTotal(row.attended) }}%</span>
        </li>
      </ul>
    </div>

    <!-- Portalized tooltip: lives in <body> so no ancestor `overflow-hidden`
         can clip it. Positioned via `position: fixed` with viewport-edge
         detection (see `updateTooltipPos`). -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="tooltipVisible && tooltipContent"
          role="tooltip"
          class="pointer-events-none"
          :style="{
            position: 'fixed',
            left: tooltipPos.x + 'px',
            top: tooltipPos.y + 'px',
            zIndex: 9999,
            maxWidth: '260px',
          }"
        >
          <div
            class="rounded-lg shadow-lg"
            style="padding: 8px 10px; background: #0f172a; color: #f8fafc; line-height: 1.35; font-family: inherit;"
          >
            <div class="flex items-center gap-1.5 font-semibold" style="margin-bottom: 2px; word-break: break-word; white-space: normal;">
              <span
                class="inline-block rounded-full shrink-0"
                style="width: 8px; height: 8px;"
                :style="{ backgroundColor: tooltipContent.color }"
              />
              <span style="font-size: 12px;">{{ tooltipContent.name }}</span>
            </div>
            <div style="font-size: 11px; color: #cbd5e1;">
              {{ tooltipContent.value }} {{ $t('admin.dashboardRedesign.donut.unit') }} · {{ tooltipContent.pct }}%
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </section>
</template>
