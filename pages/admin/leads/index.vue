<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { Lead, LeadInterest, LeadStatus } from '~/types/lead'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const leadsApi = useLeads()
const botsApi = useBots()

const PAGE_SIZE = 50

type StatusTab = LeadStatus | 'ALL'

const rows = ref<Lead[]>([])
const total = ref(0)
const page = ref(1)
const bots = ref<Bot[]>([])
const botMap = computed(() => new Map(bots.value.map((b) => [b.id, b.name])))

const loading = ref(true)
const error = ref<string | null>(null)
const syncBusyId = ref<string | null>(null)
const exporting = ref(false)
const backfilling = ref(false)
const backfillResult = ref<string | null>(null)

const statusFilter = ref<StatusTab>('ALL')
const botFilter = ref<string>('')
const interestFilter = ref<LeadInterest | ''>('')
const search = ref('')

// Stat tabs at the top — these are the 4 buckets that matter most to a
// commercial team: brand-new leads, ones already qualified, and the final
// outcomes (won/lost). Numbers come from cheap pageSize=1 fetches per status.
const counts = ref({ new: 0, qualified: 0, won: 0, lost: 0, total: 0 })

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const fromIndex = computed(() => total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1)
const toIndex = computed(() => Math.min(total.value, page.value * PAGE_SIZE))
const isFiltered = computed(
  () => Boolean(search.value.trim()) || Boolean(botFilter.value) || Boolean(interestFilter.value),
)

async function loadList(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const status = statusFilter.value === 'ALL' ? undefined : statusFilter.value
    const res = await leadsApi.listPaginated({
      status,
      botId: botFilter.value || undefined,
      interest: interestFilter.value || undefined,
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

async function loadCounts(): Promise<void> {
  try {
    const baseOpts = {
      botId: botFilter.value || undefined,
      interest: interestFilter.value || undefined,
      search: search.value.trim() || undefined,
      page: 1,
      pageSize: 1,
    }
    const [n, q, w, l] = await Promise.all([
      leadsApi.listPaginated({ ...baseOpts, status: 'NEW' }),
      leadsApi.listPaginated({ ...baseOpts, status: 'QUALIFIED' }),
      leadsApi.listPaginated({ ...baseOpts, status: 'WON' }),
      leadsApi.listPaginated({ ...baseOpts, status: 'LOST' }),
    ])
    counts.value = {
      new: n.total,
      qualified: q.total,
      won: w.total,
      lost: l.total,
      total: n.total + q.total + w.total + l.total,
    }
  } catch {
    // Counts are decoration — list-load already surfaces errors.
  }
}

async function load(): Promise<void> {
  await Promise.all([loadList(), loadCounts()])
}

async function loadBots(): Promise<void> {
  try {
    bots.value = await botsApi.list()
  } catch {
    bots.value = []
  }
}

let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    page.value = 1
    void load()
  }, 300)
})

function onTabChange(tab: StatusTab): void {
  if (statusFilter.value === tab) return
  statusFilter.value = tab
  page.value = 1
  void loadList()
}

function onFilterChange(): void {
  page.value = 1
  void load()
}

