<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Meeting } from '~/types/meeting'

const props = defineProps<{
  phone: string
  /** Pass for superadmin context; omit for the tenant owner context. */
  tenantId?: string
  /** Visual tone: `light` for tenant admin, `dark` for superadmin. */
  tone?: 'light' | 'dark'
}>()

const tone = computed(() => props.tone ?? 'light')
const customers = useCustomers(props.tenantId)

const meetings = ref<Meeting[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    meetings.value = await customers.meetings(props.phone)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

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

const groups = computed(() => {
  const upcoming: Meeting[] = []
  const past: Meeting[] = []
  const cancelled: Meeting[] = []
  const ts = now.value.getTime()
  for (const m of meetings.value) {
    if (m.status === 'CANCELLED') {
      cancelled.push(m)
      continue
    }
    if (new Date(m.endTime).getTime() >= ts) {
      upcoming.push(m)
    } else {
      past.push(m)
    }
  }
  // Upcoming sorted earliest-first so the most imminent shows on top.
  upcoming.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  )
  return { upcoming, past, cancelled }
})

const totalCount = computed(() => meetings.value.length)

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
  const tFmt = { hour: '2-digit', minute: '2-digit' } as const
  return `${s.toLocaleTimeString(undefined, tFmt)} – ${e.toLocaleTimeString(undefined, tFmt)}`
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

onMounted(() => {
  void load()
})
</script>

<template>
  <section
    class="rounded-2xl ring-1 shadow-glass overflow-hidden"
    :class="
      tone === 'dark'
        ? 'bg-slate-900/70 ring-slate-700/50 shadow-glass-lg'
        : 'bg-white/70 backdrop-blur-xl ring-white/50'
    "
  >
    <header
      class="flex items-center justify-between px-5 py-4 border-b"
      :class="tone === 'dark' ? 'border-slate-800' : 'border-slate-100'"
    >
      <div class="flex items-center gap-3">
        <div
          class="grid place-items-center size-10 rounded-xl"
          :class="
            tone === 'dark'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-emerald-50 text-emerald-600'
          "
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div>
          <h2
            class="text-sm font-semibold"
            :class="tone === 'dark' ? 'text-slate-100' : 'text-slate-900'"
          >
            Reuniones agendadas
          </h2>
          <p
            class="text-xs mt-0.5"
            :class="tone === 'dark' ? 'text-slate-500' : 'text-slate-500'"
          >
            Histórico de meets con este cliente
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="!loading"
          class="text-xs px-2.5 py-1 rounded-full font-medium"
          :class="
            tone === 'dark'
              ? 'bg-slate-800 text-slate-300'
              : 'bg-slate-100 text-slate-600'
          "
        >
          {{ totalCount }}
        </span>
        <button
          type="button"
          class="text-xs"
          :class="
            tone === 'dark'
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-500 hover:text-slate-700'
          "
          :disabled="loading"
          @click="load"
        >
          {{ loading ? 'Cargando…' : 'Recargar' }}
        </button>
      </div>
    </header>

    <p
      v-if="error"
      class="mx-5 my-3 rounded-md px-3 py-2 text-xs"
      :class="
        tone === 'dark'
          ? 'border border-danger-800 bg-danger-950 text-danger-300'
          : 'border border-danger-200 bg-danger-50 text-danger-700'
      "
    >
      {{ error }}
    </p>

    <div v-if="loading" class="p-5">
      <SpinnerInline :tone="tone === 'dark' ? 'dark' : undefined" />
    </div>

    <div
      v-else-if="totalCount === 0"
      class="px-5 py-10 text-center"
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
      <p
        class="text-sm font-medium"
        :class="tone === 'dark' ? 'text-slate-300' : 'text-slate-700'"
      >
        Sin reuniones agendadas
      </p>
      <p
        class="text-xs mt-1"
        :class="tone === 'dark' ? 'text-slate-500' : 'text-slate-500'"
      >
        Cuando el bot agende una reunión con este cliente, aparecerá aquí.
      </p>
    </div>

    <div v-else class="divide-y" :class="tone === 'dark' ? 'divide-slate-800' : 'divide-slate-100'">
      <template v-for="(list, group) in groups" :key="group">
        <template v-if="list.length > 0">
          <div
            class="px-5 py-2 text-[11px] uppercase tracking-wider font-semibold"
            :class="
              group === 'upcoming'
                ? (tone === 'dark' ? 'bg-emerald-950/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                : (tone === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-slate-50 text-slate-500')
            "
          >
            <span v-if="group === 'upcoming'">Próximas ({{ list.length }})</span>
            <span v-else-if="group === 'past'">Pasadas ({{ list.length }})</span>
            <span v-else>Canceladas ({{ list.length }})</span>
          </div>

          <article
            v-for="m in list"
            :key="m.id"
            class="px-5 py-4 flex gap-4 items-start hover:bg-opacity-50 transition"
            :class="tone === 'dark' ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'"
          >
            <!-- Date pill -->
            <div
              class="shrink-0 grid place-items-center w-14 text-center rounded-xl py-2"
              :class="
                group === 'cancelled'
                  ? (tone === 'dark' ? 'bg-slate-800 text-slate-500 line-through' : 'bg-slate-100 text-slate-400 line-through')
                  : group === 'upcoming'
                    ? (tone === 'dark' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
                    : (tone === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')
              "
            >
              <div class="text-[10px] font-medium uppercase tracking-wider opacity-70">
                {{ new Date(m.startTime).toLocaleString(undefined, { month: 'short' }) }}
              </div>
              <div class="text-lg font-bold leading-none mt-0.5">
                {{ new Date(m.startTime).getDate() }}
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3
                  class="text-sm font-semibold truncate"
                  :class="
                    group === 'cancelled'
                      ? (tone === 'dark' ? 'text-slate-500 line-through' : 'text-slate-400 line-through')
                      : (tone === 'dark' ? 'text-slate-100' : 'text-slate-900')
                  "
                >
                  {{ m.topic || 'Reunión' }}
                </h3>
                <span
                  v-if="group === 'cancelled'"
                  class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  :class="tone === 'dark' ? 'bg-danger-950 text-danger-300' : 'bg-danger-100 text-danger-700'"
                >Cancelada</span>
                <span
                  v-else-if="group === 'upcoming'"
                  class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  :class="tone === 'dark' ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-700'"
                >{{ fmtRelative(m.startTime) }}</span>
              </div>

              <div
                class="mt-1 text-xs flex flex-wrap gap-x-3 gap-y-1"
                :class="tone === 'dark' ? 'text-slate-400' : 'text-slate-600'"
              >
                <span class="inline-flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {{ fmtDateLong(m.startTime) }} · {{ fmtTimeRange(m.startTime, m.endTime) }}
                </span>
              </div>

              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                  :class="tone === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3"><path d="M9 7V5a3 3 0 0 1 6 0v2" /><path d="M3 7h18v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" /></svg>
                  {{ m.botName }}
                </span>
                <span
                  v-if="m.attendeeName"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                  :class="tone === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  {{ m.attendeeName }}
                </span>
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono"
                  :class="tone === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  {{ m.attendeeEmail }}
                </span>
              </div>
            </div>

            <!-- Action -->
            <div class="shrink-0">
              <a
                v-if="m.meetLink && group !== 'cancelled'"
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
        </template>
      </template>
    </div>
  </section>
</template>
