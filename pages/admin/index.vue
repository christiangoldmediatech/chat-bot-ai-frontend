<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { DashboardSummary } from '~/types/dashboard'
import type {
  MeetingsByCustomerResponse,
  MeetingsSummaryResponse,
  MetricsSummaryResponse,
  MetricsTimeseriesResponse,
  TodayTimelineResponse,
} from '~/types/dashboard'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const { t } = useI18n()
const legacy = useDashboard()
const metrics = useTenantDashboardMetrics()
const { percent, day, full } = useDateFormat()

const route = useRoute()

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

const initialFrom = typeof route.query.from === 'string' && route.query.from
  ? route.query.from
  : isoStart(daysAgo(29))
const initialTo = typeof route.query.to === 'string' && route.query.to
  ? route.query.to
  : isoEnd(new Date())

const range = ref<{ from: string; to: string }>({
  from: initialFrom,
  to: initialTo,
})
const activityInterval = ref<'day' | 'month' | 'year'>('day')
const meetingsInterval = ref<'day' | 'month' | 'year'>('day')

const legacyData = ref<DashboardSummary | null>(null)
const summary = ref<MetricsSummaryResponse | null>(null)
const conversationsSeries = ref<MetricsTimeseriesResponse | null>(null)
const leadsSeries = ref<MetricsTimeseriesResponse | null>(null)
const messagesSentSeries = ref<MetricsTimeseriesResponse | null>(null)
const meetingsScheduledSeries = ref<MetricsTimeseriesResponse | null>(null)
const meetingsCancelledSeries = ref<MetricsTimeseriesResponse | null>(null)
const today = ref<TodayTimelineResponse | null>(null)
const meetingsSummary = ref<MeetingsSummaryResponse | null>(null)
const meetingsByCustomer = ref<MeetingsByCustomerResponse | null>(null)
const meetingsSort = ref<'scheduled' | 'cancelled' | 'cancellationRate' | 'lastMeetingAt'>('scheduled')
const meetingsPage = ref(1)

const ZERO_TOTALS = {
  messagesSentByBot: 0,
  messagesSentByHuman: 0,
  messagesReceived: 0,
  conversationsTotal: 0,
  conversationsOpen: 0,
  conversationsHandledByHuman: 0,
  uniqueCustomers: 0,
  leadsTotal: 0,
  leadsNew: 0,
  leadsQualified: 0,
  leadsWon: 0,
  meetingsScheduled: 0,
  meetingsCancelled: 0,
  meetingsNoShow: 0,
  meetingsUpcoming: 0,
}
const totals = computed(() => summary.value?.totals ?? ZERO_TOTALS)
const previousTotals = computed(() => summary.value?.previous ?? ZERO_TOTALS)

const loading = ref(true)
const chartsLoading = ref(true)
const meetingsLoading = ref(true)
const error = ref<string | null>(null)

