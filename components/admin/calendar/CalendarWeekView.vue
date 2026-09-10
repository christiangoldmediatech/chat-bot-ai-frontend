<script setup lang="ts">
import type {
  CalendarAppointment,
  CalendarBlock,
  CalendarViewResponse,
} from '~/types/calendar'
import {
  cancelledTone,
  formatCompactTimeRange,
  formatMinutesAsTime,
  initialsFromName,
  isoWeekdayFromDayKey,
  layoutOverlappingItems,
  pastelToneForService,
  parseHHMM,
  todayDayKeyInTz,
  toWallDayKey,
  toWallMinutes,
} from '~/utils/calendar-layout'

const props = defineProps<{
  data: CalendarViewResponse
  dayKeys: string[]
  hideCancelled: boolean
  serviceFilter: string | null
  locale: string
}>()

const emit = defineEmits<{
  clickEvent: [CalendarAppointment]
  clickBlock: [CalendarBlock]
}>()

const BUSY_MINUTE_HEIGHT = 5.0
const BUSY_HOUR_HEIGHT = 60 * BUSY_MINUTE_HEIGHT
const EMPTY_HOUR_HEIGHT = 32
const CARD_MIN_HEIGHT = 112

const todayKey = computed(() => todayDayKeyInTz(props.data.timezone))

const gridRange = computed(() => {
  let min: number | null = null
  let max: number | null = null
  for (const day of props.data.businessHours) {
    for (const r of day.ranges) {
      const s = parseHHMM(r.start)
      const e = parseHHMM(r.end)
      if (min === null || s < min) min = s
      if (max === null || e > max) max = e
    }
  }
  if (min === null || max === null) {
    min = 8 * 60
    max = 18 * 60
  }
  for (const block of props.data.blocks) {
    if (!block.allDay) {
      const s = toWallMinutes(block.startsAt, props.data.timezone)
      const e = toWallMinutes(block.endsAt, props.data.timezone)
      if (s < min) min = s
      if (e > max) max = e
    }
  }
  for (const a of props.data.appointments) {
    if (props.hideCancelled && a.status === 'CANCELLED') continue
    const s = toWallMinutes(a.startsAt, props.data.timezone)
    const e = toWallMinutes(a.endsAt, props.data.timezone)
    if (s < min) min = s
    if (e > max) max = e
  }
  min = Math.floor(min / 60) * 60
  max = Math.ceil(max / 60) * 60
  if (max <= min) max = min + 60
  return { startMin: min, endMin: max }
})

interface RawAppointmentRow {
  appt: CalendarAppointment
  startMin: number
  endMin: number
}

interface RawBlockRow {
  block: CalendarBlock
  fullDay: boolean
  startMin: number
  endMin: number
}

function rawAppointmentsForDay(dayKey: string): RawAppointmentRow[] {
  const rows: RawAppointmentRow[] = []
  for (const a of props.data.appointments) {
    if (props.hideCancelled && a.status === 'CANCELLED') continue
    if (props.serviceFilter && a.service?.name !== props.serviceFilter) continue
    const key = toWallDayKey(a.startsAt, props.data.timezone)
    if (key !== dayKey) continue
    const startMin = toWallMinutes(a.startsAt, props.data.timezone)
    const endMin = toWallMinutes(a.endsAt, props.data.timezone)
    if (endMin <= startMin) continue
    rows.push({ appt: a, startMin, endMin })
  }
  return rows
}

function rawBlocksForDay(dayKey: string): RawBlockRow[] {
  const rows: RawBlockRow[] = []
  for (const block of props.data.blocks) {
    const startDayKey = toWallDayKey(block.startsAt, props.data.timezone)
    const endDayKey = toWallDayKey(block.endsAt, props.data.timezone)
    if (dayKey < startDayKey || dayKey > endDayKey) continue
    const rawStart = dayKey === startDayKey
      ? toWallMinutes(block.startsAt, props.data.timezone)
      : gridRange.value.startMin
    let rawEnd = dayKey === endDayKey
      ? toWallMinutes(block.endsAt, props.data.timezone)
      : gridRange.value.endMin
    if (rawEnd === 0 && dayKey !== endDayKey) rawEnd = gridRange.value.endMin
    const startsAtDayStart = dayKey !== startDayKey || rawStart <= gridRange.value.startMin
    const spansEndOfDay = dayKey !== endDayKey
    const fullDay = block.allDay || (startsAtDayStart && spansEndOfDay)
    const startMin = fullDay ? gridRange.value.startMin : Math.max(rawStart, gridRange.value.startMin)
    const endMin = fullDay ? gridRange.value.endMin : Math.min(rawEnd, gridRange.value.endMin)
    if (endMin <= startMin) continue
    rows.push({ block, fullDay, startMin, endMin })
  }
  return rows
}

