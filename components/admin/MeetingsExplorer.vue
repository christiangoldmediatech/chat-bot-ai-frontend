<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { Meeting, MeetingStatus } from '~/types/meeting'

const props = defineProps<{
  /** Pass for superadmin context; omit for the tenant owner context. */
  tenantId?: string
  tone?: 'light' | 'dark'
}>()

const tone = computed(() => props.tone ?? 'light')

const meetingsApi = useMeetings(props.tenantId)
const botsApi = useBots(props.tenantId)

/**
 * Per-tab tone for the light-mode (admin) surface. Mirrors the StatCard
 * recipe used on /admin so the meetings page reads as part of the same set.
 *  - UPCOMING  → emerald (positive / next action)
 *  - PAST      → slate (neutral / history)
 *  - CANCELLED → rose (danger)
 *  - ALL       → indigo (primary aggregate)
 */
const tabPalette = {
  UPCOMING: {
    inactiveCard: 'bg-gradient-to-br from-emerald-50 via-white to-white ring-emerald-200/70 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.18),0_3px_8px_-4px_rgba(16,185,129,0.10)]',
    activeCard: 'bg-gradient-to-br from-emerald-100 via-emerald-50 to-white ring-2 ring-emerald-400 shadow-[0_14px_32px_-14px_rgba(16,185,129,0.35),0_4px_10px_-4px_rgba(16,185,129,0.16),0_-2px_8px_-4px_rgba(16,185,129,0.08)]',
    pill: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    label: 'text-emerald-700/80',
    value: 'text-emerald-900',
    halo: 'bg-emerald-300/40',
  },
  PAST: {
    inactiveCard: 'bg-gradient-to-br from-slate-50 via-white to-white ring-slate-200/70 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12),0_3px_8px_-4px_rgba(15,23,42,0.06)]',
    activeCard: 'bg-gradient-to-br from-slate-100 via-slate-50 to-white ring-2 ring-slate-400 shadow-[0_14px_32px_-14px_rgba(15,23,42,0.22),0_4px_10px_-4px_rgba(15,23,42,0.10),0_-2px_8px_-4px_rgba(15,23,42,0.05)]',
    pill: 'bg-gradient-to-br from-slate-500 to-slate-700',
    label: 'text-slate-600',
    value: 'text-slate-900',
    halo: 'bg-slate-300/30',
  },
  CANCELLED: {
    inactiveCard: 'bg-gradient-to-br from-rose-50 via-white to-white ring-rose-200/70 shadow-[0_8px_24px_-12px_rgba(244,63,94,0.18),0_3px_8px_-4px_rgba(244,63,94,0.10)]',
    activeCard: 'bg-gradient-to-br from-rose-100 via-rose-50 to-white ring-2 ring-rose-400 shadow-[0_14px_32px_-14px_rgba(244,63,94,0.30),0_4px_10px_-4px_rgba(244,63,94,0.14),0_-2px_8px_-4px_rgba(244,63,94,0.07)]',
    pill: 'bg-gradient-to-br from-rose-500 to-rose-600',
    label: 'text-rose-700/80',
    value: 'text-rose-900',
    halo: 'bg-rose-300/40',
  },
  ALL: {
    inactiveCard: 'bg-gradient-to-br from-indigo-50 via-white to-white ring-indigo-200/70 shadow-[0_8px_24px_-12px_rgba(79,70,229,0.18),0_3px_8px_-4px_rgba(79,70,229,0.10)]',
    activeCard: 'bg-gradient-to-br from-indigo-100 via-indigo-50 to-white ring-2 ring-indigo-400 shadow-[0_14px_32px_-14px_rgba(79,70,229,0.32),0_4px_10px_-4px_rgba(79,70,229,0.14),0_-2px_8px_-4px_rgba(79,70,229,0.07)]',
    pill: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    label: 'text-indigo-700/80',
    value: 'text-indigo-900',
    halo: 'bg-indigo-300/40',
  },
} as const

