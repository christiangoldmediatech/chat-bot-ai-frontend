<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  MetricsSummaryResponse,
  MetricsTimeseriesResponse,
  PlatformByBotRow,
  PlatformByTenantRow,
  SuperadminDashboardSummary,
} from '~/types/dashboard'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const router = useRouter()
const { superadminSummary } = useDashboard()
const metrics = usePlatformDashboardMetrics()
const { full, percent } = useDateFormat()
const { t } = useI18n()

const data = ref<SuperadminDashboardSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

function isoStart(d: Date): string {
  const dd = new Date(d)
  dd.setHours(0, 0, 0, 0)
  return dd.toISOString()
}
function isoEnd(d: Date): string {
  const dd = new Date(d)
  dd.setHours(23, 59, 59, 999)
  return dd.toISOString()
}
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

const range = ref<{ from: string; to: string }>({
  from: isoStart(daysAgo(29)),
  to: isoEnd(new Date()),
})
const activityInterval = ref<'day' | 'month' | 'year'>('day')
const platformSummary = ref<MetricsSummaryResponse | null>(null)
const platformConvSeries = ref<MetricsTimeseriesResponse | null>(null)
const platformLeadSeries = ref<MetricsTimeseriesResponse | null>(null)
const platformMsgsSeries = ref<MetricsTimeseriesResponse | null>(null)
const platformMeetingsSeries = ref<MetricsTimeseriesResponse | null>(null)
const byTenant = ref<PlatformByTenantRow[]>([])
const byBot = ref<PlatformByBotRow[]>([])
const platformLoading = ref(true)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await superadminSummary()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function loadPlatform(): Promise<void> {
  if (!range.value.from || !range.value.to) return
  platformLoading.value = true
  try {
    const q = { ...range.value, interval: activityInterval.value }
    const [s, conv, leads, msgs, meets, byT, byB] = await Promise.all([
      metrics.summary(range.value),
      metrics.timeseries('conversations', q),
      metrics.timeseries('leads', q),
      metrics.timeseries('messagesSentByBot', q).catch(() => null),
      metrics.timeseries('meetingsScheduled', q).catch(() => null),
      metrics.byTenant(range.value),
      metrics.byBot(range.value),
    ])
    platformSummary.value = s
    platformConvSeries.value = conv
    platformLeadSeries.value = leads
    platformMsgsSeries.value = msgs
    platformMeetingsSeries.value = meets
    byTenant.value = byT.rows
    byBot.value = byB.rows
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    platformLoading.value = false
  }
}

watch(
  () => JSON.stringify(range.value) + activityInterval.value,
  () => loadPlatform(),
  { immediate: true },
)

const CHART_COLOR_CONVERSATIONS = '#38bdf8'
const CHART_COLOR_LEADS = '#34d399'
const CHART_COLOR_CUSTOMERS = '#818cf8'
const CHART_COLOR_PRIMARY = '#077ddc'
const CHART_COLOR_ACCENT = '#5be9ec'

function darkSparkline(values: number[], color: string) {
  return {
    options: {
      chart: {
        type: 'area' as const,
        sparkline: { enabled: true },
        animations: { enabled: false },
        fontFamily: 'inherit',
      },
      colors: [color],
      stroke: { curve: 'smooth' as const, width: 2 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.02, stops: [0, 100] },
      },
      tooltip: { enabled: false },
    },
    series: [{ name: '', data: values }],
  }
}

const heroMsgsSpark = computed(() =>
  darkSparkline(platformMsgsSeries.value?.buckets.map(b => b.value) ?? [], CHART_COLOR_PRIMARY),
)
const heroConvSpark = computed(() =>
  darkSparkline(platformConvSeries.value?.buckets.map(b => b.value) ?? [], CHART_COLOR_ACCENT),
)

function deltaPct(current: number, previous: number): { text: string, positive: boolean } | null {
  if (previous === 0) return current > 0 ? { text: '+∞', positive: true } : null
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { text: '0%', positive: true }
  return { text: `${pct > 0 ? '+' : ''}${pct}%`, positive: pct > 0 }
}

