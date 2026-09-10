<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { CalendarAppointment, CalendarViewResponse } from '~/types/calendar'
import type { Service } from '~/types/service'
import {
  addDaysToDayKey,
  startOfIsoWeek,
  todayDayKeyInTz,
} from '~/utils/calendar-layout'

const props = defineProps<{
  botId: string
  tenantId?: string
}>()

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const cal = useCalendar(props.tenantId)
const services = useServices(props.tenantId)

type ViewMode = 'week' | 'day'

const anchorDay = ref<string>('')
const view = ref<ViewMode>('week')
const hideCancelled = ref(true)
const serviceFilter = ref<string | null>(null)
const serviceOptions = ref<Service[]>([])
const data = ref<CalendarViewResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const selected = ref<CalendarAppointment | null>(null)

const initialViewParam = route.query.view
const initialDateParam = route.query.date
if (initialViewParam === 'day' || initialViewParam === 'week') {
  view.value = initialViewParam
}

const activeTimezone = computed(() => data.value?.timezone ?? 'UTC')

function initAnchor(): void {
  if (typeof initialDateParam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(initialDateParam)) {
    anchorDay.value = initialDateParam
    return
  }
  anchorDay.value = todayDayKeyInTz(activeTimezone.value)
}

const dayKeys = computed<string[]>(() => {
  if (!anchorDay.value) return []
  if (view.value === 'day') return [anchorDay.value]
  const start = startOfIsoWeek(anchorDay.value)
  return Array.from({ length: 7 }, (_, i) => addDaysToDayKey(start, i))
})

const rangeIsoFrom = computed(() => {
  if (dayKeys.value.length === 0) return ''
  return `${dayKeys.value[0]}T00:00:00.000Z`
})
const rangeIsoTo = computed(() => {
  if (dayKeys.value.length === 0) return ''
  const last = dayKeys.value[dayKeys.value.length - 1]
  return `${addDaysToDayKey(last, 1)}T00:00:00.000Z`
})

const rangeLabel = computed(() => {
  if (dayKeys.value.length === 0) return ''
  const first = dayKeys.value[0]
  const last = dayKeys.value[dayKeys.value.length - 1]
  const fmt = (dk: string): Date => {
    const [y, m, d] = dk.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d, 12))
  }
  const short = (d: Date): string =>
    new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d)
  const long = (d: Date): string =>
    new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
  if (view.value === 'day') return long(fmt(first))
  return `${short(fmt(first))} — ${long(fmt(last))}`
})

async function load(): Promise<void> {
  if (!rangeIsoFrom.value || !rangeIsoTo.value) return
  loading.value = true
  error.value = null
  try {
    data.value = await cal.get(props.botId, rangeIsoFrom.value, rangeIsoTo.value)
    if (!anchorDay.value) initAnchor()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function loadServices(): Promise<void> {
  try {
    serviceOptions.value = await services.list(props.botId)
  } catch {
    serviceOptions.value = []
  }
}

function syncUrl(): void {
  router.replace({
    query: {
      ...route.query,
      view: view.value,
      date: anchorDay.value,
    },
  })
}

function goPrev(): void {
  const step = view.value === 'day' ? -1 : -7
  anchorDay.value = addDaysToDayKey(anchorDay.value, step)
}
function goNext(): void {
  const step = view.value === 'day' ? 1 : 7
  anchorDay.value = addDaysToDayKey(anchorDay.value, step)
}
function goToday(): void {
  anchorDay.value = todayDayKeyInTz(activeTimezone.value)
}

function setView(v: ViewMode): void {
  view.value = v
}

watch([anchorDay, view], () => {
  syncUrl()
  void load()
})

onMounted(async () => {
  initAnchor()
  await loadServices()
  await load()
})

function onEventClick(appt: CalendarAppointment): void {
  selected.value = appt
}
</script>

<template>
  <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-4 sm:p-6 space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div class="inline-flex rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
          :class="view === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="setView('week')"
        >{{ $t('admin.calendarView.viewWeek') }}</button>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
          :class="view === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="setView('day')"
        >{{ $t('admin.calendarView.viewDay') }}</button>
      </div>

      <div class="flex items-center gap-1">
        <button type="button" class="rounded-lg p-2 text-slate-600 hover:bg-slate-100" @click="goPrev">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button type="button" class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100" @click="goToday">
          {{ $t('admin.calendarView.today') }}
        </button>
        <button type="button" class="rounded-lg p-2 text-slate-600 hover:bg-slate-100" @click="goNext">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      <div class="text-base font-semibold text-slate-900 capitalize">{{ rangeLabel }}</div>

      <div class="ml-auto flex items-center gap-3 flex-wrap">
        <label class="inline-flex items-center gap-2 text-sm text-slate-600">
          <input v-model="hideCancelled" type="checkbox" class="size-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500">
          <span>{{ $t('admin.calendarView.filters.hideCancelled') }}</span>
        </label>
        <select v-model="serviceFilter" class="rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
          <option :value="null">{{ $t('admin.calendarView.filters.allServices') }}</option>
          <option v-for="s in serviceOptions" :key="s.id" :value="s.name">{{ s.name }}</option>
        </select>
        <input type="date" :value="anchorDay" class="rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" @change="(e) => { const v = (e.target as HTMLInputElement).value; if (v) anchorDay = v }">
      </div>
    </header>

    <p v-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>

    <div v-if="loading && !data" class="rounded-2xl bg-white/60 ring-1 ring-slate-200/60 p-8 text-center">
      <SpinnerInline />
    </div>

    <CalendarWeekView
      v-else-if="data"
      :data="data"
      :day-keys="dayKeys"
      :hide-cancelled="hideCancelled"
      :service-filter="serviceFilter"
      :locale="locale"
      @click-event="onEventClick"
    />

    <div v-if="data && data.appointments.length === 0 && data.blocks.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-slate-500">
      {{ $t('admin.calendarView.empty') }}
    </div>

    <CalendarEventDrawer
      :appointment="selected"
      :timezone="activeTimezone"
      :tenant-id="tenantId"
      :locale="locale"
      @close="selected = null"
    />
  </section>
</template>
