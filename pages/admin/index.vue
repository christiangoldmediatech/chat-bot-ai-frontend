<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  DashboardSummary,
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
const { percent } = useDateFormat()

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
const bottomTab = ref<'meetings' | 'services'>('meetings')

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
  meetingsNewChains: 0,
  meetingsReschedules: 0,
  meetingsCancelledChains: 0,
  meetingsRescheduledChains: 0,
  meetingsActiveChains: 0,
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
const kpiMeetingsNewHint = computed(() =>
  t('admin.dashboard.kpi.meetingsNewHint'),
)
const kpiMeetingsReschedulesHint = computed(() =>
  t('admin.dashboard.kpi.meetingsReschedulesHint'),
)
const kpiMeetingsCancelledHint = computed(() => {
  const rate = totals.value.meetingsNewChains === 0
    ? 0
    : totals.value.meetingsCancelledChains / totals.value.meetingsNewChains
  return t('admin.dashboard.kpi.meetingsCancelledHint', {
    rate: percent(rate, 0),
  })
})
const kpiMeetingsActiveHint = computed(() =>
  t('admin.dashboard.kpi.meetingsActiveHint'),
)

// Human-friendly summary of the active period filter. Rendered as a chip in
// the header so the user always knows what window they are looking at.
const activeRangeLabel = computed(() => {
  const from = range.value.from ? new Date(range.value.from) : null
  const to = range.value.to ? new Date(range.value.to) : null
  if (!from || !to) return t('admin.dashboard.activeFilter.all')
  const sameDay =
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth() &&
    from.getDate() === to.getDate()
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  return sameDay ? fmt(from) : `${fmt(from)} → ${fmt(to)}`
})

</script>