const platformKpis = computed(() => {
  const totals = platformSummary.value?.totals
  const previous = platformSummary.value?.previous
  return [
    {
      key: 'uniqueCustomers',
      label: t('admin.dashboard.kpi.uniqueCustomers'),
      value: totals?.uniqueCustomers ?? 0,
      delta: totals && previous ? deltaPct(totals.uniqueCustomers, previous.uniqueCustomers) : null,
      spark: [] as number[],
      color: CHART_COLOR_CUSTOMERS,
    },
    {
      key: 'meetingsScheduled',
      label: t('admin.dashboard.kpi.meetingsScheduled'),
      value: totals?.meetingsScheduled ?? 0,
      delta: totals && previous ? deltaPct(totals.meetingsScheduled, previous.meetingsScheduled) : null,
      spark: platformMeetingsSeries.value?.buckets.map(b => b.value) ?? [],
      color: CHART_COLOR_ACCENT,
    },
    {
      key: 'leadsTotal',
      label: t('admin.dashboard.kpi.leads'),
      value: totals?.leadsTotal ?? 0,
      delta: totals && previous ? deltaPct(totals.leadsTotal, previous.leadsTotal) : null,
      spark: platformLeadSeries.value?.buckets.map(b => b.value) ?? [],
      color: CHART_COLOR_LEADS,
    },
    {
      key: 'meetingsCancelled',
      label: t('admin.dashboardRedesign.compare.metrics.meetingsCancelled'),
      value: totals?.meetingsCancelled ?? 0,
      delta: totals && previous ? deltaPct(totals.meetingsCancelled, previous.meetingsCancelled) : null,
      spark: [] as number[],
      color: '#f43f5e',
    },
  ]
})

const overviewChart = computed(() => {
  if (!data.value) return null
  const s = data.value
  const rows: Array<{ label: string, value: number }> = [
    { label: t('superadmin.dashboard.stat.companies'), value: s.totalCompanies },
    { label: t('superadmin.dashboard.stat.users'), value: s.totalUsers },
    { label: t('superadmin.dashboard.stat.bots'), value: s.totalBots },
    { label: t('superadmin.dashboard.stat.conversations'), value: s.totalConversations },
    { label: t('superadmin.dashboard.stat.documents'), value: s.totalDocuments },
  ]
  return {
    options: {
      chart: { type: 'bar' as const, toolbar: { show: false }, background: 'transparent', fontFamily: 'inherit' },
      theme: { mode: 'dark' as const },
      colors: [CHART_COLOR_PRIMARY],
      plotOptions: {
        bar: { horizontal: true, borderRadius: 6, barHeight: '65%', distributed: false, dataLabels: { position: 'top' } },
      },
      dataLabels: {
        enabled: true,
        offsetX: 32,
        formatter: (v: number) => full(v),
        style: { fontSize: '12px', fontWeight: 700, colors: ['#e2e8f0'] },
      },
      grid: { borderColor: '#334155', strokeDashArray: 3 },
      xaxis: {
        categories: rows.map(r => r.label),
        labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: '#cbd5e1', fontSize: '12px', fontWeight: 600 }, maxWidth: 180 },
      },
      tooltip: { theme: 'dark' as const, y: { formatter: (v: number) => full(v) } },
      legend: { show: false },
    },
    series: [{ name: t('superadmin.dashboard.overviewChart.series'), data: rows.map(r => r.value) }],
  }
})

const mixedChart = computed(() => {
  if (!platformConvSeries.value || !platformLeadSeries.value) return null
  return {
    options: {
      chart: { toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false }, background: 'transparent' },
      theme: { mode: 'dark' as const },
      colors: [CHART_COLOR_CONVERSATIONS, CHART_COLOR_LEADS],
      stroke: { curve: 'smooth' as const, width: [0, 3] },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
      grid: { borderColor: '#334155', strokeDashArray: 4 },
      dataLabels: { enabled: false },
      xaxis: {
        categories: platformConvSeries.value.buckets.map((b) => b.date),
        labels: { style: { colors: '#94a3b8', fontSize: '11px' }, rotate: -30 },
      },
      yaxis: [
        { labels: { style: { colors: '#94a3b8', fontSize: '11px' } } },
        { opposite: true, labels: { style: { colors: '#94a3b8', fontSize: '11px' } } },
      ],
      tooltip: { theme: 'dark' as const, shared: true, intersect: false, y: { formatter: (v: number) => full(v) } },
      legend: { position: 'bottom' as const, labels: { colors: '#94a3b8' } },
    },
    series: [
      { name: t('admin.dashboard.kpi.conversations'), type: 'column', data: platformConvSeries.value.buckets.map((b) => b.value) },
      { name: t('admin.dashboard.kpi.leads'), type: 'line', data: platformLeadSeries.value.buckets.map((b) => b.value) },
    ],
  }
})

