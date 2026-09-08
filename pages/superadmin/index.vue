<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  MetricsSummaryResponse,
  MetricsTimeseriesResponse,
  PlatformByTenantRow,
  SuperadminDashboardSummary,
} from '~/types/dashboard'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const { superadminSummary } = useDashboard()
const metrics = usePlatformDashboardMetrics()
const { full, percent } = useDateFormat()
const { t } = useI18n()

const data = ref<SuperadminDashboardSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// New: platform-wide metrics with range picker.
const range = ref<{ from: string; to: string }>({
  from: '',
  to: '',
})
const activityInterval = ref<'day' | 'month' | 'year'>('day')
const platformSummary = ref<MetricsSummaryResponse | null>(null)
const platformConvSeries = ref<MetricsTimeseriesResponse | null>(null)
const platformLeadSeries = ref<MetricsTimeseriesResponse | null>(null)
const byTenant = ref<PlatformByTenantRow[]>([])
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
    const [s, conv, leads, byT] = await Promise.all([
      metrics.summary(range.value),
      metrics.timeseries('conversations', q),
      metrics.timeseries('leads', q),
      metrics.byTenant(range.value),
    ])
    platformSummary.value = s
    platformConvSeries.value = conv
    platformLeadSeries.value = leads
    byTenant.value = byT.rows
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    platformLoading.value = false
  }
}

watch(
  () => JSON.stringify(range.value) + activityInterval.value,
  () => loadPlatform(),
)

const CHART_COLOR_CONVERSATIONS = '#38bdf8'
const CHART_COLOR_LEADS = '#34d399'

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
        type: 'category' as const,
        categories: platformConvSeries.value.buckets.map((b) => b.date),
        labels: { style: { colors: '#94a3b8', fontSize: '11px' }, rotate: -30 },
      },
      yaxis: [
        { labels: { style: { colors: '#94a3b8', fontSize: '11px' } } },
        { opposite: true, labels: { style: { colors: '#94a3b8', fontSize: '11px' } } },
      ],
      tooltip: { theme: 'dark' as const, shared: true, y: { formatter: (v: number) => full(v) } },
      legend: { position: 'bottom' as const, labels: { colors: '#94a3b8' } },
    },
    series: [
      { name: t('admin.dashboard.kpi.conversations'), type: 'column', data: platformConvSeries.value.buckets.map((b) => b.value) },
      { name: t('admin.dashboard.kpi.leads'), type: 'line', data: platformLeadSeries.value.buckets.map((b) => b.value) },
    ],
  }
})

await load()
</script>

