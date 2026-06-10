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
      <button
        type="button"
        class="text-left rounded-2xl px-4 py-3 border transition group"
        :class="[
          tab === 'UPCOMING'
            ? (tone === 'dark' ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-emerald-600 text-white border-emerald-600 shadow-glass')
            : (tone === 'dark' ? 'bg-slate-900/70 text-slate-100 border-slate-700 hover:bg-slate-800' : 'bg-white/70 backdrop-blur-xl text-slate-900 border-white/60 hover:bg-white shadow-glass'),
        ]"
        @click="tab = 'UPCOMING'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">{{ $t('meetings.explorer.tabUpcoming') }}</div>
        <div class="mt-1 flex items-baseline gap-2">
          <span class="text-2xl font-bold">{{ counts.upcoming }}</span>
          <span class="text-xs opacity-60">/ {{ counts.total }}</span>
        </div>
      </button>

      <button
        type="button"
        class="text-left rounded-2xl px-4 py-3 border transition"
        :class="[
          tab === 'PAST'
            ? (tone === 'dark' ? 'bg-white text-slate-900 border-white' : 'bg-slate-900 text-white border-slate-900 shadow-glass')
            : (tone === 'dark' ? 'bg-slate-900/70 text-slate-100 border-slate-700 hover:bg-slate-800' : 'bg-white/70 backdrop-blur-xl text-slate-900 border-white/60 hover:bg-white shadow-glass'),
        ]"
        @click="tab = 'PAST'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">{{ $t('meetings.explorer.tabPast') }}</div>
        <div class="text-2xl font-bold mt-1">{{ counts.past }}</div>
      </button>

      <button
        type="button"
        class="text-left rounded-2xl px-4 py-3 border transition"
        :class="[
          tab === 'CANCELLED'
            ? (tone === 'dark' ? 'bg-danger-500 text-white border-danger-500' : 'bg-danger-600 text-white border-danger-600 shadow-glass')
            : (tone === 'dark' ? 'bg-slate-900/70 text-slate-100 border-slate-700 hover:bg-slate-800' : 'bg-white/70 backdrop-blur-xl text-slate-900 border-white/60 hover:bg-white shadow-glass'),
        ]"
        @click="tab = 'CANCELLED'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">{{ $t('meetings.explorer.tabCancelled') }}</div>
        <div class="text-2xl font-bold mt-1">{{ counts.cancelled }}</div>
      </button>

      <button
        type="button"
        class="text-left rounded-2xl px-4 py-3 border transition"
        :class="[
          tab === 'ALL'
            ? (tone === 'dark' ? 'bg-violet-500 text-white border-violet-500' : 'bg-violet-600 text-white border-violet-600 shadow-glass')
            : (tone === 'dark' ? 'bg-slate-900/70 text-slate-100 border-slate-700 hover:bg-slate-800' : 'bg-white/70 backdrop-blur-xl text-slate-900 border-white/60 hover:bg-white shadow-glass'),
        ]"
        @click="tab = 'ALL'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">{{ $t('meetings.explorer.tabAll') }}</div>
        <div class="text-2xl font-bold mt-1">{{ counts.total }}</div>
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
            class="rounded-2xl ring-1 p-4 flex gap-4 transition group"
            :class="[
              tone === 'dark'
                ? 'bg-slate-900/70 ring-slate-700/50 hover:bg-slate-800/70'
                : 'bg-white/70 backdrop-blur-xl ring-white/50 shadow-glass hover:bg-white',
            ]"
          >
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
