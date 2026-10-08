<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Lead, LeadInterest, LeadStatus } from '~/types/lead'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const leadsApi = useLeads()
const activeBot = useActiveBotStore()

const PAGE_SIZE = 25

type StatusTab = LeadStatus | 'ALL'

const rows = ref<Lead[]>([])
const total = ref(0)
const page = ref(1)
const bots = ref<{ id: string, name: string }[]>([])
const botMap = computed(() => new Map(bots.value.map(b => [b.id, b.name])))

const loading = ref(true)
const error = ref<string | null>(null)
const syncBusyId = ref<string | null>(null)
const exporting = ref(false)
const backfilling = ref(false)
const backfillResult = ref<string | null>(null)

const statusFilter = ref<StatusTab>('ALL')
const interestFilter = ref<LeadInterest | ''>('')
const search = ref('')

const counts = ref({
  new: 0,
  contacted: 0,
  qualified: 0,
  won: 0,
  lost: 0,
  other: 0,
  total: 0,
})

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const fromIndex = computed(() => total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1)
const toIndex = computed(() => Math.min(total.value, page.value * PAGE_SIZE))
const isFiltered = computed(() => Boolean(search.value.trim()) || Boolean(interestFilter.value))

async function loadList(): Promise<void> {
  const bid = activeBot.botId
  if (!bid) {
    rows.value = []
    total.value = 0
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const status = statusFilter.value === 'ALL' ? undefined : statusFilter.value
    const res = await leadsApi.listPaginated({
      status,
      botId: bid,
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
  const bid = activeBot.botId
  if (!bid) return
  try {
    const res = await leadsApi.summary({
      botId: bid,
      interest: interestFilter.value || undefined,
    })
    const s = res.byStatus
    const primary = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST']
    let other = res.unknown
    for (const [k, v] of Object.entries(s)) {
      if (!primary.includes(k)) other += v
    }
    counts.value = {
      new: s.NEW ?? 0,
      contacted: s.CONTACTED ?? 0,
      qualified: s.QUALIFIED ?? 0,
      won: s.WON ?? 0,
      lost: s.LOST ?? 0,
      other,
      total: res.total,
    }
  } catch {
    // Counts are decoration.
  }
}

async function load(): Promise<void> {
  await Promise.all([loadList(), loadCounts()])
}

function syncBotsFromStore(): void {
  bots.value = activeBot.allBots
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
    await leadsApi.downloadCsv({
      status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
      botId: activeBot.botId ?? undefined,
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
    const { enqueued } = await leadsApi.backfillCrm(activeBot.botId ?? undefined)
    backfillResult.value = enqueued > 0
      ? `${enqueued} job${enqueued === 1 ? '' : 's'} enqueued`
      : 'No leads needed backfilling'
    setTimeout(() => { backfillResult.value = null }, 4000)
    setTimeout(() => { void load() }, 1500)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    backfilling.value = false
  }
}

const INTEREST_OPTIONS: LeadInterest[] = ['HIGH', 'MEDIUM', 'LOW']

const statusTone: Record<LeadStatus, {
  dot: string
  text: string
  bg: string
  ring: string
  hoverRing: string
  hoverShadow: string
}> = {
  NEW: {
    dot: 'bg-sky-500',
    text: 'text-sky-700',
    bg: 'bg-sky-50',
    ring: 'ring-sky-200',
    hoverRing: 'group-hover:ring-sky-300',
    hoverShadow: 'group-hover:shadow-[0_14px_32px_-16px_rgba(14,165,233,0.35)]',
  },
  CONTACTED: {
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    hoverRing: 'group-hover:ring-amber-300',
    hoverShadow: 'group-hover:shadow-[0_14px_32px_-16px_rgba(245,158,11,0.35)]',
  },
  QUALIFIED: {
    dot: 'bg-violet-500',
    text: 'text-violet-700',
    bg: 'bg-violet-50',
    ring: 'ring-violet-200',
    hoverRing: 'group-hover:ring-violet-300',
    hoverShadow: 'group-hover:shadow-[0_14px_32px_-16px_rgba(139,92,246,0.35)]',
  },
  PROPOSAL_SENT: {
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    hoverRing: 'group-hover:ring-amber-300',
    hoverShadow: 'group-hover:shadow-[0_14px_32px_-16px_rgba(245,158,11,0.3)]',
  },
  NEGOTIATION: {
    dot: 'bg-orange-500',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    ring: 'ring-orange-200',
    hoverRing: 'group-hover:ring-orange-300',
    hoverShadow: 'group-hover:shadow-[0_14px_32px_-16px_rgba(249,115,22,0.35)]',
  },
  WON: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    hoverRing: 'group-hover:ring-emerald-300',
    hoverShadow: 'group-hover:shadow-[0_14px_32px_-16px_rgba(16,185,129,0.35)]',
  },
  LOST: {
    dot: 'bg-rose-500',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    ring: 'ring-rose-200',
    hoverRing: 'group-hover:ring-rose-300',
    hoverShadow: 'group-hover:shadow-[0_14px_32px_-16px_rgba(244,63,94,0.3)]',
  },
}

const interestTone: Record<LeadInterest, { chip: string, highlight: boolean }> = {
  HIGH: { chip: 'bg-rose-50 text-rose-700 ring-rose-200', highlight: true },
  MEDIUM: { chip: 'text-amber-600', highlight: false },
  LOW: { chip: 'text-slate-400', highlight: false },
}

function avatarColor(key: string): string {
  const palettes = [
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600',
    'bg-gradient-to-br from-amber-500 to-orange-500',
    'bg-gradient-to-br from-violet-500 to-violet-600',
    'bg-gradient-to-br from-sky-500 to-blue-600',
    'bg-gradient-to-br from-rose-500 to-rose-600',
    'bg-gradient-to-br from-teal-500 to-teal-600',
  ]
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return palettes[hash % palettes.length]
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

interface Tab {
  key: StatusTab
  labelKey: string
  value: ComputedRef<number>
  accent: string
  activeRing: string
  dot: string
}

const tabs = computed<Tab[]>(() => [
  {
    key: 'ALL',
    labelKey: 'leads.stat.all',
    value: computed(() => counts.value.total),
    accent: 'text-slate-900',
    activeRing: 'ring-slate-900',
    dot: 'bg-slate-400',
  },
  {
    key: 'NEW',
    labelKey: 'leads.status.NEW',
    value: computed(() => counts.value.new),
    accent: 'text-sky-700',
    activeRing: 'ring-sky-500',
    dot: 'bg-sky-500',
  },
  {
    key: 'CONTACTED',
    labelKey: 'leads.status.CONTACTED',
    value: computed(() => counts.value.contacted),
    accent: 'text-amber-700',
    activeRing: 'ring-amber-500',
    dot: 'bg-amber-500',
  },
  {
    key: 'QUALIFIED',
    labelKey: 'leads.status.QUALIFIED',
    value: computed(() => counts.value.qualified),
    accent: 'text-violet-700',
    activeRing: 'ring-violet-500',
    dot: 'bg-violet-500',
  },
  {
    key: 'WON',
    labelKey: 'leads.status.WON',
    value: computed(() => counts.value.won),
    accent: 'text-emerald-700',
    activeRing: 'ring-emerald-500',
    dot: 'bg-emerald-500',
  },
  {
    key: 'LOST',
    labelKey: 'leads.status.LOST',
    value: computed(() => counts.value.lost),
    accent: 'text-rose-700',
    activeRing: 'ring-rose-500',
    dot: 'bg-rose-500',
  },
])

syncBotsFromStore()
watch(() => activeBot.allBots, syncBotsFromStore)
watch(() => activeBot.botId, () => {
  page.value = 1
  void load()
})
await load()
</script>

<template>
  <div class="max-w-6xl">
    <!-- Header -->
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div class="min-w-0">
        <div class="flex items-center gap-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
          <span class="size-1.5 rounded-full bg-slate-400" aria-hidden="true" />
          {{ $t('leads.title') }}
        </div>
        <h1 class="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
          {{ $t('leads.subtitle') }}
        </h1>
      </div>
      <div class="flex items-center gap-3 text-xs text-slate-500">
        <span class="tabular-nums">{{ total }} {{ isFiltered ? $t('leads.matchingLabel') : $t('leads.totalLabel') }}</span>
        <button
          type="button"
          :disabled="exporting || rows.length === 0"
          class="inline-flex items-center gap-1.5 rounded-lg bg-white ring-1 ring-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition"
          :title="$t('leads.list.exportCsv')"
          @click="exportCsv"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': exporting }" aria-hidden="true">
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
        </button>
        <button
          type="button"
          :disabled="backfilling"
          class="inline-flex items-center gap-1.5 rounded-lg bg-white ring-1 ring-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition"
          :title="$t('leads.list.backfillTooltip')"
          @click="backfillCrm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': backfilling }" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-white ring-1 ring-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition"
          :disabled="loading"
          :title="$t('common.reload')"
          @click="load"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': loading }" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        </button>
      </div>
    </header>

    <p
      v-if="backfillResult"
      class="mt-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2 text-sm text-emerald-700"
    >{{ backfillResult }}</p>

    <!-- Stat tabs -->
    <div class="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="group relative rounded-xl bg-white ring-1 ring-slate-200 px-4 py-3 text-left transition-all duration-200 hover:ring-slate-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
        :class="statusFilter === tab.key ? [tab.activeRing, 'ring-2'] : ''"
        @click="onTabChange(tab.key)"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5">
            <span class="size-1.5 rounded-full" :class="tab.dot" aria-hidden="true" />
            <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {{ $t(tab.labelKey) }}
            </span>
          </div>
          <span
            v-if="statusFilter === tab.key"
            class="size-1.5 rounded-full"
            :class="tab.dot"
            aria-hidden="true"
          />
        </div>
        <div class="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight" :class="tab.accent">
          {{ tab.value.value }}
        </div>
      </button>
    </div>

    <!-- Filters -->
    <div class="mt-5 flex items-center gap-2">
      <div class="relative flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="$t('leads.filter.searchPlaceholder')"
          class="w-full rounded-xl bg-white ring-1 ring-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:outline-none transition"
        >
      </div>
      <select
        v-model="interestFilter"
        class="rounded-xl bg-white ring-1 ring-slate-200 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none transition"
        @change="onFilterChange"
      >
        <option value="">{{ $t('leads.filter.allInterests') }}</option>
        <option v-for="i in INTEREST_OPTIONS" :key="i" :value="i">{{ $t(`leads.interest.${i}`) }}</option>
      </select>
      <button
        v-if="isFiltered"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl bg-white ring-1 ring-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:ring-slate-300 transition"
        @click="clearFilters"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        {{ $t('common.cancel') }}
      </button>
    </div>

    <p v-if="error" class="mt-4 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-sm text-rose-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading && rows.length === 0" class="mt-6" />

    <div
      v-else-if="rows.length === 0"
      class="mt-6 rounded-2xl bg-white ring-1 ring-dashed ring-slate-200 p-12 text-center"
    >
      <div class="mx-auto flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5">
          <polygon points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <p class="mt-3 text-sm text-slate-500">
        {{ isFiltered ? $t('leads.list.noMatches') : $t('leads.list.empty') }}
      </p>
    </div>

    <!-- Leads list: activity feed with hero summary + colored hover -->
    <div v-else class="mt-5 space-y-3" :class="{ 'opacity-60 pointer-events-none': loading }">
      <article
        v-for="l in rows"
        :key="l.id"
        class="group relative rounded-2xl bg-white ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5"
        :class="[statusTone[l.status].hoverRing, statusTone[l.status].hoverShadow]"
      >
        <!-- Colored diagonal glow on hover -->
        <div
          class="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          :class="statusTone[l.status].bg"
          aria-hidden="true"
          style="mask-image: linear-gradient(135deg, black 0%, transparent 50%); -webkit-mask-image: linear-gradient(135deg, black 0%, transparent 50%);"
        />

        <div class="relative p-5">
          <!-- Top band: avatar + identity + chips + relative time -->
          <div class="flex items-start gap-4">
            <!-- Avatar colored by phone -->
            <div
              class="relative flex size-11 shrink-0 items-center justify-center rounded-xl text-white font-semibold text-sm shadow-sm ring-1 ring-white/40 transition-transform duration-300 group-hover:scale-105"
              :class="avatarColor(l.customerPhone)"
            >
              {{ (l.customerName || l.customerPhone || '?').charAt(0).toUpperCase() }}
              <span
                class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white"
                :class="statusTone[l.status].dot"
                :title="$t(`leads.status.${l.status}`)"
                aria-hidden="true"
              />
            </div>

            <!-- Identity block -->
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2 flex-wrap">
                <NuxtLink
                  :to="`/admin/leads/${l.id}`"
                  class="text-base font-semibold text-slate-900 hover:text-slate-600 transition truncate"
                >
                  {{ l.customerName || l.customerPhone }}
                </NuxtLink>
                <span class="text-xs text-slate-400 font-mono truncate">{{ l.customerPhone }}</span>
              </div>

              <!-- Chip row -->
              <div class="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span
                  class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset"
                  :class="[statusTone[l.status].text, statusTone[l.status].bg, statusTone[l.status].ring]"
                >
                  <span class="size-1.5 rounded-full" :class="statusTone[l.status].dot" />
                  {{ $t(`leads.status.${l.status}`) }}
                </span>

                <!-- Interest: pill only for HIGH, text for others -->
                <span
                  v-if="l.interest === 'HIGH'"
                  class="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ring-inset"
                  :class="interestTone.HIGH.chip"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                    <path d="M13.5 2 3 14h7l-1.5 8L20 9h-7l0.5-7z" />
                  </svg>
                  {{ $t('leads.interest.HIGH') }}
                </span>
                <span
                  v-else
                  class="text-[11px]"
                  :class="interestTone[l.interest].chip"
                >
                  {{ $t(`leads.interest.${l.interest}`) }}
                </span>

                <!-- Score inline, subtle -->
                <LeadScoreBadge :score="l.score" :interest="l.interest" />

                <!-- CRM status -->
                <a
                  v-if="l.crmLeadUrl"
                  :href="l.crmLeadUrl"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-800 transition"
                  :title="l.crmLeadUrl"
                  @click.stop
                >
                  {{ $t('leads.list.crmBadge') }}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-2.5">
                    <path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd" />
                    <path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd" />
                  </svg>
                </a>
                <span
                  v-else-if="l.crmSyncStatus === 'FAILED'"
                  class="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600"
                  :title="$t('leads.crmStatus.FAILED')"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {{ $t('leads.crmStatus.FAILED') }}
                </span>
                <span
                  v-else-if="l.crmSyncStatus === 'PENDING'"
                  class="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600"
                >
                  <span class="size-1.5 rounded-full bg-sky-500 animate-pulse" />
                  {{ $t('leads.crmStatus.PENDING') }}
                </span>

                <!-- Relative time floats right -->
                <time
                  :datetime="l.createdAt"
                  :title="new Date(l.createdAt).toLocaleString()"
                  class="ml-auto text-[11px] font-medium text-slate-400 tabular-nums"
                >
                  {{ relativeTime(l.createdAt) }}
                </time>
              </div>
            </div>
          </div>

          <!-- Reason as hero text (what signals triggered the lead) -->
          <blockquote
            v-if="l.reason"
            class="mt-4 pl-4 border-l-2 border-slate-200 text-[15px] text-slate-800 leading-relaxed"
          >
            {{ l.reason }}
          </blockquote>

          <!-- Bottom bar: meta + actions -->
          <div class="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div class="flex items-center gap-2.5 text-[11px] text-slate-500 min-w-0">
              <span class="inline-flex items-center gap-1 min-w-0" :title="`Bot: ${botMap.get(l.botId) ?? l.botId}`">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3 text-slate-400 shrink-0" aria-hidden="true">
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M12 7V3" />
                  <circle cx="8.5" cy="13" r="1" />
                  <circle cx="15.5" cy="13" r="1" />
                </svg>
                <span class="truncate font-medium">{{ botMap.get(l.botId) ?? l.botId.slice(0, 8) }}</span>
              </span>
              <template v-if="l.customerEmail">
                <span class="h-3 w-px bg-slate-200" aria-hidden="true" />
                <span class="inline-flex items-center gap-1 min-w-0" :title="l.customerEmail">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3 text-slate-400 shrink-0" aria-hidden="true">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22 6 12 13 2 6" />
                  </svg>
                  <span class="truncate font-mono text-slate-500">{{ l.customerEmail }}</span>
                </span>
              </template>
              <template v-if="l.lastSignalAt">
                <span class="h-3 w-px bg-slate-200" aria-hidden="true" />
                <time :datetime="l.lastSignalAt" :title="new Date(l.lastSignalAt).toLocaleString()" class="inline-flex items-center gap-1 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3 text-slate-400" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {{ relativeTime(l.lastSignalAt) }}
                </time>
              </template>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                v-if="l.crmSyncStatus === 'FAILED'"
                type="button"
                :disabled="syncBusyId === l.id"
                class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium bg-white ring-1 ring-slate-200 text-slate-600 hover:text-rose-700 hover:ring-rose-300 hover:bg-rose-50 disabled:opacity-50 transition"
                :title="$t('leads.list.retrySync')"
                @click="retrySync(l)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': syncBusyId === l.id }" aria-hidden="true">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                  <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
                </svg>
                <span class="hidden sm:inline">{{ $t('leads.list.retrySync') }}</span>
              </button>
              <NuxtLink
                v-if="l.conversationId"
                :to="`/admin/conversations/${l.conversationId}`"
                class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium bg-white ring-1 ring-slate-200 text-slate-700 hover:text-primary-700 hover:ring-primary-300 hover:bg-primary-50 transition"
                :title="$t('leads.list.openConversationTitle')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {{ $t('leads.list.openConversation') }}
              </NuxtLink>
              <NuxtLink
                :to="`/admin/leads/${l.id}`"
                class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-slate-900 text-white hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow"
              >
                {{ $t('leads.list.view') }}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </NuxtLink>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- Pagination footer -->
    <div
      v-if="rows.length > 0"
      class="mt-5 flex flex-wrap items-center justify-between gap-3"
    >
      <p class="text-xs text-slate-500 tabular-nums">
        {{ $t('leads.pagination.summary', { from: fromIndex, to: toIndex, total }) }}
      </p>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-400 tabular-nums">
          {{ $t('leads.pagination.page', { page, total: pageCount }) }}
        </span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg bg-white ring-1 ring-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:ring-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          :disabled="page <= 1 || loading"
          @click="goPrev"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {{ $t('leads.pagination.previous') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          :disabled="page >= pageCount || loading"
          @click="goNext"
        >
          {{ $t('leads.pagination.next') }}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