function goToBotCustomers(botId: string): void {
  const bot = byBot.value.find((b) => b.botId === botId)
  if (!bot) return
  router.push(`/superadmin/companies/${bot.tenantId}/customers?botId=${botId}`)
}

const customersByBotChart = computed(() => {
  if (byBot.value.length === 0) return null
  return {
    options: {
      chart: {
        id: 'customers-by-bot',
        type: 'bar' as const,
        toolbar: { show: false },
        animations: { enabled: false },
        background: 'transparent',
        events: {
          dataPointSelection: (
            _e: unknown,
            _ctx: unknown,
            cfg: { dataPointIndex: number },
          ) => {
            const bot = byBot.value[cfg.dataPointIndex]
            if (bot) goToBotCustomers(bot.botId)
          },
        },
      },
      theme: { mode: 'dark' as const },
      colors: [CHART_COLOR_CUSTOMERS],
      plotOptions: {
        bar: { columnWidth: '55%', borderRadius: 6, distributed: false, dataLabels: { position: 'top' } },
      },
      dataLabels: {
        enabled: true,
        offsetY: -20,
        style: { fontSize: '11px', colors: ['#cbd5e1'], fontWeight: 600 },
        formatter: (v: number) => full(v),
      },
      grid: { borderColor: '#334155', strokeDashArray: 4 },
      xaxis: {
        categories: byBot.value.map((b) => `${b.botName} · ${b.tenantSlug}`),
        labels: {
          style: { colors: '#94a3b8', fontSize: '11px' },
          rotate: -30,
          hideOverlappingLabels: false,
          trim: true,
        },
      },
      yaxis: {
        labels: { style: { colors: '#94a3b8', fontSize: '11px' }, formatter: (v: number) => full(v) },
        title: {
          text: t('admin.dashboard.platform.byBot.yAxis'),
          style: { color: '#94a3b8', fontSize: '11px', fontWeight: 500 },
        },
      },
      tooltip: {
        theme: 'dark' as const,
        custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
          const b = byBot.value[dataPointIndex]
          if (!b) return ''
          return `
            <div style="padding:8px 10px;font-size:12px;">
              <div style="font-weight:600;color:#e2e8f0;">${b.botName}</div>
              <div style="color:#94a3b8;font-size:11px;">${b.tenantName}</div>
              <div style="margin-top:6px;color:#cbd5e1;">${full(b.customersUnique)} ${t('admin.dashboard.platform.byBot.tooltipCustomers')}</div>
              <div style="color:#94a3b8;font-size:11px;margin-top:4px;">${t('admin.dashboard.platform.byBot.tooltipClickHint')}</div>
            </div>
          `
        },
      },
      states: {
        hover: { filter: { type: 'lighten', value: 0.1 } },
        active: { filter: { type: 'darken', value: 0.35 } },
      },
      legend: { show: false },
    },
    series: [
      {
        name: t('admin.dashboard.platform.byBot.series'),
        data: byBot.value.map((b) => b.customersUnique),
      },
    ],
  }
})

const groupedByTenant = computed<Array<{
  tenantId: string
  tenantName: string
  tenantSlug: string
  bots: PlatformByBotRow[]
  totals: {
    customers: number
    conversations: number
    messages: number
    meetings: number
  }
}>>(() => {
  const map = new Map<string, PlatformByBotRow[]>()
  for (const b of byBot.value) {
    const list = map.get(b.tenantId) ?? []
    list.push(b)
    map.set(b.tenantId, list)
  }
  return Array.from(map.entries()).map(([tenantId, bots]) => ({
    tenantId,
    tenantName: bots[0].tenantName,
    tenantSlug: bots[0].tenantSlug,
    bots,
    totals: {
      customers: bots.reduce((a, b) => a + b.customersUnique, 0),
      conversations: bots.reduce((a, b) => a + b.conversations, 0),
      messages: bots.reduce((a, b) => a + b.messagesSentByBot, 0),
      meetings: bots.reduce((a, b) => a + b.meetingsScheduled, 0),
    },
  })).sort((a, b) => b.totals.customers - a.totals.customers)
})

