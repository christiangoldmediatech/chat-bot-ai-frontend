<script setup lang="ts">
import type { CalendarAppointment } from '~/types/calendar'
import {
  cancelledTone,
  formatMinutesAsTime,
  initialsFromName,
  pastelToneForService,
} from '~/utils/calendar-layout'

const props = defineProps<{
  appointment: CalendarAppointment
  startMin: number
  topPx: number
  heightPx: number
  columnIndex: number
  columnsInCluster: number
  attenuated?: boolean
  locale: string
}>()

const emit = defineEmits<{ click: [CalendarAppointment] }>()

const leftPct = computed(() => (props.columnIndex / props.columnsInCluster) * 100)
const widthPct = computed(() => (1 / props.columnsInCluster) * 100)
const hourLabel = computed(() => formatMinutesAsTime(props.startMin, props.locale))

const tone = computed(() => {
  if (props.appointment.status === 'CANCELLED') return cancelledTone()
  return pastelToneForService(
    props.appointment.service?.name ?? props.appointment.topic ?? null,
  )
})

const displayName = computed(() =>
  props.appointment.customer.name?.trim() || props.appointment.customer.phone,
)
const displayService = computed(() =>
  props.appointment.service?.name?.trim() || props.appointment.topic || '',
)
const initials = computed(() =>
  initialsFromName(props.appointment.customer.name, props.appointment.customer.phone),
)
</script>

<template>
  <button
    type="button"
    class="group absolute rounded-2xl ring-2 shadow-sm text-left overflow-hidden transition hover:shadow-md hover:z-10 focus:outline-none focus:ring-primary-500"
    :class="[tone.bg, tone.ring, attenuated ? 'opacity-50 hover:opacity-80' : '']"
    :style="{
      top: `${topPx}px`,
      height: `${Math.max(96, heightPx - 2)}px`,
      left: `calc(${leftPct}% + 3px)`,
      width: `calc(${widthPct}% - 6px)`,
    }"
    @click.stop="emit('click', appointment)"
  >
    <div class="relative flex h-full items-start gap-2.5 px-3 py-2.5">
      <div class="shrink-0 flex size-9 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white/60"
           :class="[tone.avatarBg, tone.avatarText]">
        {{ initials }}
      </div>
      <div class="min-w-0 flex-1 pr-6">
        <div class="text-[11px] font-medium leading-tight" :class="tone.subText">{{ hourLabel }}</div>
        <div class="mt-0.5 text-[13px] font-bold leading-tight line-clamp-2" :class="tone.text">{{ displayName }}</div>
        <div v-if="displayService" class="mt-1 text-[11px] leading-tight line-clamp-2" :class="tone.subText">{{ displayService }}</div>
      </div>
      <div class="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-white/80 ring-2 ring-white shadow-sm" :class="tone.text" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      </div>
    </div>
  </button>
</template>
