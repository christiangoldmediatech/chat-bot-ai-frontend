<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { Lead, LeadInterest, LeadStatus } from '~/types/lead'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const tenantId = route.params.id as string
const leadsApi = useLeads(tenantId)
const botsApi = useBots(tenantId)

const PAGE_SIZE = 50

const rows = ref<Lead[]>([])
const total = ref(0)
const page = ref(1)
const bots = ref<Bot[]>([])
const botMap = computed(() => new Map(bots.value.map((b) => [b.id, b.name])))

const loading = ref(true)
const error = ref<string | null>(null)
const exporting = ref(false)
const backfilling = ref(false)
const notification = ref<string | null>(null)

const statusFilter = ref<LeadStatus | 'ALL'>('ALL')
const interestFilter = ref<LeadInterest | ''>('')
const botFilter = ref('')
const search = ref('')

// Aggregate counts surfaced in the stat strip. Fetched in parallel so the
// numbers reflect the FULL filtered set, not just the current page.
const counts = ref({ total: 0, new: 0, qualified: 0, won: 0, lost: 0, withCrm: 0 })

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const fromIndex = computed(() => (total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1))
const toIndex = computed(() => Math.min(total.value, page.value * PAGE_SIZE))

// Server-side filtering already returns the right rows; this alias keeps
// the template signature unchanged.
const filtered = computed(() => rows.value)

async function loadList(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await leadsApi.listPaginated({
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      interest: interestFilter.value || undefined,
      botId: botFilter.value || undefined,
      search: search.value.trim() || undefined,
      page: page.value,
      pageSize: PAGE_SIZE,
    })
    rows.value = res.items
    total.value = res.total
    page.value = res.page
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

// pageSize=1 per bucket: cheap totals without a dedicated count endpoint.
async function loadCounts(): Promise<void> {
  try {
    const baseOpts = {
      botId: botFilter.value || undefined,
      interest: interestFilter.value || undefined,
      search: search.value.trim() || undefined,
      page: 1,
      pageSize: 1,
    }
    const [all, n, q, w, l, withCrm] = await Promise.all([
      leadsApi.listPaginated(baseOpts),
      leadsApi.listPaginated({ ...baseOpts, status: 'NEW' }),
      leadsApi.listPaginated({ ...baseOpts, status: 'QUALIFIED' }),
      leadsApi.listPaginated({ ...baseOpts, status: 'WON' }),
      leadsApi.listPaginated({ ...baseOpts, status: 'LOST' }),
      leadsApi.listPaginated({ ...baseOpts, hasCrm: true }),
    ])
    counts.value = {
      total: all.total,
      new: n.total,
      qualified: q.total,
      won: w.total,
      lost: l.total,
      withCrm: withCrm.total,
    }
  } catch {
    // Counts are decoration — the main list call already surfaces errors.
  }
}

async function load(): Promise<void> {
  await Promise.all([
    loadList(),
    loadCounts(),
    botsApi
      .list()
      .then((list) => { bots.value = list })
      .catch(() => { bots.value = [] }),
  ])
}

let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    page.value = 1
    void load()
  }, 300)
})

function onFilterChange(): void {
  page.value = 1
  void load()
}

function goPrev(): void {
  if (page.value <= 1) return
  page.value -= 1
  void loadList()
}
function goNext(): void {
  if (page.value >= pageCount.value) return
  page.value += 1
  void loadList()
}

async function exportCsv(): Promise<void> {
  exporting.value = true
  error.value = null
  try {
    await leadsApi.downloadCsv({
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      botId: botFilter.value || undefined,
      interest: interestFilter.value || undefined,
    })
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    exporting.value = false
  }
}

/**
 * Backfill within this company. If a bot filter is set, narrows the sweep
 * to just that bot — otherwise covers every bot in the tenant.
 */
async function backfillCrm(): Promise<void> {
  backfilling.value = true
  error.value = null
  notification.value = null
  try {
    const { enqueued } = await leadsApi.backfillCrm(botFilter.value || undefined)
    notification.value = enqueued > 0
      ? `${enqueued} sync job${enqueued === 1 ? '' : 's'} enqueued`
      : 'No leads needed backfilling'
    setTimeout(() => { notification.value = null }, 4000)
    setTimeout(() => { void load() }, 1500)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    backfilling.value = false
  }
}

