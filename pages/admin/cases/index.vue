<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Case, CasePriority, CaseStatus } from '~/types/case'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const casesApi = useCases()
const activeBot = useActiveBotStore()

const PAGE_SIZE = 25

type StatusTab = CaseStatus | 'OPEN' | 'ALL'

const rows = ref<Case[]>([])
const total = ref(0)
const page = ref(1)
const bots = ref<{ id: string, name: string }[]>([])
const botMap = computed(() => new Map(bots.value.map(b => [b.id, b.name])))

const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)
const resolveModal = ref<{ id: string, note: string } | null>(null)

const statusFilter = ref<StatusTab>('OPEN')
const search = ref('')

const counts = ref({ pending: 0, attended: 0, resolved: 0, total: 0 })

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const fromIndex = computed(() => total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1)
const toIndex = computed(() => Math.min(total.value, page.value * PAGE_SIZE))
const isFiltered = computed(() => Boolean(search.value.trim()))

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
    const status = statusFilter.value === 'OPEN' || statusFilter.value === 'ALL'
      ? undefined
      : statusFilter.value
    const res = await casesApi.listPaginated({
      status,
      botId: bid,
      search: search.value.trim() || undefined,
      page: page.value,
      pageSize: PAGE_SIZE,
    })
    rows.value = statusFilter.value === 'OPEN'
      ? res.items.filter(c => c.status !== 'RESOLVED')
      : res.items
    total.value = statusFilter.value === 'OPEN' ? rows.value.length : res.total
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
    const baseOpts = {
      botId: bid,
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
    // Silent — counts are decoration.
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

function clearFilters(): void {
  search.value = ''
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
  const idx = rows.value.findIndex(x => x.id === c.id)
  if (idx >= 0) rows.value[idx] = c
  else rows.value.unshift(c)
}

async function markAttended(id: string): Promise<void> {
  busyId.value = id
  try {
    const res = await casesApi.attend(id)
    upsert(res.case)
    void loadCounts()
    if (typeof window !== 'undefined') {
      window.open(`/admin/conversations/${res.conversation.id}`, '_blank', 'noopener')
    }
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

const statusTone: Record<CaseStatus, {
  dot: string
  text: string
  bg: string
  ring: string
  hoverRing: string
  hoverShadow: string
}> = {
  PENDING: {
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    hoverRing: 'group-hover:ring-amber-300',
    hoverShadow: 'group-hover:shadow-[0_14px_32px_-16px_rgba(245,158,11,0.35)]',
  },
  ATTENDED: {
    dot: 'bg-sky-500',
    text: 'text-sky-700',
    bg: 'bg-sky-50',
    ring: 'ring-sky-200',
    hoverRing: 'group-hover:ring-sky-300',
    hoverShadow: 'group-hover:shadow-[0_14px_32px_-16px_rgba(14,165,233,0.35)]',
  },
  RESOLVED: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    hoverRing: 'group-hover:ring-emerald-300',
    hoverShadow: 'group-hover:shadow-[0_14px_32px_-16px_rgba(16,185,129,0.3)]',
  },
}

const priorityTone: Record<CasePriority, { chip: string, icon: boolean }> = {
  HIGH: { chip: 'bg-rose-50 text-rose-700 ring-rose-200', icon: true },
  NORMAL: { chip: 'text-slate-500', icon: false },
  LOW: { chip: 'text-slate-400', icon: false },
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
  activeBg: string
  dot: string
}

const tabs = computed<Tab[]>(() => [
  {
    key: 'OPEN',
    labelKey: 'cases.stat.open',
    value: computed(() => counts.value.pending + counts.value.attended),
    accent: 'text-slate-900',
    activeRing: 'ring-slate-900',
    activeBg: 'bg-slate-900 text-white',
    dot: 'bg-slate-400',
  },
  {
    key: 'PENDING',
    labelKey: 'cases.stat.pending',
    value: computed(() => counts.value.pending),
    accent: 'text-amber-700',
    activeRing: 'ring-amber-500',
    activeBg: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
  },
  {
    key: 'ATTENDED',
    labelKey: 'cases.stat.attended',
    value: computed(() => counts.value.attended),
    accent: 'text-sky-700',
    activeRing: 'ring-sky-500',
    activeBg: 'bg-sky-500 text-white',
    dot: 'bg-sky-500',
  },
  {
    key: 'RESOLVED',
    labelKey: 'cases.stat.resolved',
    value: computed(() => counts.value.resolved),
    accent: 'text-emerald-700',
    activeRing: 'ring-emerald-500',
    activeBg: 'bg-emerald-500 text-white',
    dot: 'bg-emerald-500',
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
    <!-- Header: minimal, no gradient icon -->
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div class="min-w-0">
        <div class="flex items-center gap-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
          <span class="size-1.5 rounded-full bg-slate-400" aria-hidden="true" />
          {{ $t('cases.title') }}
        </div>
        <h1 class="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
          {{ $t('cases.subtitle') }}
        </h1>
      </div>
      <div class="flex items-center gap-3 text-xs text-slate-500">
        <span class="tabular-nums">{{ total }} {{ isFiltered ? $t('cases.matchingLabel') : $t('cases.totalLabel') }}</span>
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

    <!-- Stat tabs: flat, no gradient, only the active one carries color -->
    <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
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

    <!-- Filters: single-line, inline search -->
    <div class="mt-5 flex items-center gap-2">
      <div class="relative flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="$t('cases.filter.searchPlaceholder')"
          class="w-full rounded-xl bg-white ring-1 ring-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:outline-none transition"
        >
      </div>
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
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <p class="mt-3 text-sm text-slate-500">
        {{ isFiltered ? $t('cases.list.noMatches') : $t('cases.list.empty') }}
      </p>
    </div>

    <!-- Cases list: hero summary + anchored meta -->
    <div v-else class="mt-5 space-y-3" :class="{ 'opacity-60 pointer-events-none': loading }">
      <article
        v-for="c in rows"
        :key="c.id"
        class="group relative rounded-2xl bg-white ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5"
        :class="[statusTone[c.status].hoverRing, statusTone[c.status].hoverShadow]"
      >
        <!-- Subtle colored glow on hover, keyed to status -->
        <div
          class="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          :class="statusTone[c.status].bg"
          aria-hidden="true"
          style="mask-image: linear-gradient(135deg, black 0%, transparent 50%); -webkit-mask-image: linear-gradient(135deg, black 0%, transparent 50%);"
        />

        <div class="relative p-5">
          <!-- Top band: avatar + identity + status + actions -->
          <div class="flex items-start gap-4">
            <!-- Avatar: colored by customer, visual anchor -->
            <div
              class="relative flex size-11 shrink-0 items-center justify-center rounded-xl text-white font-semibold text-sm shadow-sm ring-1 ring-white/40 transition-transform duration-300 group-hover:scale-105"
              :class="avatarColor(c.customerPhone)"
            >
              {{ (c.customerName || c.customerPhone || '?').charAt(0).toUpperCase() }}
              <!-- Status dot overlay bottom-right of avatar -->
              <span
                class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white"
                :class="statusTone[c.status].dot"
                :title="$t(`cases.status.${c.status}`)"
                aria-hidden="true"
              />
            </div>

            <!-- Identity block -->
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2 flex-wrap">
                <NuxtLink
                  :to="`/admin/customers/${encodeURIComponent(c.customerPhone)}`"
                  class="text-base font-semibold text-slate-900 hover:text-slate-600 transition truncate"
                >
                  {{ c.customerName || c.customerPhone }}
                </NuxtLink>
                <span class="text-xs text-slate-400 font-mono truncate">{{ c.customerPhone }}</span>
              </div>
              <!-- Chip row: status + priority + follow-up + crm -->
              <div class="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span
                  class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset"
                  :class="[statusTone[c.status].text, statusTone[c.status].bg, statusTone[c.status].ring]"
                >
                  <span class="size-1.5 rounded-full" :class="statusTone[c.status].dot" />
                  {{ $t(`cases.status.${c.status}`) }}
                </span>
                <!-- Priority: pill only for HIGH, text for others -->
                <span
                  v-if="c.priority === 'HIGH'"
                  class="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ring-inset"
                  :class="priorityTone.HIGH.chip"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                    <path d="M12 2 2 22h20L12 2z" />
                    <line x1="12" y1="10" x2="12" y2="14" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                  {{ $t('cases.priority.HIGH') }}
                </span>
                <span
                  v-else
                  class="text-[11px]"
                  :class="priorityTone[c.priority].chip"
                >
                  {{ $t(`cases.priority.${c.priority}`) }}
                </span>
                <span
                  v-if="c.followupCount > 0"
                  class="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-amber-600"
                  :title="`${c.followupCount} follow-ups sent`"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                    <path d="M3 11a9 9 0 0 1 9-9 9 9 0 0 1 6 15.7L21 21" />
                    <path d="M3 21v-5h5" />
                  </svg>
                  {{ $t('cases.list.followupBadge') }}
                </span>
                <a
                  v-if="c.crmLeadUrl"
                  :href="c.crmLeadUrl"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-800 transition"
                  :title="c.crmLeadUrl"
                  @click.stop
                >
                  {{ $t('cases.list.crmBadge') }}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-2.5">
                    <path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd" />
                    <path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd" />
                  </svg>
                </a>
                <!-- Relative time, floats right for scan-ability -->
                <time
                  :datetime="c.createdAt"
                  :title="new Date(c.createdAt).toLocaleString()"
                  class="ml-auto text-[11px] font-medium text-slate-400 tabular-nums"
                >
                  {{ relativeTime(c.createdAt) }}
                </time>
              </div>
            </div>
          </div>

          <!-- Summary: the hero data point, large and legible -->
          <blockquote class="mt-4 pl-4 border-l-2 border-slate-200 text-[15px] text-slate-800 leading-relaxed">
            {{ c.summary }}
          </blockquote>

          <!-- Resolution callout (RESOLVED only) -->
          <div
            v-if="c.resolution && c.status === 'RESOLVED'"
            class="mt-3 flex items-start gap-2.5 rounded-xl bg-emerald-50/70 ring-1 ring-emerald-100 px-3 py-2.5"
          >
            <div class="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div class="text-[13px] text-slate-700 leading-relaxed">
              <span class="font-semibold text-emerald-700">{{ $t('cases.list.resolution') }}</span> {{ c.resolution }}
            </div>
          </div>

          <!-- Bottom bar: meta + actions -->
          <div class="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div class="flex items-center gap-2.5 text-[11px] text-slate-500 min-w-0">
              <span class="inline-flex items-center gap-1 min-w-0" :title="`Bot: ${botMap.get(c.botId) ?? c.botId}`">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3 text-slate-400 shrink-0" aria-hidden="true">
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M12 7V3" />
                  <circle cx="8.5" cy="13" r="1" />
                  <circle cx="15.5" cy="13" r="1" />
                </svg>
                <span class="truncate font-medium">{{ botMap.get(c.botId) ?? c.botId.slice(0, 8) }}</span>
              </span>
              <span class="h-3 w-px bg-slate-200" aria-hidden="true" />
              <span class="inline-flex items-center gap-1 min-w-0" :title="`Advisor: ${c.advisorEmail}`">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3 text-slate-400 shrink-0" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span class="truncate font-mono text-slate-500">{{ c.advisorEmail }}</span>
              </span>
              <template v-if="c.resolvedAt">
                <span class="h-3 w-px bg-slate-200" aria-hidden="true" />
                <time :datetime="c.resolvedAt" :title="c.resolvedAt" class="inline-flex items-center gap-1 text-emerald-600 font-medium shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {{ relativeTime(c.resolvedAt) }}
                </time>
              </template>
            </div>

            <div v-if="c.status !== 'RESOLVED'" class="flex items-center gap-1.5 shrink-0">
              <button
                v-if="c.status === 'PENDING'"
                type="button"
                :disabled="busyId === c.id"
                class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-white ring-1 ring-sky-200 text-sky-700 hover:bg-sky-50 hover:ring-sky-400 disabled:opacity-50 transition-all duration-200"
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
                class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow"
                @click="resolveModal = { id: c.id, note: '' }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {{ $t('cases.action.resolve') }}
              </button>
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
        {{ $t('cases.pagination.summary', { from: fromIndex, to: toIndex, total }) }}
      </p>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-400 tabular-nums">
          {{ $t('cases.pagination.page', { page, total: pageCount }) }}
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
          {{ $t('cases.pagination.previous') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="resolveModal"
        class="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4"
        @click.self="resolveModal = null"
      >
        <div class="w-full max-w-md rounded-2xl bg-white ring-1 ring-slate-200 p-6 shadow-xl">
          <div class="flex items-center gap-2">
            <span class="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            <span class="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              {{ $t('cases.status.RESOLVED') }}
            </span>
          </div>
          <h3 class="mt-2 text-lg font-semibold text-slate-900">{{ $t('cases.resolveModal.title') }}</h3>
          <p class="mt-1 text-sm text-slate-500">
            {{ $t('cases.resolveModal.noteBefore') }}<strong class="text-slate-700">{{ $t('cases.resolveModal.noteEmph') }}</strong>{{ $t('cases.resolveModal.noteAfter') }}
          </p>
          <textarea
            v-model="resolveModal.note"
            rows="3"
            maxlength="2000"
            :placeholder="$t('cases.resolveModal.placeholder')"
            class="mt-4 w-full rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-none transition"
          />
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg bg-white ring-1 ring-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:ring-slate-300 transition"
              @click="resolveModal = null"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              :disabled="busyId !== null"
              class="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition"
              @click="confirmResolve"
            >
              {{ busyId ? $t('common.saving') : $t('cases.resolveModal.submit') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