const busyHours = computed(() => {
  const set = new Set<number>()
  for (const dayKey of props.dayKeys) {
    for (const a of rawAppointmentsForDay(dayKey)) {
      const startHour = Math.floor(a.startMin / 60) * 60
      const endHour = Math.ceil(a.endMin / 60) * 60
      for (let h = startHour; h < endHour; h += 60) set.add(h)
    }
    for (const b of rawBlocksForDay(dayKey)) {
      if (b.fullDay) continue
      const startHour = Math.floor(b.startMin / 60) * 60
      const endHour = Math.ceil(b.endMin / 60) * 60
      for (let h = startHour; h < endHour; h += 60) set.add(h)
    }
  }
  return set
})

interface HourSegment {
  startMin: number
  offsetPx: number
  heightPx: number
  busy: boolean
}

const hourSegments = computed<HourSegment[]>(() => {
  const segs: HourSegment[] = []
  let offset = 0
  for (let h = gridRange.value.startMin; h < gridRange.value.endMin; h += 60) {
    const busy = busyHours.value.has(h)
    const heightPx = busy ? BUSY_HOUR_HEIGHT : EMPTY_HOUR_HEIGHT
    segs.push({ startMin: h, offsetPx: offset, heightPx, busy })
    offset += heightPx
  }
  return segs
})

const totalHeight = computed(() => {
  const last = hourSegments.value[hourSegments.value.length - 1]
  return last ? last.offsetPx + last.heightPx : 0
})

function minuteToY(min: number): number {
  if (hourSegments.value.length === 0) return 0
  for (const seg of hourSegments.value) {
    if (min >= seg.startMin && min < seg.startMin + 60) {
      const fraction = (min - seg.startMin) / 60
      return seg.offsetPx + fraction * seg.heightPx
    }
  }
  const last = hourSegments.value[hourSegments.value.length - 1]
  if (min >= last.startMin + 60) return last.offsetPx + last.heightPx
  return 0
}

const hourLabels = computed(() =>
  hourSegments.value.map(seg => ({
    label: formatMinutesAsTime(seg.startMin, props.locale),
    top: seg.offsetPx + seg.heightPx / 2,
    busy: seg.busy,
  })),
)

const openDaysSet = computed(() => {
  const s = new Set<number>()
  for (const d of props.data.businessHours) s.add(d.dayOfWeek)
  return s
})