function statusPill(status: LeadStatus): string {
  switch (status) {
    case 'NEW': return 'bg-indigo-500/20 text-indigo-200 ring-indigo-400/30'
    case 'CONTACTED': return 'bg-sky-500/20 text-sky-200 ring-sky-400/30'
    case 'QUALIFIED': return 'bg-violet-500/20 text-violet-200 ring-violet-400/30'
    case 'PROPOSAL_SENT': return 'bg-amber-500/20 text-amber-200 ring-amber-400/30'
    case 'NEGOTIATION': return 'bg-orange-500/20 text-orange-200 ring-orange-400/30'
    case 'WON': return 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/30'
    case 'LOST': return 'bg-rose-500/20 text-rose-200 ring-rose-400/30'
    default: return 'bg-slate-700 text-slate-300 ring-slate-600'
  }
}

function interestDot(interest: LeadInterest): string {
  if (interest === 'HIGH') return 'bg-emerald-400'
  if (interest === 'MEDIUM') return 'bg-amber-400'
  return 'bg-slate-500'
}

const INTEREST_OPTIONS: LeadInterest[] = ['HIGH', 'MEDIUM', 'LOW']
const STATUS_TABS: Array<LeadStatus | 'ALL'> = ['ALL', 'NEW', 'QUALIFIED', 'WON', 'LOST']