async function loadHeader(): Promise<void> {
  loading.value = true
  try {
    const [legacyRes, summaryRes, todayRes] = await Promise.all([
      legacy.summary().catch(() => null),
      metrics.summary(range.value),
      metrics.todayTimeline().catch(() => null),
    ])
    legacyData.value = legacyRes
    summary.value = summaryRes
    today.value = todayRes
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function loadCharts(): Promise<void> {
  chartsLoading.value = true
  try {
    const q = { ...range.value, interval: activityInterval.value }
    const [conv, leads, msgs] = await Promise.all([
      metrics.timeseries('conversations', q),
      metrics.timeseries('leads', q),
      metrics.timeseries('messagesSentByBot', q).catch(() => null),
    ])
    conversationsSeries.value = conv
    leadsSeries.value = leads
    messagesSentSeries.value = msgs
  } finally {
    chartsLoading.value = false
  }
}

async function loadMeetings(): Promise<void> {
  meetingsLoading.value = true
  try {
    const meetingsRange = { ...range.value, interval: meetingsInterval.value }
    const [s, sched, canc, byCustomer] = await Promise.all([
      metrics.meetingsSummary(range.value),
      metrics.timeseries('meetingsHeld', meetingsRange),
      metrics.timeseries('meetingsCancelled', meetingsRange),
      metrics.meetingsByCustomer({
        ...range.value,
        page: meetingsPage.value,
        pageSize: 25,
        sort: meetingsSort.value,
      }),
    ])
    meetingsSummary.value = s
    meetingsScheduledSeries.value = sched
    meetingsCancelledSeries.value = canc
    meetingsByCustomer.value = byCustomer
  } finally {
    meetingsLoading.value = false
  }
}

watch(
  () => JSON.stringify(range.value),
  () => {
    if (!range.value.from || !range.value.to) return
    loadHeader()
    loadCharts()
    loadMeetings()
  },
  { immediate: true },
)
watch(activityInterval, () => {
  if (!range.value.from) return
  loadCharts()
})
watch([meetingsInterval, meetingsSort, meetingsPage], () => {
  if (!range.value.from) return
  loadMeetings()
})

const kpiConversationsHint = computed(() =>
  t('admin.dashboard.kpi.conversationsHint', { open: totals.value.conversationsOpen }),
)
const kpiLeadsHint = computed(() => {
  if (totals.value.conversationsTotal === 0) return t('admin.dashboard.kpi.leadsHint', { rate: '—' })
  return t('admin.dashboard.kpi.leadsHint', {
    rate: percent(totals.value.leadsTotal / totals.value.conversationsTotal, 0),
  })
})
const kpiMeetingsHint = computed(() => {
  const rate = totals.value.meetingsScheduled === 0
    ? 0
    : totals.value.meetingsCancelled / totals.value.meetingsScheduled
  return t('admin.dashboard.kpi.meetingsScheduledHint', {
    cancelled: totals.value.meetingsCancelled,
    rate: percent(rate, 0),
  })
})

const CHART_COLOR_CONVERSATIONS = '#0ea5e9'
const CHART_COLOR_LEADS = '#10b981'
const CHART_COLOR_SCHEDULED = '#6366f1'
const CHART_COLOR_CANCELLED = '#f43f5e'

function baseChartOptions(color: string) {
  return {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      fontFamily: 'inherit',
    },
    colors: [color],
    stroke: { curve: 'smooth' as const, width: 2 },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 4,
      padding: { left: 4, right: 4 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'category' as const,
      labels: { style: { colors: '#64748b', fontSize: '11px' }, rotate: -30 },
      axisBorder: { color: '#e2e8f0' },
      axisTicks: { color: '#e2e8f0' },
    },
    yaxis: {
      labels: { style: { colors: '#64748b', fontSize: '11px' }, formatter: (v: number) => full(v) },
    },
    tooltip: {
      theme: 'light' as const,
      y: { formatter: (v: number) => full(v) },
    },
  }
}

const conversationsChart = computed(() => {
  if (!conversationsSeries.value) return null
  return {
    options: {
      ...baseChartOptions(CHART_COLOR_CONVERSATIONS),
      xaxis: {
        ...baseChartOptions(CHART_COLOR_CONVERSATIONS).xaxis,
        categories: conversationsSeries.value.buckets.map((b) => b.date),
      },
    },
    series: [
      {
        name: t('admin.dashboard.kpi.conversations'),
        data: conversationsSeries.value.buckets.map((b) => b.value),
      },
    ],
  }
})

const leadsChart = computed(() => {
  if (!leadsSeries.value) return null
  return {
    options: {
      ...baseChartOptions(CHART_COLOR_LEADS),
      xaxis: {
        ...baseChartOptions(CHART_COLOR_LEADS).xaxis,
        categories: leadsSeries.value.buckets.map((b) => b.date),
      },
    },
    series: [
      {
        name: t('admin.dashboard.kpi.leads'),
        data: leadsSeries.value.buckets.map((b) => b.value),
      },
    ],
  }
})

const mixedChart = computed(() => {
  if (!conversationsSeries.value || !leadsSeries.value) return null
  return {
    options: {
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: false },
        fontFamily: 'inherit',
      },
      colors: [CHART_COLOR_CONVERSATIONS, CHART_COLOR_LEADS],
      stroke: { curve: 'smooth' as const, width: [0, 3] },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
      dataLabels: { enabled: false },
      xaxis: {
        type: 'category' as const,
        categories: conversationsSeries.value.buckets.map((b) => b.date),
        labels: { style: { colors: '#64748b', fontSize: '11px' }, rotate: -30 },
      },
      yaxis: [
        {
          seriesName: t('admin.dashboard.kpi.conversations'),
          labels: { style: { colors: '#64748b', fontSize: '11px' } },
        },
        {
          seriesName: t('admin.dashboard.kpi.leads'),
          opposite: true,
          labels: { style: { colors: '#64748b', fontSize: '11px' } },
        },
      ],
      tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => full(v) } },
      legend: { position: 'bottom' as const },
    },
    series: [
      {
        name: t('admin.dashboard.kpi.conversations'),
        type: 'column',
        data: conversationsSeries.value.buckets.map((b) => b.value),
      },
      {
        name: t('admin.dashboard.kpi.leads'),
        type: 'line',
        data: leadsSeries.value.buckets.map((b) => b.value),
      },
    ],
  }
})