const rows = ref<Meeting[]>([])
const bots = ref<Bot[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

type Tab = 'UPCOMING' | 'PAST' | 'CANCELLED' | 'ALL'
const tab = ref<Tab>('UPCOMING')
const botFilter = ref<string>('')
const search = ref('')
type GroupMode = 'flat' | 'bot' | 'customer'
const groupBy = ref<GroupMode>('flat')

const now = ref(new Date())
let tickHandle: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  tickHandle = setInterval(() => {
    now.value = new Date()
  }, 60_000)
})
onUnmounted(() => {
  if (tickHandle) clearInterval(tickHandle)
})

const counts = computed(() => {
  const ts = now.value.getTime()
  let upcoming = 0
  let past = 0
  let cancelled = 0
  for (const m of rows.value) {
    if (m.status === 'CANCELLED') cancelled++
    else if (new Date(m.endTime).getTime() >= ts) upcoming++
    else past++
  }
  return { upcoming, past, cancelled, total: rows.value.length }
})

function statusBucket(m: Meeting): Tab {
  if (m.status === 'CANCELLED') return 'CANCELLED'
  return new Date(m.endTime).getTime() >= now.value.getTime() ? 'UPCOMING' : 'PAST'
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter((m) => {
    if (tab.value !== 'ALL' && statusBucket(m) !== tab.value) return false
    if (botFilter.value && m.botId !== botFilter.value) return false
    if (q) {
      const hit =
        (m.attendeeName ?? '').toLowerCase().includes(q) ||
        m.attendeeEmail.toLowerCase().includes(q) ||
        m.customerPhone.toLowerCase().includes(q) ||
        (m.topic ?? '').toLowerCase().includes(q) ||
        m.botName.toLowerCase().includes(q)
      if (!hit) return false
    }
    return true
  })
})

interface Bucket {
  key: string
  label: string
  sublabel?: string
  meetings: Meeting[]
}

const grouped = computed<Bucket[]>(() => {
  if (groupBy.value === 'flat') {
    return [{ key: 'all', label: '', meetings: filtered.value }]
  }
  const map = new Map<string, Bucket>()
  for (const m of filtered.value) {
    let key: string
    let label: string
    let sublabel: string | undefined
    if (groupBy.value === 'bot') {
      key = m.botId
      label = m.botName
      sublabel = undefined
    } else {
      key = m.customerPhone
      label = m.attendeeName || m.customerPhone
      sublabel = m.customerPhone
    }
    const existing = map.get(key)
    if (existing) {
      existing.meetings.push(m)
    } else {
      map.set(key, { key, label, sublabel, meetings: [m] })
    }
  }
  const buckets = Array.from(map.values())
  buckets.sort((a, b) => b.meetings.length - a.meetings.length)
  return buckets
})

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [list, botList] = await Promise.all([
      meetingsApi.list(),
      botsApi.list().catch(() => [] as Bot[]),
    ])
    rows.value = list
    bots.value = botList
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

function fmtDateLong(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtTimeRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const t = { hour: '2-digit', minute: '2-digit' } as const
  return `${s.toLocaleTimeString(undefined, t)} – ${e.toLocaleTimeString(undefined, t)}`
}

function fmtRelative(value: string): string {
  const diffMs = new Date(value).getTime() - now.value.getTime()
  const diffMin = Math.round(diffMs / 60_000)
  const abs = Math.abs(diffMin)
  if (abs < 60) return diffMin >= 0 ? `en ${abs} min` : `hace ${abs} min`
  const hours = Math.round(abs / 60)
  if (hours < 24) return diffMin >= 0 ? `en ${hours} h` : `hace ${hours} h`
  const days = Math.round(hours / 24)
  return diffMin >= 0 ? `en ${days} d` : `hace ${days} d`
}