await load()
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${tenantId}`" class="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {{ $t('superadmin.leads.backToCompany') }}
    </NuxtLink>

    <header class="mt-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-100 tracking-tight">{{ $t('superadmin.leads.companyTitle') }}</h1>
        <p class="mt-1 text-sm text-slate-400 max-w-2xl">{{ $t('superadmin.leads.companySubtitle') }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          :disabled="exporting || rows.length === 0"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          @click="exportCsv"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {{ exporting ? $t('leads.list.exportingLabel') : $t('leads.list.exportCsv') }}
        </button>
        <button
          type="button"
          :disabled="backfilling"
          class="inline-flex items-center gap-1.5 rounded-xl bg-violet-500/20 ring-1 ring-violet-500/30 px-3 py-1.5 text-sm font-medium text-violet-200 hover:bg-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
          :title="$t('leads.list.backfillTooltip')"
          @click="backfillCrm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': backfilling }">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
          {{ backfilling ? $t('leads.list.backfillingLabel') : $t('leads.list.backfillCrm') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition"
          :disabled="loading"
          @click="load"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': loading }">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
          {{ $t('common.reload') }}
        </button>
      </div>
    </header>

    <!-- Compact stats strip -->
    <div class="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div class="rounded-xl bg-slate-800/60 ring-1 ring-slate-700 px-3 py-2">
        <div class="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{{ $t('leads.stat.all') }}</div>
        <div class="text-xl font-bold text-slate-100 tabular-nums">{{ counts.total }}</div>
      </div>
      <div class="rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/30 px-3 py-2">
        <div class="text-[10px] uppercase tracking-wider font-semibold text-indigo-300">{{ $t('leads.status.NEW') }}</div>
        <div class="text-xl font-bold text-indigo-100 tabular-nums">{{ counts.new }}</div>
      </div>
      <div class="rounded-xl bg-violet-500/10 ring-1 ring-violet-500/30 px-3 py-2">
        <div class="text-[10px] uppercase tracking-wider font-semibold text-violet-300">{{ $t('leads.status.QUALIFIED') }}</div>
        <div class="text-xl font-bold text-violet-100 tabular-nums">{{ counts.qualified }}</div>
      </div>
      <div class="rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 px-3 py-2">
        <div class="text-[10px] uppercase tracking-wider font-semibold text-emerald-300">{{ $t('leads.status.WON') }}</div>
        <div class="text-xl font-bold text-emerald-100 tabular-nums">{{ counts.won }}</div>
      </div>
      <div class="rounded-xl bg-rose-500/10 ring-1 ring-rose-500/30 px-3 py-2">
        <div class="text-[10px] uppercase tracking-wider font-semibold text-rose-300">{{ $t('leads.status.LOST') }}</div>
        <div class="text-xl font-bold text-rose-100 tabular-nums">{{ counts.lost }}</div>
      </div>
      <div class="rounded-xl bg-violet-500/10 ring-1 ring-violet-500/30 px-3 py-2">
        <div class="text-[10px] uppercase tracking-wider font-semibold text-violet-300">{{ $t('superadmin.leads.withCrm') }}</div>
        <div class="text-xl font-bold text-violet-100 tabular-nums">{{ counts.withCrm }}</div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="mt-4 rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-3 flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-[16rem]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="$t('leads.filter.searchPlaceholder')"
          class="w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        >
      </div>

      <select
        v-model="statusFilter"
        class="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        @change="onFilterChange"
      >
        <option v-for="s in STATUS_TABS" :key="s" :value="s">
          {{ s === 'ALL' ? $t('leads.stat.all') : $t(`leads.status.${s}`) }}
        </option>
      </select>

      <select
        v-model="interestFilter"
        class="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        @change="onFilterChange"
      >
        <option value="">{{ $t('leads.filter.allInterests') }}</option>
        <option v-for="i in INTEREST_OPTIONS" :key="i" :value="i">{{ $t(`leads.interest.${i}`) }}</option>
      </select>

      <select
        v-model="botFilter"
        class="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        @change="onFilterChange"
      >
        <option value="">{{ $t('leads.filter.allBots') }}</option>
        <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
    </div>

    <p v-if="error" class="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{{ error }}</p>
    <p
      v-if="notification"
      class="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200"
    >{{ notification }}</p>

    <SpinnerInline v-if="loading && rows.length === 0" class="mt-6" />

    <div
      v-else-if="filtered.length === 0"
      class="mt-6 rounded-2xl bg-slate-800/40 ring-1 ring-slate-700 p-10 text-center text-slate-400"
    >
      {{ rows.length === 0 ? $t('leads.list.empty') : $t('leads.list.noMatches') }}
    </div>

    <div
      v-else
      class="mt-4 overflow-hidden rounded-2xl bg-slate-800/60 ring-1 ring-slate-700"
      :class="{ 'opacity-60 pointer-events-none': loading }"
    >
      <table class="w-full text-sm text-left">
        <thead class="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-900/60">
          <tr>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.customer') }}</th>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.bot') }}</th>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.status') }}</th>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.score') }}</th>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.crm') }}</th>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.created') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-700">
          <tr
            v-for="l in filtered"
            :key="l.id"
            class="hover:bg-slate-800/70 transition cursor-pointer"
            @click="$router.push(`/superadmin/companies/${tenantId}/leads/${l.id}`)"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-semibold text-xs">
                  {{ (l.customerName || l.customerPhone || '?').charAt(0).toUpperCase() }}
                </span>
                <div class="min-w-0">
                  <div class="text-slate-100 font-medium truncate">{{ l.customerName || l.customerPhone }}</div>
                  <div class="text-[11px] text-slate-500 font-mono truncate">{{ l.customerPhone }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-xs text-slate-300">{{ botMap.get(l.botId) ?? l.botId.slice(0, 8) }}</td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset"
                :class="statusPill(l.status)"
              >
                {{ $t(`leads.status.${l.status}`) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="size-1.5 rounded-full" :class="interestDot(l.interest)" />
                <span class="text-slate-100 font-bold tabular-nums">{{ l.score }}</span>
                <span class="text-[11px] text-slate-500">{{ $t(`leads.interest.${l.interest}`) }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <a
                v-if="l.crmLeadUrl"
                :href="l.crmLeadUrl"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 text-xs text-violet-300 hover:underline"
                @click.stop
              >
                {{ $t('leads.list.crmBadge') }}
              </a>
              <span v-else class="text-[11px] text-slate-500">{{ $t(`leads.crmStatus.${l.crmSyncStatus}`) }}</span>
            </td>
            <td class="px-4 py-3 text-xs text-slate-400">{{ new Date(l.createdAt).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination footer -->
    <div
      v-if="filtered.length > 0 && pageCount > 1"
      class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 px-4 py-3"
    >
      <p class="text-xs text-slate-400 tabular-nums">
        {{ $t('leads.pagination.summary', { from: fromIndex, to: toIndex, total }) }}
      </p>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-500 tabular-nums">
          {{ $t('leads.pagination.page', { page, total: pageCount }) }}
        </span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-xl bg-slate-900 ring-1 ring-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          :disabled="page <= 1 || loading"
          @click="goPrev"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {{ $t('leads.pagination.previous') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          :disabled="page >= pageCount || loading"
          @click="goNext"
        >
          {{ $t('leads.pagination.next') }}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