const dayLabels = computed(() =>
  props.dayKeys.map((dayKey) => {
    const [y, m, d] = dayKey.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d, 12))
    const weekday = new Intl.DateTimeFormat(props.locale, {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(date)
    const dayNum = new Intl.DateTimeFormat(props.locale, {
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date)
    const iso = isoWeekdayFromDayKey(dayKey)
    return {
      dayKey,
      weekday,
      dayNum,
      isToday: dayKey === todayKey.value,
      isOpen: openDaysSet.value.has(iso),
    }
  }),
)

interface LaidOutAppointment {
  appt: CalendarAppointment
  startMin: number
  endMin: number
  columnIndex: number
  columnsInCluster: number
  topPx: number
}

function dayAppointments(dayKey: string): LaidOutAppointment[] {
  const raw = rawAppointmentsForDay(dayKey)
  return layoutOverlappingItems(
    raw.map(r => ({ item: r.appt, startMin: r.startMin, endMin: r.endMin })),
  ).map(l => ({
    appt: l.item,
    startMin: l.startMin,
    endMin: l.endMin,
    columnIndex: l.columnIndex,
    columnsInCluster: l.columnsInCluster,
    topPx: minuteToY(l.startMin),
  }))
}

interface DayBlockInfo {
  block: CalendarBlock
  fullDay: boolean
  startMin: number
  endMin: number
  topPx: number
  heightPx: number
}

function dayBlocks(dayKey: string): DayBlockInfo[] {
  return rawBlocksForDay(dayKey).map(b => ({
    block: b.block,
    fullDay: b.fullDay,
    startMin: b.startMin,
    endMin: b.endMin,
    topPx: minuteToY(b.startMin),
    heightPx: Math.max(minuteToY(b.endMin) - minuteToY(b.startMin), 40),
  }))
}

function isAppointmentInsideBlock(
  appt: CalendarAppointment,
  blocks: DayBlockInfo[],
): boolean {
  const s = toWallMinutes(appt.startsAt, props.data.timezone)
  const e = toWallMinutes(appt.endsAt, props.data.timezone)
  return blocks.some(b => b.startMin < e && b.endMin > s)
}

function appointmentTone(appt: CalendarAppointment) {
  if (appt.status === 'CANCELLED') return cancelledTone()
  return pastelToneForService(appt.service?.name ?? appt.topic ?? null)
}

function apptHourLabel(startMin: number): string {
  return formatMinutesAsTime(startMin, props.locale)
}
function apptEndLabel(endMin: number): string {
  return formatMinutesAsTime(endMin, props.locale)
}
function apptTimeRange(startMin: number, endMin: number): string {
  return formatCompactTimeRange(startMin, endMin, props.locale)
}
function apptInitials(appt: CalendarAppointment): string {
  return initialsFromName(appt.customer.name, appt.customer.phone)
}
function apptDisplayName(appt: CalendarAppointment): string {
  return appt.customer.name?.trim() || appt.customer.phone
}
function apptDisplayService(appt: CalendarAppointment): string {
  return appt.service?.name?.trim() || appt.topic || ''
}
</script>

<template>
  <div class="rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-glass overflow-hidden">
    <div class="grid" :style="{ gridTemplateColumns: `64px repeat(${dayKeys.length}, minmax(0, 1fr))` }">
      <div class="border-b border-r border-slate-200/70 bg-white/60 h-16" />
      <div
        v-for="d in dayLabels"
        :key="`h-${d.dayKey}`"
        class="border-b border-slate-200/70 h-16 flex flex-col items-center justify-center border-r last:border-r-0"
        :class="d.isToday ? 'bg-primary-50/70' : 'bg-white/60'"
      >
        <div class="text-[11px] uppercase tracking-wider text-slate-500">{{ d.weekday }}</div>
        <div class="text-lg font-semibold" :class="d.isToday ? 'text-primary-700' : 'text-slate-900'">{{ d.dayNum }}</div>
      </div>

      <div class="relative border-r border-slate-200/70 bg-white/40" :style="{ height: `${totalHeight}px` }">
        <div
          v-for="(h, i) in hourLabels"
          :key="i"
          class="absolute right-2 -translate-y-1/2 text-[11px] font-medium"
          :class="h.busy ? 'text-slate-600' : 'text-slate-400'"
          :style="{ top: `${h.top}px` }"
        >
          {{ h.label }}
        </div>
      </div>

      <div
        v-for="d in dayLabels"
        :key="`c-${d.dayKey}`"
        class="relative border-r border-slate-200/70 last:border-r-0"
        :class="[d.isToday ? 'bg-primary-50/20' : (d.isOpen ? 'bg-white/40' : 'bg-slate-200/40')]"
        :style="{ height: `${totalHeight}px` }"
      >
        <div v-if="!d.isOpen && dayAppointments(d.dayKey).length === 0 && dayBlocks(d.dayKey).length === 0" class="absolute inset-0 flex items-start justify-center pt-4">
          <span class="text-xs uppercase tracking-wider text-slate-500">{{ $t('admin.calendarView.closed') }}</span>
        </div>

        <div
          v-for="b in dayBlocks(d.dayKey)"
          :key="`blk-${b.block.id}-${d.dayKey}`"
          class="pointer-events-none absolute inset-x-2 flex items-start justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary-400/60 bg-primary-100/40"
          :style="{ top: `${b.topPx + 4}px`, height: `${Math.max(b.heightPx - 8, 60)}px` }"
        >
          <div v-if="b.fullDay" class="mx-2 mt-6 rounded-xl bg-white/85 backdrop-blur-sm px-3 py-3 text-center ring-1 ring-primary-200 shadow-sm max-w-[92%]">
            <p class="text-sm font-semibold text-primary-900">{{ b.block.reason }}</p>
            <p v-if="b.block.publicMessage" class="mt-1 text-xs text-primary-800/80 leading-relaxed">{{ b.block.publicMessage }}</p>
          </div>
          <div v-else class="mt-2 rounded-md bg-white/85 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-primary-900 ring-1 ring-primary-200 shadow-sm max-w-[90%] truncate">
            {{ b.block.reason }} · {{ apptHourLabel(b.startMin) }} — {{ apptEndLabel(b.endMin) }}
          </div>
        </div>

        <button
          v-for="item in dayAppointments(d.dayKey)"
          :key="`app-${item.appt.id}`"
          type="button"
          class="absolute rounded-2xl ring-2 shadow-sm text-left overflow-hidden transition hover:shadow-md hover:z-10 focus:outline-none focus:ring-primary-500"
          :class="[appointmentTone(item.appt).bg, appointmentTone(item.appt).ring, (isAppointmentInsideBlock(item.appt, dayBlocks(d.dayKey)) || item.appt.status === 'CANCELLED') ? 'opacity-50 hover:opacity-80' : '']"
          :style="{
            top: `${item.topPx}px`,
            minHeight: `${CARD_MIN_HEIGHT}px`,
            left: `calc(${(item.columnIndex / item.columnsInCluster) * 100}% + 3px)`,
            width: `calc(${(1 / item.columnsInCluster) * 100}% - 6px)`,
          }"
          @click.stop="emit('clickEvent', item.appt)"
        >
          <div class="flex items-start gap-2 px-2.5 py-2">
            <div class="shrink-0 flex size-8 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white/60"
                 :class="[appointmentTone(item.appt).avatarBg, appointmentTone(item.appt).avatarText]">
              {{ apptInitials(item.appt) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-[11px] font-medium leading-tight truncate" :class="appointmentTone(item.appt).subText">
                {{ apptTimeRange(item.startMin, item.endMin) }}
              </div>
              <div class="mt-0.5 text-[13px] font-bold leading-snug line-clamp-2" :class="appointmentTone(item.appt).text">
                {{ apptDisplayName(item.appt) }}
              </div>
              <div v-if="apptDisplayService(item.appt)" class="mt-0.5 text-[11px] leading-tight truncate" :class="appointmentTone(item.appt).subText">
                {{ apptDisplayService(item.appt) }}
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