await load()
</script>

<template>
  <div>
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
          <span class="size-1.5 rounded-full bg-indigo-400" />
          {{ $t('superadmin.dashboard.kicker') }}
        </span>
        <h1 class="mt-2 text-2xl font-semibold text-slate-100 tracking-tight">{{ $t('superadmin.dashboard.title') }}</h1>
        <p class="mt-1 text-sm text-slate-400 max-w-2xl">
          {{ $t('superadmin.dashboard.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition"
          :disabled="loading"
          @click="load"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" :class="loading ? 'animate-spin' : ''" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {{ $t('superadmin.dashboard.reload') }}
        </button>
        <NuxtLink
          to="/superadmin/companies"
          class="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100 transition"
        >
          {{ $t('superadmin.dashboard.allCompanies') }}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </NuxtLink>
      </div>
    </header>

    <p v-if="error" class="mt-4 rounded-2xl border border-danger-800 bg-danger-950/80 p-3 text-sm text-danger-300">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <template v-else-if="data">
      <!-- ── HERO ROW: Messages + Conversations stacked (col-4) | Overview chart (col-8) ─── -->
      <section class="mt-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-4 flex flex-col gap-4">
            <div class="rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/60 p-5 flex flex-col">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    {{ $t('admin.dashboard.kpi.messagesSentByBot') }}
                  </p>
                  <p class="text-[11px] text-slate-500 mt-0.5">{{ $t('admin.dashboard.kpi.messagesSentByBotHint') }}</p>
                </div>
                <div class="shrink-0 flex size-9 items-center justify-center rounded-xl ring-1 ring-slate-700" :style="{ backgroundColor: `${CHART_COLOR_PRIMARY}25`, color: CHART_COLOR_PRIMARY }" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
              </div>
              <div class="mt-3 flex items-baseline gap-3">
                <p class="text-4xl font-bold text-slate-100 tabular-nums leading-none">
                  {{ full(platformSummary?.totals.messagesSentByBot ?? 0) }}
                </p>
                <span
                  v-if="platformSummary && deltaPct(platformSummary.totals.messagesSentByBot, platformSummary.previous.messagesSentByBot)"
                  class="text-xs font-semibold"
                  :class="deltaPct(platformSummary.totals.messagesSentByBot, platformSummary.previous.messagesSentByBot)?.positive ? 'text-emerald-400' : 'text-danger-400'"
                >
                  {{ deltaPct(platformSummary.totals.messagesSentByBot, platformSummary.previous.messagesSentByBot)?.text }}
                </span>
              </div>
              <ClientOnly>
                <div class="mt-3 -mx-2 min-h-[70px]">
                  <apexchart type="area" height="80" :options="heroMsgsSpark.options" :series="heroMsgsSpark.series" />
                </div>
              </ClientOnly>
            </div>

            <div class="rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/60 p-5 flex flex-col">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    {{ $t('admin.dashboard.kpi.conversations') }}
                  </p>
                  <p class="text-[11px] text-slate-500 mt-0.5">{{ $t('superadmin.dashboard.stat.conversationsHint') }}</p>
                </div>
                <div class="shrink-0 flex size-9 items-center justify-center rounded-xl ring-1 ring-slate-700" :style="{ backgroundColor: `${CHART_COLOR_ACCENT}25`, color: CHART_COLOR_ACCENT }" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                </div>
              </div>
              <div class="mt-3 flex items-baseline gap-3">
                <p class="text-4xl font-bold text-slate-100 tabular-nums leading-none">
                  {{ full(platformSummary?.totals.conversationsTotal ?? 0) }}
                </p>
                <span
                  v-if="platformSummary && deltaPct(platformSummary.totals.conversationsTotal, platformSummary.previous.conversationsTotal)"
                  class="text-xs font-semibold"
                  :class="deltaPct(platformSummary.totals.conversationsTotal, platformSummary.previous.conversationsTotal)?.positive ? 'text-emerald-400' : 'text-danger-400'"
                >
                  {{ deltaPct(platformSummary.totals.conversationsTotal, platformSummary.previous.conversationsTotal)?.text }}
                </span>
              </div>
              <ClientOnly>
                <div class="mt-3 -mx-2 min-h-[70px]">
                  <apexchart type="area" height="80" :options="heroConvSpark.options" :series="heroConvSpark.series" />
                </div>
              </ClientOnly>
            </div>
          </div>

          <div class="lg:col-span-8">
            <div class="rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/60 p-5 h-full">
              <div class="mb-3">
                <h3 class="text-sm font-semibold text-slate-100">{{ $t('superadmin.dashboard.overviewChart.title') }}</h3>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ $t('superadmin.dashboard.overviewChart.subtitle') }}</p>
              </div>
              <ClientOnly v-if="overviewChart">
                <apexchart type="bar" height="360" :options="overviewChart.options" :series="overviewChart.series" />
              </ClientOnly>
              <div v-else class="h-72 rounded-xl bg-slate-800/60 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      <section class="mt-8">
        <h2 class="text-[11px] uppercase tracking-wider font-semibold text-slate-400">{{ $t('superadmin.dashboard.groupOperations') }}</h2>
        <div class="mt-2">
          <SuperadminBillingSweepCard />
        </div>
      </section>
    </template>

    <section class="mt-10">
      <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {{ $t('admin.dashboard.platform.title') }}
          </h2>
          <p class="text-sm text-slate-400 mt-0.5">{{ $t('admin.dashboard.platform.subtitle') }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2">
            <label class="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              {{ $t('admin.dashboard.sections.groupBy') }}
            </label>
            <select
              v-model="activityInterval"
              class="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
            >
              <option value="day">{{ $t('admin.dashboard.interval.day') }}</option>
              <option value="month">{{ $t('admin.dashboard.interval.month') }}</option>
              <option value="year">{{ $t('admin.dashboard.interval.year') }}</option>
            </select>
          </div>
          <DashboardRangePicker v-model="range" />
        </div>
      </div>

      <div v-if="platformLoading && !platformSummary" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="h-32 rounded-2xl bg-slate-800/60 animate-pulse" />
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="kpi in platformKpis"
          :key="kpi.key"
          class="rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-4 flex flex-col"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              {{ kpi.label }}
            </div>
            <span
              v-if="kpi.delta"
              class="text-[11px] font-semibold"
              :class="kpi.delta.positive ? 'text-emerald-400' : 'text-danger-400'"
            >
              {{ kpi.delta.text }}
            </span>
          </div>
          <div class="mt-2 text-3xl font-semibold text-slate-100 tabular-nums">{{ full(kpi.value) }}</div>
          <ClientOnly v-if="kpi.spark.length >= 2">
            <div class="-mx-1 mt-2">
              <apexchart
                type="area"
                height="42"
                :options="darkSparkline(kpi.spark, kpi.color).options"
                :series="darkSparkline(kpi.spark, kpi.color).series"
              />
            </div>
          </ClientOnly>
        </div>
      </div>

      <div class="mt-4 rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-4">
        <div class="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 class="text-sm font-semibold text-slate-100">{{ $t('admin.dashboard.platform.byBot.title') }}</h3>
            <p class="text-[11px] text-slate-400 mt-0.5">{{ $t('admin.dashboard.platform.byBot.subtitle') }}</p>
          </div>
          <span class="text-[10px] text-slate-500 italic">
            {{ $t('admin.dashboard.platform.byBot.hint') }}
          </span>
        </div>
        <div v-if="platformLoading && !customersByBotChart" class="h-72 rounded-xl bg-slate-800/60 animate-pulse" />
        <div
          v-else-if="!customersByBotChart"
          class="h-72 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500"
        >
          {{ $t('admin.dashboard.chart.emptyDefault') }}
        </div>
        <ClientOnly v-else>
          <apexchart
            :key="`by-bot-${byBot.length}-${byBot.map(b => b.customersUnique).join(',')}`"
            type="bar"
            height="360"
            :options="customersByBotChart.options"
            :series="customersByBotChart.series"
          />
        </ClientOnly>
      </div>

      <div class="mt-4 rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-4">
        <div class="mb-2">
          <h3 class="text-sm font-semibold text-slate-100">{{ $t('admin.dashboard.chart.mixedTitle') }}</h3>
          <p class="text-[11px] text-slate-400 mt-0.5">{{ $t('admin.dashboard.chart.mixedSubtitle') }}</p>
        </div>
        <div v-if="platformLoading && !mixedChart" class="h-64 rounded-xl bg-slate-800/60 animate-pulse" />
        <ClientOnly v-else-if="mixedChart">
          <apexchart
            :key="`mixed-${activityInterval}-${platformConvSeries?.buckets.length ?? 0}`"
            type="line"
            height="320"
            :options="mixedChart.options"
            :series="mixedChart.series"
          />
        </ClientOnly>
      </div>

      <div class="mt-4 rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-4">
        <div class="mb-3">
          <h3 class="text-sm font-semibold text-slate-100">{{ $t('admin.dashboard.platform.tableTitle') }}</h3>
          <p class="text-[11px] text-slate-400 mt-0.5">{{ $t('admin.dashboard.platform.tableSubtitle') }}</p>
        </div>
        <div v-if="platformLoading && groupedByTenant.length === 0" class="h-40 rounded-xl bg-slate-800/60 animate-pulse" />
        <div v-else-if="groupedByTenant.length > 0" class="space-y-4">
          <div
            v-for="group in groupedByTenant"
            :key="group.tenantId"
            class="rounded-xl border border-slate-800/70 overflow-hidden"
          >
            <div class="flex items-center justify-between gap-3 px-4 py-3 bg-slate-800/40">
              <div>
                <NuxtLink
                  :to="`/superadmin/companies/${group.tenantId}`"
                  class="text-sm font-semibold text-slate-100 hover:underline"
                >
                  {{ group.tenantName }}
                </NuxtLink>
                <div class="text-[11px] text-slate-500 font-mono">{{ group.tenantSlug }}</div>
              </div>
              <div class="flex items-center gap-4 text-[11px] text-slate-400">
                <span>{{ group.bots.length }} {{ $t('admin.dashboard.platform.byBot.bots') }}</span>
                <span>
                  <span class="text-slate-200 font-mono">{{ full(group.totals.customers) }}</span>
                  {{ $t('admin.dashboard.platform.byBot.customers') }}
                </span>
                <span>
                  <span class="text-slate-200 font-mono">{{ full(group.totals.conversations) }}</span>
                  {{ $t('admin.dashboard.platform.byBot.conversations') }}
                </span>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr>
                    <th class="text-left px-4 py-2">{{ $t('admin.dashboard.platform.byBot.colBot') }}</th>
                    <th class="text-right px-4 py-2">{{ $t('admin.dashboard.platform.byBot.colCustomers') }}</th>
                    <th class="text-right px-4 py-2">{{ $t('admin.dashboard.platform.byBot.colConversations') }}</th>
                    <th class="text-right px-4 py-2">{{ $t('admin.dashboard.platform.byBot.colMessages') }}</th>
                    <th class="text-right px-4 py-2">{{ $t('admin.dashboard.platform.byBot.colLeads') }}</th>
                    <th class="text-right px-4 py-2">{{ $t('admin.dashboard.platform.byBot.colMeetings') }}</th>
                    <th class="text-right px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800">
                  <tr v-for="b in group.bots" :key="b.botId" class="hover:bg-slate-800/30">
                    <td class="px-4 py-2 text-slate-200">
                      <div class="flex items-center gap-2">
                        <span
                          class="inline-block size-1.5 rounded-full"
                          :class="b.botActive ? 'bg-emerald-400' : 'bg-slate-600'"
                          :title="b.botActive ? 'activo' : 'inactivo'"
                        />
                        <NuxtLink
                          :to="`/superadmin/companies/${b.tenantId}/bots/${b.botId}`"
                          class="font-medium hover:underline"
                        >
                          {{ b.botName }}
                        </NuxtLink>
                      </div>
                    </td>
                    <td class="px-4 py-2 text-right text-slate-100 font-mono">{{ full(b.customersUnique) }}</td>
                    <td class="px-4 py-2 text-right text-slate-300 font-mono">{{ full(b.conversations) }}</td>
                    <td class="px-4 py-2 text-right text-slate-300 font-mono">{{ full(b.messagesSentByBot) }}</td>
                    <td class="px-4 py-2 text-right text-slate-300 font-mono">{{ full(b.leads) }}</td>
                    <td class="px-4 py-2 text-right text-slate-300 font-mono">{{ full(b.meetingsScheduled) }}</td>
                    <td class="px-4 py-2 text-right">
                      <button
                        type="button"
                        class="text-[11px] text-indigo-300 hover:text-indigo-200 hover:underline"
                        @click="goToBotCustomers(b.botId)"
                      >
                        {{ $t('admin.dashboard.platform.byBot.viewCustomers') }} →
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-slate-500 py-6 text-center">
          {{ $t('admin.dashboard.chart.emptyDefault') }}
        </div>
      </div>

      <div class="mt-4 rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-4">
        <div class="mb-3">
          <h3 class="text-sm font-semibold text-slate-100">{{ $t('admin.dashboard.platform.tenantsTableTitle') }}</h3>
        </div>
        <div v-if="platformLoading && byTenant.length === 0" class="h-40 rounded-xl bg-slate-800/60 animate-pulse" />
        <div v-else-if="byTenant.length > 0" class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
              <tr>
                <th class="text-left px-3 py-2">{{ $t('admin.dashboard.platform.col.tenant') }}</th>
                <th class="text-right px-3 py-2">{{ $t('admin.dashboard.platform.col.bots') }}</th>
                <th class="text-right px-3 py-2">{{ $t('admin.dashboard.platform.col.messages') }}</th>
                <th class="text-right px-3 py-2">{{ $t('admin.dashboard.platform.col.conversations') }}</th>
                <th class="text-right px-3 py-2">{{ $t('admin.dashboard.platform.col.leads') }}</th>
                <th class="text-right px-3 py-2">{{ $t('admin.dashboard.platform.col.conversion') }}</th>
                <th class="text-right px-3 py-2">{{ $t('admin.dashboard.platform.col.meetingsScheduled') }}</th>
                <th class="text-right px-3 py-2">{{ $t('admin.dashboard.platform.col.meetingsCancelled') }}</th>
                <th class="text-right px-3 py-2">{{ $t('admin.dashboard.platform.col.cancellationRate') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr v-for="r in byTenant" :key="r.tenantId" class="hover:bg-slate-800/40">
                <td class="px-3 py-2 text-slate-100">
                  <NuxtLink :to="`/superadmin/companies/${r.tenantId}`" class="font-medium hover:underline">
                    {{ r.tenantName }}
                  </NuxtLink>
                  <div class="text-[11px] text-slate-500">{{ r.tenantSlug }}</div>
                </td>
                <td class="px-3 py-2 text-right text-slate-300 font-mono">{{ r.botsActive }} / {{ r.botsTotal }}</td>
                <td class="px-3 py-2 text-right text-slate-100 font-mono">{{ full(r.messagesSentByBot) }}</td>
                <td class="px-3 py-2 text-right text-slate-300 font-mono">{{ full(r.conversations) }}</td>
                <td class="px-3 py-2 text-right text-slate-300 font-mono">{{ full(r.leads) }}</td>
                <td class="px-3 py-2 text-right text-slate-300 font-mono">{{ percent(r.conversionRate, 0) }}</td>
                <td class="px-3 py-2 text-right text-slate-300 font-mono">{{ full(r.meetingsScheduled) }}</td>
                <td class="px-3 py-2 text-right text-slate-300 font-mono">{{ full(r.meetingsCancelled) }}</td>
                <td class="px-3 py-2 text-right text-slate-300 font-mono">{{ percent(r.cancellationRate, 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-xs text-slate-500 py-6 text-center">
          {{ $t('admin.dashboard.chart.emptyDefault') }}
        </div>
      </div>
    </section>
  </div>
</template>