const meetingsChart = computed(() => {
  if (!meetingsScheduledSeries.value || !meetingsCancelledSeries.value) return null
  const categories = meetingsScheduledSeries.value.buckets.map((b) => b.date)
  return {
    options: {
      chart: {
        id: 'meetings-bar',
        type: 'bar' as const,
        toolbar: { show: false },
        animations: { enabled: false },
        fontFamily: 'inherit',
      },
      colors: [CHART_COLOR_SCHEDULED, CHART_COLOR_CANCELLED],
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
      dataLabels: { enabled: false },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
      xaxis: {
        categories,
        labels: { style: { colors: '#64748b', fontSize: '11px' }, rotate: -30 },
      },
      yaxis: { labels: { style: { colors: '#64748b', fontSize: '11px' } } },
      tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => full(v) } },
      legend: { position: 'bottom' as const },
    },
    series: [
      {
        name: t('admin.dashboard.meetings.col.held'),
        data: meetingsScheduledSeries.value.buckets.map((b) => b.value),
      },
      {
        name: t('admin.dashboard.meetings.col.cancelled'),
        data: meetingsCancelledSeries.value.buckets.map((b) => b.value),
      },
    ],
  }
})
</script>

<template>
  <div>
    <header class="flex flex-wrap items-start justify-between gap-4 sticky top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0 sm:mb-2 backdrop-blur-sm">
      <div class="min-w-0">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
          {{ $t('admin.dashboard.title') }}
        </h1>
        <p class="mt-1 text-sm text-slate-500 max-w-2xl">{{ $t('admin.dashboard.subtitle') }}</p>
      </div>
      <DashboardRangePicker v-model="range" />
    </header>

    <p v-if="error" class="mt-4 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <!-- ── SECCIÓN ACTIVITY (charts prominentes primero) ─────────────────── -->
    <section class="mt-6">
      <div class="flex items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-2">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {{ $t('admin.dashboard.sections.activity') }}
          </h2>
          <span class="text-[10px] text-slate-400">
            {{ $t('admin.dashboard.sections.appliesToBelow') }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
            {{ $t('admin.dashboard.sections.groupBy') }}
          </label>
          <select
            v-model="activityInterval"
            class="rounded-lg border border-slate-200 bg-white/70 backdrop-blur-md px-2 py-1.5 text-xs"
          >
            <option value="day">{{ $t('admin.dashboard.interval.day') }}</option>
            <option value="month">{{ $t('admin.dashboard.interval.month') }}</option>
            <option value="year">{{ $t('admin.dashboard.interval.year') }}</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="lg:col-span-4 flex flex-col gap-4">
          <DashboardHeroKpiCard
            :label="$t('admin.dashboard.kpi.messagesSentByBot')"
            :hint="$t('admin.dashboard.kpi.messagesSentByBotHint')"
            :value="totals.messagesSentByBot"
            :previous-value="previousTotals.messagesSentByBot"
            :sparkline="messagesSentSeries?.buckets.map(b => b.value) ?? []"
            icon="chat"
            tone="primary"
          />
          <DashboardHeroKpiCard
            :label="$t('admin.dashboardRedesign.hero.upcomingTitle')"
            :hint="$t('admin.dashboardRedesign.hero.upcomingHint')"
            :value="totals.meetingsUpcoming"
            :previous-value="previousTotals.meetingsUpcoming"
            :sparkline="meetingsScheduledSeries?.buckets.map(b => b.value) ?? []"
            icon="calendar"
            tone="accent"
          />
        </div>
        <div class="lg:col-span-8">
          <DashboardActivityCompareCard
            :from="range.from"
            :to="range.to"
            :interval="activityInterval"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        <div class="lg:col-span-5">
          <DashboardServicesDonutCard :from="range.from" :to="range.to" />
        </div>
        <div class="lg:col-span-7">
          <DashboardLeadFunnelCard
            :total="totals.leadsTotal"
            :new_="totals.leadsNew"
            :qualified="totals.leadsQualified"
            :won="totals.leadsWon"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 mt-4">
        <DashboardAttendedBarCard
          :from="range.from"
          :to="range.to"
          :interval="activityInterval"
        />
      </div>
    </section>

    <!-- ── SECCIÓN RESUMEN (KPIs con sparklines + chart comparativo) ────── -->
    <section class="mt-8">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {{ $t('admin.dashboard.sections.summary') }}
      </h2>

      <div v-if="loading && !summary" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="h-32 rounded-2xl bg-slate-100/60 animate-pulse" />
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          :label="t('admin.dashboard.kpi.conversations')"
          :value="totals.conversationsTotal"
          :previous="previousTotals.conversationsTotal"
          :hint="kpiConversationsHint"
          tone="sky"
          to="/admin/conversations"
          :sparkline="conversationsSeries?.buckets.map(b => b.value) ?? []"
        />
        <KpiCard
          :label="t('admin.dashboard.kpi.leads')"
          :value="totals.leadsTotal"
          :previous="previousTotals.leadsTotal"
          :hint="kpiLeadsHint"
          tone="emerald"
          to="/admin/leads"
          :sparkline="leadsSeries?.buckets.map(b => b.value) ?? []"
        />
        <KpiCard
          :label="t('admin.dashboard.kpi.meetingsScheduled')"
          :value="totals.meetingsScheduled"
          :previous="previousTotals.meetingsScheduled"
          :hint="kpiMeetingsHint"
          tone="amber"
          to="/admin/meetings"
          :sparkline="meetingsScheduledSeries?.buckets.map(b => b.value) ?? []"
        />
        <KpiCard
          :label="t('admin.dashboard.kpi.uniqueCustomers')"
          :value="totals.uniqueCustomers"
          :previous="previousTotals.uniqueCustomers"
          :hint="t('admin.dashboard.kpi.uniqueCustomersHint')"
          tone="slate"
          to="/admin/customers"
        />
        <KpiCard
          :label="t('admin.dashboard.kpi.humanHandled')"
          :value="totals.conversationsHandledByHuman"
          :hint="t('admin.dashboard.kpi.humanHandledHint')"
          tone="rose"
          to="/admin/cases"
        />
        <KpiCard
          :label="t('admin.dashboard.kpi.leadsNew')"
          :value="totals.leadsNew"
          tone="slate"
          to="/admin/leads"
        />
        <KpiCard
          :label="t('admin.dashboard.kpi.leadsWon')"
          :value="totals.leadsWon"
          tone="emerald"
          to="/admin/leads"
        />
      </div>

      <div class="mt-4">
        <DashboardSummaryChartCard :totals="totals" :previous="previousTotals" />
      </div>
    </section>

    <section class="mt-8">
      <div class="grid grid-cols-1 gap-4">
        <TodayTimeline :data="today" :loading="loading" />
      </div>
    </section>

    <section class="mt-8">
      <div class="flex items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-2">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {{ $t('admin.dashboard.sections.meetings') }}
          </h2>
          <span class="text-[10px] text-slate-400">
            {{ $t('admin.dashboard.sections.appliesToBelow') }}
          </span>
        </div>
      </div>

      <div>
        <MeetingsByCustomerTable
          :data="meetingsByCustomer"
          :loading="meetingsLoading"
          :sort="meetingsSort"
          @update:sort="(v) => { meetingsSort = v; meetingsPage = 1 }"
          @update:page="(v) => meetingsPage = v"
        />
      </div>

      <div class="mt-6">
        <DashboardServicesPerformedBlock
          :from="range.from"
          :to="range.to"
        />
      </div>
    </section>

    <!-- ── SECCIÓN CONVERSACIONES RECIENTES (legacy) ──────────────────── -->
    <section v-if="legacyData" class="mt-8">
      <div class="flex items-end justify-between gap-3 flex-wrap mb-3">
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {{ $t('admin.dashboard.sections.conversations') }}
          </h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.dashboard.recentConversationsHint') }}</p>
        </div>
        <NuxtLink
          to="/admin/conversations"
          class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition"
        >
          {{ $t('admin.dashboard.viewAllConversations') }} →
        </NuxtLink>
      </div>
      <ConversationList
        :conversations="legacyData.recentConversations"
        :empty-label="t('admin.dashboard.noConversations')"
      />
    </section>
  </div>
</template>