function clearFilters(): void {
  search.value = ''
  botFilter.value = ''
  interestFilter.value = ''
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

async function retrySync(lead: Lead): Promise<void> {
  syncBusyId.value = lead.id
  try {
    await leadsApi.syncCrm(lead.id)
    // The backend works async; refresh the row a moment later so the
    // PENDING → SYNCED/FAILED transition shows up.
    setTimeout(() => { void loadList() }, 1200)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    syncBusyId.value = null
  }
}

async function exportCsv(): Promise<void> {
  exporting.value = true
  error.value = null
  try {
    // Pass the same filter set the user is looking at — exported CSV
    // matches what's on screen.
    await leadsApi.downloadCsv({
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      botId: botFilter.value || undefined,
      interest: interestFilter.value || undefined,
      search: search.value.trim() || undefined,
    })
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    exporting.value = false
  }
}

async function backfillCrm(): Promise<void> {
  backfilling.value = true
  error.value = null
  backfillResult.value = null
  try {
    const { enqueued } = await leadsApi.backfillCrm(botFilter.value || undefined)
    backfillResult.value = enqueued > 0
      ? `${enqueued} job${enqueued === 1 ? '' : 's'} enqueued`
      : 'No leads needed backfilling'
    setTimeout(() => { backfillResult.value = null }, 4000)
    // Refresh the list so PENDING badges appear.
    setTimeout(() => { void load() }, 1500)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    backfilling.value = false
  }
}

function statusPill(status: LeadStatus): string {
  switch (status) {
    case 'NEW': return 'bg-primary-50 text-primary-700 ring-primary-200'
    case 'CONTACTED': return 'bg-sky-50 text-sky-700 ring-sky-200'
    case 'QUALIFIED': return 'bg-violet-50 text-violet-700 ring-violet-200'
    case 'PROPOSAL_SENT': return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'NEGOTIATION': return 'bg-orange-50 text-orange-700 ring-orange-200'
    case 'WON': return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'LOST': return 'bg-rose-50 text-rose-700 ring-rose-200'
    default: return 'bg-slate-50 text-slate-700 ring-slate-200'
  }
}

function statusAccent(status: LeadStatus): string {
  switch (status) {
    case 'NEW': return 'bg-gradient-to-b from-primary-400 to-indigo-600'
    case 'CONTACTED': return 'bg-gradient-to-b from-sky-400 to-sky-600'
    case 'QUALIFIED': return 'bg-gradient-to-b from-violet-400 to-violet-600'
    case 'PROPOSAL_SENT': return 'bg-gradient-to-b from-amber-400 to-amber-600'
    case 'NEGOTIATION': return 'bg-gradient-to-b from-orange-400 to-orange-600'
    case 'WON': return 'bg-gradient-to-b from-emerald-400 to-emerald-600'
    case 'LOST': return 'bg-gradient-to-b from-rose-400 to-rose-600'
    default: return 'bg-gradient-to-b from-slate-400 to-slate-600'
  }
}

// Stat-tab visual recipe — mirrors the cases page palette structure.
const tabPalette = {
  ALL: {
    inactive: 'bg-gradient-to-br from-primary-50 via-white to-white ring-primary-200/70 shadow-[0_8px_24px_-12px_rgba(79,70,229,0.18),0_3px_8px_-4px_rgba(79,70,229,0.08)]',
    active: 'bg-gradient-to-br from-primary-100 via-primary-50 to-white ring-2 ring-primary-400 shadow-[0_14px_32px_-14px_rgba(79,70,229,0.32),0_4px_10px_-4px_rgba(79,70,229,0.14)]',
    pill: 'bg-gradient-to-br from-primary-500 to-indigo-600 ring-indigo-300/60',
    label: 'text-primary-700/80',
    value: 'text-primary-900',
    halo: 'bg-indigo-300/40',
  },
  NEW: {
    inactive: 'bg-gradient-to-br from-sky-50 via-white to-white ring-sky-200/70 shadow-[0_8px_24px_-12px_rgba(14,165,233,0.18)]',
    active: 'bg-gradient-to-br from-sky-100 via-sky-50 to-white ring-2 ring-sky-400 shadow-[0_14px_32px_-14px_rgba(14,165,233,0.34)]',
    pill: 'bg-gradient-to-br from-sky-500 to-blue-600 ring-sky-300/60',
    label: 'text-sky-700/80',
    value: 'text-sky-900',
    halo: 'bg-sky-300/40',
  },
  QUALIFIED: {
    inactive: 'bg-gradient-to-br from-violet-50 via-white to-white ring-violet-200/70 shadow-[0_8px_24px_-12px_rgba(139,92,246,0.18)]',
    active: 'bg-gradient-to-br from-violet-100 via-violet-50 to-white ring-2 ring-violet-400 shadow-[0_14px_32px_-14px_rgba(139,92,246,0.34)]',
    pill: 'bg-gradient-to-br from-violet-500 to-purple-600 ring-violet-300/60',
    label: 'text-violet-700/80',
    value: 'text-violet-900',
    halo: 'bg-violet-300/40',
  },
  WON: {
    inactive: 'bg-gradient-to-br from-emerald-50 via-white to-white ring-emerald-200/70 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.18)]',
    active: 'bg-gradient-to-br from-emerald-100 via-emerald-50 to-white ring-2 ring-emerald-400 shadow-[0_14px_32px_-14px_rgba(16,185,129,0.34)]',
    pill: 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-emerald-300/60',
    label: 'text-emerald-700/80',
    value: 'text-emerald-900',
    halo: 'bg-emerald-300/40',
  },
  LOST: {
    inactive: 'bg-gradient-to-br from-rose-50 via-white to-white ring-rose-200/70 shadow-[0_8px_24px_-12px_rgba(244,63,94,0.18)]',
    active: 'bg-gradient-to-br from-rose-100 via-rose-50 to-white ring-2 ring-rose-400 shadow-[0_14px_32px_-14px_rgba(244,63,94,0.34)]',
    pill: 'bg-gradient-to-br from-rose-500 to-rose-600 ring-rose-300/60',
    label: 'text-rose-700/80',
    value: 'text-rose-900',
    halo: 'bg-rose-300/40',
  },
} as const

const INTEREST_OPTIONS: LeadInterest[] = ['HIGH', 'MEDIUM', 'LOW']

await Promise.all([loadBots(), load()])
</script>

<template>
  <div>
    <!-- Page header -->
    <header class="flex items-start gap-4 flex-wrap">
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white ring-1 ring-indigo-300/60 shadow-[0_8px_24px_-10px_rgba(79,70,229,0.45)]"
        aria-hidden="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5">
          <polygon points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">{{ $t('leads.title') }}</h1>
        <p class="text-sm text-slate-500 mt-1 max-w-2xl">{{ $t('leads.subtitle') }}</p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <div
          class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-primary-50 via-white to-white ring-1 ring-primary-200/70 px-4 py-2 shadow-[0_6px_18px_-10px_rgba(79,70,229,0.30)]"
        >
          <span class="text-[10px] uppercase tracking-wider font-semibold text-primary-700/80">
            {{ isFiltered ? $t('leads.matchingLabel') : $t('leads.totalLabel') }}
          </span>
          <span class="text-xl font-bold text-primary-900 tabular-nums tracking-tight">{{ total }}</span>
        </div>

        <button
          type="button"
          :disabled="exporting || rows.length === 0"
          class="inline-flex items-center gap-1.5 rounded-2xl bg-white ring-1 ring-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          @click="exportCsv"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': exporting }">
            <template v-if="!exporting">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </template>
            <template v-else>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            </template>
          </svg>
          {{ exporting ? $t('leads.list.exportingLabel') : $t('leads.list.exportCsv') }}
        </button>

        <button
          type="button"
          :disabled="backfilling"
          class="inline-flex items-center gap-1.5 rounded-2xl bg-violet-50 ring-1 ring-violet-200 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
      </div>
    </header>

    <p
      v-if="backfillResult"
      class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
    >{{ backfillResult }}</p>

    <!-- Stat tabs -->
    <div class="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="statusFilter === 'ALL' ? tabPalette.ALL.active : tabPalette.ALL.inactive"
        @click="onTabChange('ALL')"
      >
        <span class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70" :class="tabPalette.ALL.halo" aria-hidden="true" />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider font-semibold" :class="tabPalette.ALL.label">
              {{ $t('leads.stat.all') }}
            </div>
            <div class="mt-1 text-3xl font-bold tabular-nums tracking-tight" :class="tabPalette.ALL.value">{{ counts.total }}</div>
          </div>
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 shadow-sm" :class="tabPalette.ALL.pill">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
              <polygon points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
        </div>
      </button>

      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="statusFilter === 'NEW' ? tabPalette.NEW.active : tabPalette.NEW.inactive"
        @click="onTabChange('NEW')"
      >
        <span class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70" :class="tabPalette.NEW.halo" aria-hidden="true" />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider font-semibold" :class="tabPalette.NEW.label">{{ $t('leads.status.NEW') }}</div>
            <div class="mt-1 text-3xl font-bold tabular-nums tracking-tight" :class="tabPalette.NEW.value">{{ counts.new }}</div>
          </div>
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 shadow-sm" :class="tabPalette.NEW.pill">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
      </button>

      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="statusFilter === 'QUALIFIED' ? tabPalette.QUALIFIED.active : tabPalette.QUALIFIED.inactive"
        @click="onTabChange('QUALIFIED')"
      >
        <span class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70" :class="tabPalette.QUALIFIED.halo" aria-hidden="true" />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider font-semibold" :class="tabPalette.QUALIFIED.label">{{ $t('leads.status.QUALIFIED') }}</div>
            <div class="mt-1 text-3xl font-bold tabular-nums tracking-tight" :class="tabPalette.QUALIFIED.value">{{ counts.qualified }}</div>
          </div>
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 shadow-sm" :class="tabPalette.QUALIFIED.pill">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
              <path d="M12 2 4 7v6c0 5 4 9 8 9s8-4 8-9V7l-8-5z" />
            </svg>
          </div>
        </div>
      </button>

      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="statusFilter === 'WON' ? tabPalette.WON.active : tabPalette.WON.inactive"
        @click="onTabChange('WON')"
      >
        <span class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70" :class="tabPalette.WON.halo" aria-hidden="true" />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider font-semibold" :class="tabPalette.WON.label">{{ $t('leads.status.WON') }}</div>
            <div class="mt-1 text-3xl font-bold tabular-nums tracking-tight" :class="tabPalette.WON.value">{{ counts.won }}</div>
          </div>
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 shadow-sm" :class="tabPalette.WON.pill">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </button>

      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="statusFilter === 'LOST' ? tabPalette.LOST.active : tabPalette.LOST.inactive"
        @click="onTabChange('LOST')"
      >
        <span class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70" :class="tabPalette.LOST.halo" aria-hidden="true" />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider font-semibold" :class="tabPalette.LOST.label">{{ $t('leads.status.LOST') }}</div>
            <div class="mt-1 text-3xl font-bold tabular-nums tracking-tight" :class="tabPalette.LOST.value">{{ counts.lost }}</div>
          </div>
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 shadow-sm" :class="tabPalette.LOST.pill">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        </div>
      </button>
    </div>

    <!-- Filter bar -->
    <div class="mt-4 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-3 flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-[18rem]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="$t('leads.filter.searchPlaceholder')"
          class="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none transition"
        >
      </div>

      <select
        v-model="botFilter"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none transition"
        @change="onFilterChange"
      >
        <option value="">{{ $t('leads.filter.allBots') }}</option>
        <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>

      <select
        v-model="interestFilter"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none transition"
        @change="onFilterChange"
      >
        <option value="">{{ $t('leads.filter.allInterests') }}</option>
        <option v-for="i in INTEREST_OPTIONS" :key="i" :value="i">{{ $t(`leads.interest.${i}`) }}</option>
      </select>

      <button
        v-if="isFiltered"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
        @click="clearFilters"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        {{ $t('common.cancel') }}
      </button>

      <button
        type="button"
        class="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-white ring-1 ring-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
        :disabled="loading"
        @click="load"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': loading }" aria-hidden="true">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
          <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
        </svg>
        {{ $t('common.reload') }}
      </button>
    </div>

    <p v-if="error" class="mt-4 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading && rows.length === 0" class="mt-6" />

    <div
      v-else-if="rows.length === 0"
      class="mt-6 rounded-2xl bg-white/70 ring-1 ring-white/50 p-10 text-center text-slate-500"
    >
      {{ isFiltered ? $t('leads.list.noMatches') : $t('leads.list.empty') }}
    </div>

    <!-- Leads list -->
    <div v-else class="mt-4 space-y-3" :class="{ 'opacity-60 pointer-events-none': loading }">
      <article
        v-for="l in rows"
        :key="l.id"
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/40 via-white to-white ring-1 ring-primary-100/60 shadow-[0_8px_24px_-12px_rgba(79,70,229,0.16),0_3px_8px_-4px_rgba(15,23,42,0.06)] p-4 flex flex-wrap gap-4 items-start transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-14px_rgba(79,70,229,0.24),0_4px_10px_-4px_rgba(15,23,42,0.08)]"
      >
        <!-- Status accent bar -->
        <span class="pointer-events-none absolute inset-y-0 left-0 w-1" :class="statusAccent(l.status)" aria-hidden="true" />

        <div class="flex items-start gap-3 flex-1 min-w-[20rem] pl-2">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-semibold text-sm ring-1 ring-indigo-300/60 shadow-sm">
            {{ (l.customerName || l.customerPhone || '?').charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/admin/leads/${l.id}`"
                class="text-sm font-semibold text-slate-900 hover:underline"
              >
                {{ l.customerName || l.customerPhone }}
              </NuxtLink>
              <span class="text-xs text-slate-500 font-mono">{{ l.customerPhone }}</span>
              <span
                class="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset"
                :class="statusPill(l.status)"
              >
                {{ $t(`leads.status.${l.status}`) }}
              </span>
              <LeadScoreBadge :score="l.score" :interest="l.interest" />
              <a
                v-if="l.crmLeadUrl"
                :href="l.crmLeadUrl"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 hover:bg-violet-100 transition"
                :title="l.crmLeadUrl"
                @click.stop
              >
                {{ $t('leads.list.crmBadge') }}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                  <path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd" />
                  <path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd" />
                </svg>
              </a>
              <span
                v-else-if="l.crmSyncStatus === 'FAILED'"
                class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200"
              >
                {{ $t('leads.crmStatus.FAILED') }}
              </span>
              <span
                v-else-if="l.crmSyncStatus === 'PENDING'"
                class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200"
              >
                <span class="size-1.5 rounded-full bg-sky-500 animate-pulse" />
                {{ $t('leads.crmStatus.PENDING') }}
              </span>
            </div>
            <p v-if="l.reason" class="mt-2 text-sm text-slate-700 leading-relaxed">{{ l.reason }}</p>
            <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span>{{ $t('leads.list.bot') }} {{ botMap.get(l.botId) ?? l.botId.slice(0, 8) }}</span>
              <span v-if="l.customerEmail">{{ l.customerEmail }}</span>
              <span v-if="l.lastSignalAt">{{ $t('leads.list.lastActivity') }} {{ new Date(l.lastSignalAt).toLocaleString() }}</span>
              <span>{{ $t('leads.list.created') }} {{ new Date(l.createdAt).toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-2 shrink-0">
          <NuxtLink
            :to="`/admin/leads/${l.id}`"
            class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium bg-slate-900 text-white shadow-sm hover:bg-slate-800 transition"
          >
            {{ $t('leads.list.view') }}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </NuxtLink>
          <button
            v-if="l.crmSyncStatus === 'FAILED'"
            type="button"
            :disabled="syncBusyId === l.id"
            class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
            @click="retrySync(l)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': syncBusyId === l.id }">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
              <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
            </svg>
            {{ $t('leads.list.retrySync') }}
          </button>
        </div>
      </article>
    </div>

    <!-- Pagination footer -->
    <div
      v-if="rows.length > 0 && pageCount > 1"
      class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass px-4 py-3"
    >
      <p class="text-xs text-slate-600 tabular-nums">
        {{ $t('leads.pagination.summary', { from: fromIndex, to: toIndex, total }) }}
      </p>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-500 tabular-nums">
          {{ $t('leads.pagination.page', { page, total: pageCount }) }}
        </span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-xl bg-white ring-1 ring-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
          class="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-primary-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