function customerHref(m: Meeting): string {
  const phone = encodeURIComponent(m.customerPhone)
  return props.tenantId
    ? `/superadmin/companies/${props.tenantId}/customers/${phone}`
    : `/admin/customers/${phone}`
}

await load()
</script>

<template>
  <div>
    <!-- Stats: 4 clickable cards driving the active tab -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <!-- UPCOMING -->
      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="[
          tone === 'dark'
            ? (tab === 'UPCOMING'
              ? 'bg-emerald-500 text-slate-950 ring-emerald-500'
              : 'bg-slate-900/70 text-slate-100 ring-slate-700 hover:bg-slate-800')
            : (tab === 'UPCOMING' ? tabPalette.UPCOMING.activeCard : tabPalette.UPCOMING.inactiveCard),
        ]"
        @click="tab = 'UPCOMING'"
      >
        <span
          v-if="tone === 'light'"
          class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70"
          :class="tabPalette.UPCOMING.halo"
          aria-hidden="true"
        />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div
              class="text-[10px] uppercase tracking-wider font-semibold"
              :class="tone === 'dark' ? 'opacity-70' : tabPalette.UPCOMING.label"
            >
              {{ $t('meetings.explorer.tabUpcoming') }}
            </div>
            <div class="mt-1 flex items-baseline gap-1.5">
              <span
                class="text-3xl font-bold tabular-nums tracking-tight"
                :class="tone === 'dark' ? '' : tabPalette.UPCOMING.value"
              >{{ counts.upcoming }}</span>
              <span class="text-xs opacity-60" :class="tone === 'light' ? 'text-slate-500' : ''">/ {{ counts.total }}</span>
            </div>
          </div>
          <div
            v-if="tone === 'light'"
            class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 ring-emerald-300/60 shadow-sm"
            :class="tabPalette.UPCOMING.pill"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </button>

      <!-- PAST -->
      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="[
          tone === 'dark'
            ? (tab === 'PAST'
              ? 'bg-white text-slate-900 ring-white'
              : 'bg-slate-900/70 text-slate-100 ring-slate-700 hover:bg-slate-800')
            : (tab === 'PAST' ? tabPalette.PAST.activeCard : tabPalette.PAST.inactiveCard),
        ]"
        @click="tab = 'PAST'"
      >
        <span
          v-if="tone === 'light'"
          class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70"
          :class="tabPalette.PAST.halo"
          aria-hidden="true"
        />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div
              class="text-[10px] uppercase tracking-wider font-semibold"
              :class="tone === 'dark' ? 'opacity-70' : tabPalette.PAST.label"
            >
              {{ $t('meetings.explorer.tabPast') }}
            </div>
            <div
              class="text-3xl font-bold tabular-nums tracking-tight mt-1"
              :class="tone === 'dark' ? '' : tabPalette.PAST.value"
            >{{ counts.past }}</div>
          </div>
          <div
            v-if="tone === 'light'"
            class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 ring-slate-400/40 shadow-sm"
            :class="tabPalette.PAST.pill"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
      </button>

      <!-- CANCELLED -->
      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="[
          tone === 'dark'
            ? (tab === 'CANCELLED'
              ? 'bg-danger-500 text-white ring-danger-500'
              : 'bg-slate-900/70 text-slate-100 ring-slate-700 hover:bg-slate-800')
            : (tab === 'CANCELLED' ? tabPalette.CANCELLED.activeCard : tabPalette.CANCELLED.inactiveCard),
        ]"
        @click="tab = 'CANCELLED'"
      >
        <span
          v-if="tone === 'light'"
          class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70"
          :class="tabPalette.CANCELLED.halo"
          aria-hidden="true"
        />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div
              class="text-[10px] uppercase tracking-wider font-semibold"
              :class="tone === 'dark' ? 'opacity-70' : tabPalette.CANCELLED.label"
            >
              {{ $t('meetings.explorer.tabCancelled') }}
            </div>
            <div
              class="text-3xl font-bold tabular-nums tracking-tight mt-1"
              :class="tone === 'dark' ? '' : tabPalette.CANCELLED.value"
            >{{ counts.cancelled }}</div>
          </div>
          <div
            v-if="tone === 'light'"
            class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 ring-rose-300/60 shadow-sm"
            :class="tabPalette.CANCELLED.pill"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        </div>
      </button>

      <!-- ALL -->
      <button
        type="button"
        class="group relative overflow-hidden text-left rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200 hover:-translate-y-0.5"
        :class="[
          tone === 'dark'
            ? (tab === 'ALL'
              ? 'bg-violet-500 text-white ring-violet-500'
              : 'bg-slate-900/70 text-slate-100 ring-slate-700 hover:bg-slate-800')
            : (tab === 'ALL' ? tabPalette.ALL.activeCard : tabPalette.ALL.inactiveCard),
        ]"
        @click="tab = 'ALL'"
      >
        <span
          v-if="tone === 'light'"
          class="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full blur-3xl opacity-70"
          :class="tabPalette.ALL.halo"
          aria-hidden="true"
        />
        <div class="relative flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div
              class="text-[10px] uppercase tracking-wider font-semibold"
              :class="tone === 'dark' ? 'opacity-70' : tabPalette.ALL.label"
            >
              {{ $t('meetings.explorer.tabAll') }}
            </div>
            <div
              class="text-3xl font-bold tabular-nums tracking-tight mt-1"
              :class="tone === 'dark' ? '' : tabPalette.ALL.value"
            >{{ counts.total }}</div>
          </div>
          <div
            v-if="tone === 'light'"
            class="flex size-9 shrink-0 items-center justify-center rounded-xl text-white ring-1 ring-indigo-300/60 shadow-sm"
            :class="tabPalette.ALL.pill"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        </div>
      </button>
    </div>

    <!-- Filters bar -->
    <div
      class="mt-4 rounded-2xl ring-1 p-3 flex flex-wrap items-center gap-2"
      :class="
        tone === 'dark'
          ? 'bg-slate-900/70 ring-slate-700/50'
          : 'bg-white/70 backdrop-blur-xl ring-white/50 shadow-glass'
      "
    >
      <!-- Search -->
      <div class="relative flex-1 min-w-[16rem]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-4 absolute left-3 top-1/2 -translate-y-1/2"
          :class="tone === 'dark' ? 'text-slate-500' : 'text-slate-400'"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="$t('meetings.explorer.searchPlaceholder')"
          class="w-full rounded-md pl-9 pr-3 py-1.5 text-sm"
          :class="
            tone === 'dark'
              ? 'border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500'
              : 'border border-slate-300 bg-white text-slate-900'
          "
        >
      </div>

      <select
        v-model="botFilter"
        class="rounded-md px-3 py-1.5 text-sm"
        :class="
          tone === 'dark'
            ? 'border border-slate-700 bg-slate-900 text-slate-100'
            : 'border border-slate-300 bg-white text-slate-900'
        "
      >
        <option value="">{{ $t('meetings.explorer.allBots') }}</option>
        <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>

      <!-- Group-by segmented control -->
      <div
        class="inline-flex rounded-md overflow-hidden border"
        :class="tone === 'dark' ? 'border-slate-700' : 'border-slate-300'"
      >
        <button
          v-for="g in (['flat','bot','customer'] as const)"
          :key="g"
          type="button"
          class="px-3 py-1.5 text-xs font-medium transition"
          :class="
            groupBy === g
              ? (tone === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white')
              : (tone === 'dark' ? 'bg-slate-900 text-slate-400 hover:text-slate-100' : 'bg-white text-slate-600 hover:text-slate-900')
          "
          @click="groupBy = g"
        >
          <span v-if="g === 'flat'">{{ $t('meetings.explorer.groupFlat') }}</span>
          <span v-else-if="g === 'bot'">{{ $t('meetings.explorer.groupByBot') }}</span>
          <span v-else>{{ $t('meetings.explorer.groupByCustomer') }}</span>
        </button>
      </div>

      <button
        type="button"
        class="text-xs ml-auto"
        :class="
          tone === 'dark'
            ? 'text-slate-400 hover:text-slate-200'
            : 'text-slate-500 hover:text-slate-700'
        "
        :disabled="loading"
        @click="load"
      >
        {{ loading ? $t('common.loading') : '↻ ' + $t('common.reload') }}
      </button>
    </div>

    <p
      v-if="error"
      class="mt-4 rounded-md px-3 py-2 text-sm"
      :class="
        tone === 'dark'
          ? 'border border-danger-800 bg-danger-950 text-danger-300'
          : 'border border-danger-200 bg-danger-50 text-danger-700'
      "
    >
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" :tone="tone === 'dark' ? 'dark' : undefined" />

    <div
      v-else-if="filtered.length === 0"
      class="mt-6 rounded-2xl p-10 text-center"
      :class="
        tone === 'dark'
          ? 'bg-slate-900/70 ring-1 ring-slate-700/50 text-slate-400'
          : 'bg-white/70 ring-1 ring-white/50 text-slate-500 shadow-glass'
      "
    >
      <div
        class="mx-auto grid place-items-center size-14 rounded-full mb-3"
        :class="
          tone === 'dark' ? 'bg-slate-800/60 text-slate-500' : 'bg-slate-100 text-slate-400'
        "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-6">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
        </svg>
      </div>
      <p class="text-sm font-medium" :class="tone === 'dark' ? 'text-slate-300' : 'text-slate-700'">
        {{ rows.length === 0 ? $t('meetings.explorer.emptyTitle') : $t('meetings.explorer.emptyTitleFiltered') }}
      </p>
      <p class="text-xs mt-1">
        {{ rows.length === 0 ? $t('meetings.explorer.emptyBody') : $t('meetings.explorer.emptyBodyFiltered') }}
      </p>
    </div>

    <!-- Groups + meetings -->
    <div v-else class="mt-4 space-y-6">
      <div
        v-for="bucket in grouped"
        :key="bucket.key"
      >
        <header
          v-if="bucket.label"
          class="flex items-center gap-2 px-1 mb-2"
        >
          <span
            class="text-xs uppercase tracking-wider font-semibold"
            :class="tone === 'dark' ? 'text-slate-400' : 'text-slate-500'"
          >
            {{ bucket.label }}
          </span>
          <span
            v-if="bucket.sublabel"
            class="text-xs font-mono"
            :class="tone === 'dark' ? 'text-slate-600' : 'text-slate-400'"
          >
            {{ bucket.sublabel }}
          </span>
          <span
            class="ml-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            :class="
              tone === 'dark'
                ? 'bg-slate-800 text-slate-400'
                : 'bg-slate-100 text-slate-500'
            "
          >
            {{ bucket.meetings.length }}
          </span>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <article
            v-for="m in bucket.meetings"
            :key="m.id"
            class="relative overflow-hidden rounded-2xl ring-1 p-4 flex gap-4 transition-all duration-200 group"
            :class="[
              tone === 'dark'
                ? 'bg-slate-900/70 ring-slate-700/50 hover:bg-slate-800/70'
                : (statusBucket(m) === 'UPCOMING'
                  ? 'bg-gradient-to-br from-emerald-50/70 via-white to-white ring-emerald-200/60 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.18),0_3px_8px_-4px_rgba(16,185,129,0.08)] hover:-translate-y-0.5'
                  : statusBucket(m) === 'CANCELLED'
                    ? 'bg-gradient-to-br from-rose-50/70 via-white to-white ring-rose-200/60 shadow-[0_8px_24px_-12px_rgba(244,63,94,0.16),0_3px_8px_-4px_rgba(244,63,94,0.08)] hover:-translate-y-0.5'
                    : 'bg-gradient-to-br from-slate-50 via-white to-white ring-slate-200/70 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12),0_3px_8px_-4px_rgba(15,23,42,0.05)] hover:-translate-y-0.5'),
            ]"
          >
            <!-- Left accent bar (light mode) signals status at a glance -->
            <span
              v-if="tone === 'light'"
              class="pointer-events-none absolute inset-y-0 left-0 w-1"
              :class="statusBucket(m) === 'UPCOMING'
                ? 'bg-gradient-to-b from-emerald-400 to-emerald-600'
                : statusBucket(m) === 'CANCELLED'
                  ? 'bg-gradient-to-b from-rose-400 to-rose-600'
                  : 'bg-gradient-to-b from-slate-300 to-slate-400'"
              aria-hidden="true"
            />
            <!-- Date pill -->
            <div
              class="shrink-0 grid place-items-center w-16 text-center rounded-xl py-2"
              :class="[
                statusBucket(m) === 'CANCELLED'
                  ? (tone === 'dark' ? 'bg-slate-800 text-slate-500 line-through' : 'bg-slate-100 text-slate-400 line-through')
                  : statusBucket(m) === 'UPCOMING'
                    ? (tone === 'dark' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
                    : (tone === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'),
              ]"
            >
              <div class="text-[10px] font-medium uppercase tracking-wider opacity-70">
                {{ new Date(m.startTime).toLocaleString(undefined, { month: 'short' }) }}
              </div>
              <div class="text-xl font-bold leading-none mt-0.5">
                {{ new Date(m.startTime).getDate() }}
              </div>
              <div class="text-[10px] font-medium opacity-80 mt-1">
                {{ new Date(m.startTime).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }) }}
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3
                  class="text-sm font-semibold truncate"
                  :class="[
                    statusBucket(m) === 'CANCELLED'
                      ? (tone === 'dark' ? 'text-slate-500 line-through' : 'text-slate-400 line-through')
                      : (tone === 'dark' ? 'text-slate-100' : 'text-slate-900'),
                  ]"
                >
                  {{ m.topic || $t('meetings.card.fallbackTopic') }}
                </h3>
                <span
                  v-if="statusBucket(m) === 'CANCELLED'"
                  class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  :class="tone === 'dark' ? 'bg-danger-950 text-danger-300' : 'bg-danger-100 text-danger-700'"
                >Cancelada</span>
                <span
                  v-else-if="statusBucket(m) === 'UPCOMING'"
                  class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  :class="tone === 'dark' ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-700'"
                >{{ fmtRelative(m.startTime) }}</span>
              </div>

              <div
                class="mt-1 text-xs"
                :class="tone === 'dark' ? 'text-slate-400' : 'text-slate-600'"
              >
                {{ fmtDateLong(m.startTime) }} · {{ fmtTimeRange(m.startTime, m.endTime) }}
              </div>

              <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
                <NuxtLink
                  :to="customerHref(m)"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full transition"
                  :class="
                    tone === 'dark'
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  "
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  {{ m.attendeeName || m.customerPhone }}
                </NuxtLink>
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                  :class="tone === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3"><path d="M9 7V5a3 3 0 0 1 6 0v2" /><path d="M3 7h18v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" /></svg>
                  {{ m.botName }}
                </span>
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono"
                  :class="tone === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'"
                >
                  {{ m.attendeeEmail }}
                </span>
              </div>
            </div>

            <!-- Action -->
            <div class="shrink-0 flex flex-col gap-1 items-end">
              <a
                v-if="m.meetLink && statusBucket(m) !== 'CANCELLED'"
                :href="m.meetLink"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition"
                :class="
                  tone === 'dark'
                    ? 'bg-white text-slate-900 hover:bg-slate-100'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                "
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                Meet
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>
