<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { Case, CasePriority, CaseStatus } from '~/types/case'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const casesApi = useCases()
const botsApi = useBots()

const PAGE_SIZE = 50

type StatusTab = CaseStatus | 'OPEN' | 'ALL'

const rows = ref<Case[]>([])
const total = ref(0)
const page = ref(1)
const bots = ref<Bot[]>([])
const botMap = computed(() => new Map(bots.value.map((b) => [b.id, b.name])))

const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)
const resolveModal = ref<{ id: string; note: string } | null>(null)

const statusFilter = ref<StatusTab>('OPEN')
const botFilter = ref<string>('')
const search = ref('')

// Top-of-page counts per status — pulled from a separate small fetch so the
// numbers don't change when the user paginates inside a tab. We refetch only
// when the bot filter / search change.
const counts = ref({ pending: 0, attended: 0, resolved: 0, total: 0 })

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const fromIndex = computed(() => total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1)
const toIndex = computed(() => Math.min(total.value, page.value * PAGE_SIZE))
const isFiltered = computed(() => Boolean(search.value.trim()) || Boolean(botFilter.value))

async function loadList(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const status = statusFilter.value === 'OPEN' || statusFilter.value === 'ALL'
      ? undefined
      : statusFilter.value
    const res = await casesApi.listPaginated({
      status,
      botId: botFilter.value || undefined,
      search: search.value.trim() || undefined,
      page: page.value,
      pageSize: PAGE_SIZE,
    })
    // The OPEN pseudo-tab is "anything not RESOLVED" — the backend doesn't
    // know about it, so we keep the filter client-side after fetching.
    rows.value = statusFilter.value === 'OPEN'
      ? res.items.filter((c) => c.status !== 'RESOLVED')
      : res.items
    total.value = statusFilter.value === 'OPEN'
      ? rows.value.length
      : res.total
    page.value = res.page
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

// Lightweight count pass: one paginated call per status with pageSize=1
// gives us the totals cheaply without a dedicated count endpoint.
async function loadCounts(): Promise<void> {
  try {
    const baseOpts = {
      botId: botFilter.value || undefined,
      search: search.value.trim() || undefined,
      page: 1,
      pageSize: 1,
    }
    const [p, a, r] = await Promise.all([
      casesApi.listPaginated({ ...baseOpts, status: 'PENDING' }),
      casesApi.listPaginated({ ...baseOpts, status: 'ATTENDED' }),
      casesApi.listPaginated({ ...baseOpts, status: 'RESOLVED' }),
    ])
    counts.value = {
      pending: p.total,
      attended: a.total,
      resolved: r.total,
      total: p.total + a.total + r.total,
    }
  } catch {
    // Silent — counts are decoration, the list call surfaces errors.
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

// Debounced search; resets page to 1 each keystroke cycle.
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

function onBotChange(): void {
  page.value = 1
  void load()
}

function clearFilters(): void {
  search.value = ''
  botFilter.value = ''
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

function upsert(c: Case): void {
  const idx = rows.value.findIndex((x) => x.id === c.id)
  if (idx >= 0) rows.value[idx] = c
  else rows.value.unshift(c)
}

async function markAttended(id: string): Promise<void> {
  busyId.value = id
  try {
    upsert(await casesApi.markAttended(id))
    void loadCounts()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    busyId.value = null
  }
}

async function confirmResolve(): Promise<void> {
  const ctx = resolveModal.value
  if (!ctx) return
  busyId.value = ctx.id
  try {
    upsert(await casesApi.markResolved(ctx.id, ctx.note.trim() || undefined))
    resolveModal.value = null
    void loadCounts()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    busyId.value = null
  }
}

function statusPill(status: CaseStatus): string {
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (status === 'ATTENDED') return 'bg-sky-50 text-sky-700 ring-sky-200'
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
}

function statusDot(status: CaseStatus): string {
  if (status === 'PENDING') return 'bg-amber-500'
  if (status === 'ATTENDED') return 'bg-sky-500'
  return 'bg-emerald-500'
}

function priorityPill(priority: CasePriority): string {
  if (priority === 'HIGH') return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (priority === 'LOW') return 'bg-slate-50 text-slate-600 ring-slate-200'
  return 'bg-amber-50 text-amber-700 ring-amber-200'
}

// Per-tab visual recipe — matches the StatCard tones used elsewhere in /admin.
const tabPalette = {
  OPEN: {
    inactive: 'bg-gradient-to-br from-primary-50 via-white to-white ring-primary-200/70 shadow-[0_8px_24px_-12px_rgba(79,70,229,0.18),0_3px_8px_-4px_rgba(79,70,229,0.08)]',
    active: 'bg-gradient-to-br from-primary-100 via-primary-50 to-white ring-2 ring-primary-400 shadow-[0_14px_32px_-14px_rgba(79,70,229,0.32),0_4px_10px_-4px_rgba(79,70,229,0.14),0_-2px_8px_-4px_rgba(79,70,229,0.07)]',
    pill: 'bg-gradient-to-br from-primary-500 to-indigo-600 ring-indigo-300/60',
    label: 'text-primary-700/80',
    value: 'text-primary-900',
    halo: 'bg-indigo-300/40',
  },
  PENDING: {
    inactive: 'bg-gradient-to-br from-amber-50 via-white to-white ring-amber-200/70 shadow-[0_8px_24px_-12px_rgba(245,158,11,0.20),0_3px_8px_-4px_rgba(245,158,11,0.10)]',
    active: 'bg-gradient-to-br from-amber-100 via-amber-50 to-white ring-2 ring-amber-400 shadow-[0_14px_32px_-14px_rgba(245,158,11,0.34),0_4px_10px_-4px_rgba(245,158,11,0.16),0_-2px_8px_-4px_rgba(245,158,11,0.08)]',
    pill: 'bg-gradient-to-br from-amber-500 to-orange-500 ring-amber-300/60',
    label: 'text-amber-700/80',
    value: 'text-amber-900',
    halo: 'bg-amber-300/40',
  },
  ATTENDED: {
    inactive: 'bg-gradient-to-br from-sky-50 via-white to-white ring-sky-200/70 shadow-[0_8px_24px_-12px_rgba(14,165,233,0.20),0_3px_8px_-4px_rgba(14,165,233,0.10)]',
    active: 'bg-gradient-to-br from-sky-100 via-sky-50 to-white ring-2 ring-sky-400 shadow-[0_14px_32px_-14px_rgba(14,165,233,0.34),0_4px_10px_-4px_rgba(14,165,233,0.16),0_-2px_8px_-4px_rgba(14,165,233,0.08)]',
    pill: 'bg-gradient-to-br from-sky-500 to-blue-600 ring-sky-300/60',
    label: 'text-sky-700/80',
    value: 'text-sky-900',
    halo: 'bg-sky-300/40',
  },
  RESOLVED: {
    inactive: 'bg-gradient-to-br from-emerald-50 via-white to-white ring-emerald-200/70 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.20),0_3px_8px_-4px_rgba(16,185,129,0.10)]',
    active: 'bg-gradient-to-br from-emerald-100 via-emerald-50 to-white ring-2 ring-emerald-400 shadow-[0_14px_32px_-14px_rgba(16,185,129,0.34),0_4px_10px_-4px_rgba(16,185,129,0.16),0_-2px_8px_-4px_rgba(16,185,129,0.08)]',
    pill: 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-emerald-300/60',
    label: 'text-emerald-700/80',
    value: 'text-emerald-900',
    halo: 'bg-emerald-300/40',
  },
} as const

await Promise.all([loadBots(), load()])
</script>

<template>
  <div>
    <!-- Page header — primary (indigo) tone -->
    <header class="flex items-start gap-4 flex-wrap">
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white ring-1 ring-indigo-300/60 shadow-[0_8px_24px_-10px_rgba(79,70,229,0.45)]"
        aria-hidden="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">{{ $t('cases.title') }}</h1>
        <p class="text-sm text-slate-500 mt-1 max-w-2xl">{{ $t('cases.subtitle') }}</p>
      </div>

      <!-- Total chip -->
      <div
        class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-primary-50 via-white to-white ring-1 ring-primary-200/70 px-4 py-2 shadow-[0_6px_18px_-10px_rgba(79,70,229,0.30)]"
      >
        <span class="text-[10px] uppercase tracking-wider font-semibold text-primary-700/80">
          {{ isFiltered ? $t('cases.matchingLabel') : $t('cases.totalLabel') }}
        </span>
        <span class="text-xl font-bold text-primary-900 tabular-nums tracking-tight">{{ total }}</span>
      </div>
    </header>

    <!-- Stat tabs -->
    <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <!-- OPEN -->
      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="statusFilter === 'OPEN' ? tabPalette.OPEN.active : tabPalette.OPEN.inactive"
        @click="onTabChange('OPEN')"
      >
        <span class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70" :class="tabPalette.OPEN.halo" aria-hidden="true" />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider font-semibold" :class="tabPalette.OPEN.label">
              {{ $t('cases.stat.open') }}
            </div>
            <div class="mt-1 text-3xl font-bold tabular-nums tracking-tight" :class="tabPalette.OPEN.value">
              {{ counts.pending + counts.attended }}
            </div>
          </div>
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 shadow-sm" :class="tabPalette.OPEN.pill">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
        </div>
      </button>

      <!-- PENDING -->
      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="statusFilter === 'PENDING' ? tabPalette.PENDING.active : tabPalette.PENDING.inactive"
        @click="onTabChange('PENDING')"
      >
        <span class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70" :class="tabPalette.PENDING.halo" aria-hidden="true" />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider font-semibold" :class="tabPalette.PENDING.label">
              {{ $t('cases.stat.pending') }}
            </div>
            <div class="mt-1 text-3xl font-bold tabular-nums tracking-tight" :class="tabPalette.PENDING.value">{{ counts.pending }}</div>
          </div>
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 shadow-sm" :class="tabPalette.PENDING.pill">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
      </button>

      <!-- ATTENDED -->
      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="statusFilter === 'ATTENDED' ? tabPalette.ATTENDED.active : tabPalette.ATTENDED.inactive"
        @click="onTabChange('ATTENDED')"
      >
        <span class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70" :class="tabPalette.ATTENDED.halo" aria-hidden="true" />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider font-semibold" :class="tabPalette.ATTENDED.label">
              {{ $t('cases.stat.attended') }}
            </div>
            <div class="mt-1 text-3xl font-bold tabular-nums tracking-tight" :class="tabPalette.ATTENDED.value">{{ counts.attended }}</div>
          </div>
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 shadow-sm" :class="tabPalette.ATTENDED.pill">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
        </div>
      </button>

      <!-- RESOLVED -->
      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="statusFilter === 'RESOLVED' ? tabPalette.RESOLVED.active : tabPalette.RESOLVED.inactive"
        @click="onTabChange('RESOLVED')"
      >
        <span class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70" :class="tabPalette.RESOLVED.halo" aria-hidden="true" />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wider font-semibold" :class="tabPalette.RESOLVED.label">
              {{ $t('cases.stat.resolved') }}
            </div>
            <div class="mt-1 text-3xl font-bold tabular-nums tracking-tight" :class="tabPalette.RESOLVED.value">{{ counts.resolved }}</div>
          </div>
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 shadow-sm" :class="tabPalette.RESOLVED.pill">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </button>
    </div>

    <!-- Filters bar -->
    <div class="mt-4 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-3 flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-[18rem]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="$t('cases.filter.searchPlaceholder')"
          class="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none transition"
        >
      </div>

      <select
        v-model="botFilter"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none transition"
        @change="onBotChange"
      >
        <option value="">{{ $t('cases.filter.allBots') }}</option>
        <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-3.5"
          :class="{ 'animate-spin': loading }"
          aria-hidden="true"
        >
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
      {{ isFiltered ? $t('cases.list.noMatches') : $t('cases.list.empty') }}
    </div>

    <!-- Cases list -->
    <div v-else class="mt-4 space-y-3" :class="{ 'opacity-60 pointer-events-none': loading }">
      <article
        v-for="c in rows"
        :key="c.id"
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50/40 via-white to-white ring-1 ring-primary-100/60 shadow-[0_8px_24px_-12px_rgba(79,70,229,0.16),0_3px_8px_-4px_rgba(15,23,42,0.06)] p-4 flex flex-wrap gap-4 items-start transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-14px_rgba(79,70,229,0.24),0_4px_10px_-4px_rgba(15,23,42,0.08)]"
      >
        <!-- Status accent bar -->
        <span
          class="pointer-events-none absolute inset-y-0 left-0 w-1"
          :class="c.status === 'PENDING'
            ? 'bg-gradient-to-b from-amber-400 to-amber-600'
            : c.status === 'ATTENDED'
              ? 'bg-gradient-to-b from-sky-400 to-sky-600'
              : 'bg-gradient-to-b from-emerald-400 to-emerald-600'"
          aria-hidden="true"
        />

        <div class="flex items-start gap-3 flex-1 min-w-[20rem] pl-2">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-semibold text-sm ring-1 ring-indigo-300/60 shadow-sm">
            {{ (c.customerName || c.customerPhone || '?').charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/admin/customers/${encodeURIComponent(c.customerPhone)}`"
                class="text-sm font-semibold text-slate-900 hover:underline"
              >
                {{ c.customerName || c.customerPhone }}
              </NuxtLink>
              <span class="text-xs text-slate-500 font-mono">{{ c.customerPhone }}</span>
              <span
                class="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset"
                :class="statusPill(c.status)"
              >
                <span class="size-1.5 rounded-full" :class="statusDot(c.status)" />
                {{ c.status }}
              </span>
              <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset" :class="priorityPill(c.priority)">
                {{ c.priority }}
              </span>
              <span
                v-if="c.followupCount > 0"
                class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200"
              >
                {{ $t('cases.list.followupBadge') }}
              </span>
            </div>
            <p class="mt-2 text-sm text-slate-700 leading-relaxed">{{ c.summary }}</p>
            <div
              v-if="c.resolution && c.status === 'RESOLVED'"
              class="mt-2 rounded-lg bg-emerald-50/70 ring-1 ring-emerald-100 px-3 py-2 text-xs text-emerald-900"
            >
              <strong class="font-semibold text-emerald-700">{{ $t('cases.list.resolution') }}</strong> {{ c.resolution }}
            </div>
            <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span>{{ $t('cases.list.bot') }} {{ botMap.get(c.botId) ?? c.botId.slice(0, 8) }}</span>
              <span>{{ $t('cases.list.created') }} {{ new Date(c.createdAt).toLocaleString() }}</span>
              <span v-if="c.resolvedAt">{{ $t('cases.list.resolved') }} {{ new Date(c.resolvedAt).toLocaleString() }}</span>
              <span class="font-mono">→ {{ c.advisorEmail }}</span>
            </div>
          </div>
        </div>

        <div v-if="c.status !== 'RESOLVED'" class="flex flex-col gap-2 shrink-0">
          <button
            v-if="c.status === 'PENDING'"
            type="button"
            :disabled="busyId === c.id"
            class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm hover:from-sky-600 hover:to-blue-700 disabled:opacity-50 transition"
            @click="markAttended(c.id)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            {{ $t('cases.action.attend') }}
          </button>
          <button
            type="button"
            :disabled="busyId === c.id"
            class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition"
            @click="resolveModal = { id: c.id, note: '' }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {{ $t('cases.action.resolve') }}
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
        {{ $t('cases.pagination.summary', { from: fromIndex, to: toIndex, total }) }}
      </p>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-500 tabular-nums">
          {{ $t('cases.pagination.page', { page, total: pageCount }) }}
        </span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-xl bg-white ring-1 ring-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          :disabled="page <= 1 || loading"
          @click="goPrev"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {{ $t('cases.pagination.previous') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-primary-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          :disabled="page >= pageCount || loading"
          @click="goNext"
        >
          {{ $t('cases.pagination.next') }}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Resolve modal -->
    <div
      v-if="resolveModal"
      class="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="resolveModal = null"
    >
      <div class="w-full max-w-md rounded-2xl bg-white ring-1 ring-slate-200 p-6 shadow-2xl">
        <h3 class="text-base font-semibold text-slate-900">{{ $t('cases.resolveModal.title') }}</h3>
        <p class="mt-1 text-sm text-slate-600">
          {{ $t('cases.resolveModal.noteBefore') }}<strong>{{ $t('cases.resolveModal.noteEmph') }}</strong>{{ $t('cases.resolveModal.noteAfter') }}
        </p>
        <textarea
          v-model="resolveModal.note"
          rows="3"
          maxlength="2000"
          :placeholder="$t('cases.resolveModal.placeholder')"
          class="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        />
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            @click="resolveModal = null"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="busyId !== null"
            class="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
            @click="confirmResolve"
          >
            {{ busyId ? $t('common.saving') : $t('cases.resolveModal.submit') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