<template>
  <div class="dashboard-dense lg:h-full lg:min-h-0 lg:overflow-hidden lg:flex lg:flex-col -m-4 sm:-m-6 p-4 sm:p-6">
    <header class="flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div class="min-w-0">
        <h1 class="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 leading-tight">
          {{ $t('admin.dashboard.title') }}
        </h1>
        <p class="text-xs text-slate-500 max-w-2xl">{{ $t('admin.dashboard.subtitle') }}</p>
        <!-- Active-filter chip (bug fix 2026-09-17): always visible so a KPI
             like "2 canceladas" cannot be misread as an all-time total. -->
        <div class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-2.5 py-1 text-[11px] font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>{{ $t('admin.dashboard.activeFilter.periodLabel') }}:</span>
          <span class="font-semibold tabular-nums">{{ activeRangeLabel }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-[10px] uppercase tracking-wider font-semibold text-white/75">
          {{ $t('admin.dashboard.sections.groupBy') }}
        </label>
        <select
          v-model="activityInterval"
          class="rounded-lg border border-white/30 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm"
        >
          <option value="day">{{ $t('admin.dashboard.interval.day') }}</option>
          <option value="month">{{ $t('admin.dashboard.interval.month') }}</option>
          <option value="year">{{ $t('admin.dashboard.interval.year') }}</option>
        </select>
        <DashboardRangePicker v-model="range" />
      </div>
    </header>

    <p v-if="error" class="mt-2 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700 shrink-0">
      {{ error }}
    </p>

    <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:flex-1 lg:min-h-0">
      <div class="lg:col-span-8 lg:min-h-0 lg:grid lg:grid-rows-[minmax(0,1fr)_320px_minmax(0,1fr)] flex flex-col gap-3">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 lg:min-h-0">
          <div class="md:col-span-2 lg:min-h-0 h-[280px] md:h-[300px] lg:h-auto">
            <DashboardActivityCompareCard
              :from="range.from"
              :to="range.to"
              :interval="activityInterval"
              fill-height
            />
          </div>
          <div class="grid grid-cols-2 md:grid-cols-1 gap-3 lg:min-h-0">
            <KpiCard
              :label="t('admin.dashboard.kpi.conversations')"
              :value="totals.conversationsTotal"
              :previous="previousTotals.conversationsTotal"
              :hint="kpiConversationsHint"
              tone="sky"
              to="/admin/conversations"
              compact
            />
            <KpiCard
              :label="t('admin.dashboard.kpi.leads')"
              :value="totals.leadsTotal"
              :previous="previousTotals.leadsTotal"
              :hint="kpiLeadsHint"
              tone="emerald"
              to="/admin/leads"
              compact
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 lg:h-[320px] lg:min-h-[320px] lg:overflow-hidden">
          <div class="h-[280px] md:h-[300px] lg:h-full lg:min-h-0 lg:overflow-hidden">
            <DashboardAttendedBarCard
              :from="range.from"
              :to="range.to"
              :interval="activityInterval"
              fill-height
            />
          </div>
          <div class="h-[280px] md:h-[300px] lg:h-full lg:min-h-0 lg:overflow-hidden">
            <DashboardServicesDonutCard
              :from="range.from"
              :to="range.to"
              fill-height
            />
          </div>
        </div>

        <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-3 lg:min-h-0 flex flex-col">
          <header class="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
            <div class="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                class="rounded-lg px-2.5 sm:px-3 py-1 text-xs font-medium transition"
                :class="bottomTab === 'meetings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                @click="bottomTab = 'meetings'"
              >
                {{ $t('admin.dashboard.dense.tabMeetings') }}
                <span v-if="meetingsByCustomer" class="ml-1 text-[10px] text-slate-500 tabular-nums">({{ meetingsByCustomer.total }})</span>
              </button>
              <button
                type="button"
                class="rounded-lg px-2.5 sm:px-3 py-1 text-xs font-medium transition"
                :class="bottomTab === 'services' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                @click="bottomTab = 'services'"
              >
                {{ $t('admin.dashboard.dense.tabServices') }}
              </button>
            </div>
            <NuxtLink
              :to="bottomTab === 'meetings' ? '/admin/meetings' : '/admin/services'"
              class="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              {{ $t('admin.dashboard.dense.seeAll') }}
            </NuxtLink>
          </header>
          <div class="flex-1 min-h-0 lg:overflow-y-auto -mx-1 px-1">
            <MeetingsByCustomerTable
              v-if="bottomTab === 'meetings'"
              :data="meetingsByCustomer"
              :loading="meetingsLoading"
              :sort="meetingsSort"
              class="dense-embed"
              @update:sort="(v) => { meetingsSort = v; meetingsPage = 1 }"
              @update:page="(v) => meetingsPage = v"
            />
            <DashboardServicesPerformedBlock
              v-else
              :from="range.from"
              :to="range.to"
              class="dense-embed"
            />
          </div>
        </section>
      </div>

      <aside class="lg:col-span-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1 flex flex-col gap-3">
        <DashboardHeroKpiCard
          :label="$t('admin.dashboard.kpi.messagesSentByBot')"
          :hint="$t('admin.dashboard.kpi.messagesSentByBotHint')"
          :value="totals.messagesSentByBot"
          :previous-value="previousTotals.messagesSentByBot"
          :sparkline="messagesSentSeries?.buckets.map(b => b.value) ?? []"
          icon="chat"
          tone="primary"
          compact
        />
        <DashboardHeroKpiCard
          :label="$t('admin.dashboardRedesign.hero.upcomingTitle')"
          :hint="$t('admin.dashboardRedesign.hero.upcomingHint')"
          :value="totals.meetingsUpcoming"
          :previous-value="previousTotals.meetingsUpcoming"
          :sparkline="meetingsScheduledSeries?.buckets.map(b => b.value) ?? []"
          icon="calendar"
          tone="accent"
          compact
        />

        <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-3">
          <p class="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
            {{ $t('admin.dashboard.dense.moreKpis') }}
          </p>
          <div class="grid grid-cols-2 gap-2">
            <KpiCard
              :label="t('admin.dashboard.kpi.meetingsNew')"
              :value="totals.meetingsNewChains"
              :previous="previousTotals.meetingsNewChains"
              :hint="kpiMeetingsNewHint"
              tone="amber"
              to="/admin/meetings"
              compact
            />
            <KpiCard
              :label="t('admin.dashboard.kpi.meetingsReschedules')"
              :value="totals.meetingsReschedules"
              :previous="previousTotals.meetingsReschedules"
              :hint="kpiMeetingsReschedulesHint"
              tone="sky"
              to="/admin/meetings"
              compact
            />
            <KpiCard
              :label="t('admin.dashboard.kpi.meetingsCancelled')"
              :value="totals.meetingsCancelledChains"
              :previous="previousTotals.meetingsCancelledChains"
              :hint="kpiMeetingsCancelledHint"
              tone="rose"
              to="/admin/meetings"
              compact
            />
            <KpiCard
              :label="t('admin.dashboard.kpi.meetingsActive')"
              :value="totals.meetingsActiveChains"
              :previous="previousTotals.meetingsActiveChains"
              :hint="kpiMeetingsActiveHint"
              tone="emerald"
              to="/admin/meetings"
              compact
            />
            <KpiCard
              :label="t('admin.dashboard.kpi.uniqueCustomers')"
              :value="totals.uniqueCustomers"
              :previous="previousTotals.uniqueCustomers"
              :hint="t('admin.dashboard.kpi.uniqueCustomersHint')"
              tone="slate"
              to="/admin/customers"
              compact
            />
            <KpiCard
              :label="t('admin.dashboard.kpi.humanHandled')"
              :value="totals.conversationsHandledByHuman"
              :hint="t('admin.dashboard.kpi.humanHandledHint')"
              tone="rose"
              to="/admin/cases"
              compact
            />
          </div>
        </section>

        <DashboardLeadFunnelCard
          :total="totals.leadsTotal"
          :new_="totals.leadsNew"
          :qualified="totals.leadsQualified"
          :won="totals.leadsWon"
        />

        <TodayTimeline :data="today" :loading="loading" />

        <details class="group rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass">
          <summary class="cursor-pointer list-none flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-900">
            <span>{{ $t('admin.dashboard.dense.showSummary') }}</span>
            <span class="text-slate-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div class="px-2 pb-2">
            <DashboardSummaryChartCard :totals="totals" :previous="previousTotals" />
          </div>
        </details>

        <details v-if="legacyData" class="group rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass">
          <summary class="cursor-pointer list-none flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-900">
            <span>{{ $t('admin.dashboard.dense.showRecent') }}</span>
            <NuxtLink
              to="/admin/conversations"
              class="text-xs font-medium text-primary-600 hover:text-primary-700"
              @click.stop
            >
              {{ $t('admin.dashboard.viewAllConversations') }} →
            </NuxtLink>
          </summary>
          <div class="px-3 pb-3">
            <ConversationList
              :conversations="legacyData.recentConversations"
              :empty-label="t('admin.dashboard.noConversations')"
            />
          </div>
        </details>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.dashboard-dense :deep(.dense-embed) {
  background: transparent;
  box-shadow: none;
  --tw-ring-shadow: 0 0 #0000;
  padding: 0;
}
</style>