<template>
  <div>
    <!-- Hero header -->
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
      <!-- Tenants group -->
      <section class="mt-6">
        <h2 class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('superadmin.dashboard.groupTenants') }}</h2>
        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.companies')"
            icon="companies"
            tone="indigo"
            :value="data.totalCompanies"
            :hint="$t('superadmin.dashboard.stat.companiesHint', { active: data.activeCompanies, suspended: data.suspendedCompanies })"
          />
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.users')"
            icon="users"
            tone="emerald"
            :value="data.totalUsers"
            :hint="$t('superadmin.dashboard.stat.usersHint')"
          />
        </div>
      </section>

      <!-- Activity group -->
      <section class="mt-6">
        <h2 class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('superadmin.dashboard.groupActivity') }}</h2>
        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.bots')"
            icon="bots"
            tone="amber"
            :value="data.totalBots"
            :hint="$t('superadmin.dashboard.stat.botsHint', { n: data.activeBots })"
          />
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.conversations')"
            icon="conversations"
            tone="indigo"
            :value="data.totalConversations"
            :hint="$t('superadmin.dashboard.stat.conversationsHint')"
          />
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.documents')"
            icon="documents"
            tone="rose"
            :value="data.totalDocuments"
            :hint="$t('superadmin.dashboard.stat.documentsHint')"
          />
        </div>
      </section>

      <!-- Commercial group (leads) -->
      <section class="mt-6">
        <h2 class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('superadmin.dashboard.groupCommercial') }}</h2>
        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.leadsTotal')"
            icon="leads"
            tone="indigo"
            :value="data.totalLeads"
            :hint="$t('superadmin.dashboard.stat.leadsTotalHint')"
          />
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.leadsNew')"
            icon="leads"
            tone="sky"
            :value="data.newLeads"
            :hint="$t('superadmin.dashboard.stat.leadsNewHint')"
          />
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.leadsWon')"
            icon="leads"
            tone="emerald"
            :value="data.wonLeads"
            :hint="$t('superadmin.dashboard.stat.leadsWonHint')"
          />
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.leadsCrmFailed')"
            icon="leads"
            tone="rose"
            :value="data.failedCrmSyncs"
            :hint="$t('superadmin.dashboard.stat.leadsCrmFailedHint')"
          />
        </div>
      </section>

      <!-- Operations -->
      <section class="mt-8">
        <h2 class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('superadmin.dashboard.groupOperations') }}</h2>
        <div class="mt-2">
          <SuperadminBillingSweepCard />
        </div>
      </section>

      <!-- Recent companies -->
      <section class="mt-8">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-slate-100">{{ $t('superadmin.dashboard.recent.title') }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('superadmin.dashboard.recent.subtitle') }}</p>
          </div>
          <NuxtLink to="/superadmin/companies" class="text-sm text-slate-400 hover:text-slate-200 inline-flex items-center gap-1">
            {{ $t('superadmin.dashboard.recent.viewAll') }}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </NuxtLink>
        </div>

        <div
          v-if="data.recentCompanies.length > 0"
          class="mt-3 rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg overflow-hidden"
        >
          <ul class="divide-y divide-slate-800">
            <li v-for="c in data.recentCompanies" :key="c.id">
              <NuxtLink
                :to="`/superadmin/companies/${c.id}`"
                class="group flex items-center gap-4 px-4 py-3.5 hover:bg-slate-800/40 transition"
              >
                <!-- Avatar -->
                <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-semibold text-sm ring-1 ring-slate-700">
                  {{ c.name.charAt(0).toUpperCase() }}
                </div>
                <!-- Identity -->
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-slate-100 truncate group-hover:text-white">{{ c.name }}</div>
                  <div class="text-xs text-slate-500 font-mono truncate">{{ c.slug }}</div>
                </div>
                <!-- Created -->
                <div class="hidden sm:flex flex-col items-end text-xs text-slate-500">
                  <span>{{ new Date(c.createdAt).toLocaleDateString() }}</span>
                  <span class="text-[11px] mt-0.5">{{ new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
                </div>
                <!-- Arrow -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-slate-500 group-hover:text-slate-300 transition" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="mt-3 rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-8 text-center"
        >
          <div class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-slate-400" aria-hidden="true">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
            </svg>
          </div>
          <p class="mt-3 text-sm text-slate-300 font-medium">{{ $t('superadmin.dashboard.recent.emptyTitle') }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ $t('superadmin.dashboard.recent.emptyBody') }}</p>
        </div>
      </section>
    </template>

    <!-- ── PLATFORM METRICS (v2) ─────────────────────────────────────── -->
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

      <div v-if="platformLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-slate-800/60 animate-pulse" />
      </div>

      <div v-else-if="platformSummary" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-4">
          <div class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            {{ $t('admin.dashboard.kpi.messagesSentByBot') }}
          </div>
          <div class="mt-2 text-3xl font-semibold text-slate-100">{{ full(platformSummary.totals.messagesSentByBot) }}</div>
        </div>
        <div class="rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-4">
          <div class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            {{ $t('admin.dashboard.kpi.conversations') }}
          </div>
          <div class="mt-2 text-3xl font-semibold text-slate-100">{{ full(platformSummary.totals.conversationsTotal) }}</div>
        </div>
        <div class="rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-4">
          <div class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            {{ $t('admin.dashboard.kpi.leads') }}
          </div>
          <div class="mt-2 text-3xl font-semibold text-slate-100">{{ full(platformSummary.totals.leadsTotal) }}</div>
        </div>
        <div class="rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-4">
          <div class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            {{ $t('admin.dashboard.kpi.meetingsScheduled') }}
          </div>
          <div class="mt-2 text-3xl font-semibold text-slate-100">{{ full(platformSummary.totals.meetingsScheduled) }}</div>
        </div>
      </div>

      <div class="mt-4 rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-4">
        <div class="mb-2">
          <h3 class="text-sm font-semibold text-slate-100">{{ $t('admin.dashboard.chart.mixedTitle') }}</h3>
          <p class="text-[11px] text-slate-400 mt-0.5">{{ $t('admin.dashboard.chart.mixedSubtitle') }}</p>
        </div>
        <div v-if="platformLoading" class="h-64 rounded-xl bg-slate-800/60 animate-pulse" />
        <ClientOnly v-else-if="mixedChart">
          <apexchart type="line" height="320" :options="mixedChart.options" :series="mixedChart.series" />
        </ClientOnly>
      </div>

      <div class="mt-4 rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-4">
        <div class="mb-3">
          <h3 class="text-sm font-semibold text-slate-100">{{ $t('admin.dashboard.platform.tableTitle') }}</h3>
        </div>
        <div v-if="platformLoading" class="h-40 rounded-xl bg-slate-800/60 animate-pulse" />
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
