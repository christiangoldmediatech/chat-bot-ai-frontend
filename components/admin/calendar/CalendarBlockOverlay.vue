<script setup lang="ts">
import type { CalendarBlock } from '~/types/calendar'
import { formatMinutesAsTime } from '~/utils/calendar-layout'

const props = defineProps<{
  block: CalendarBlock
  fullDay: boolean
  startMin: number
  endMin: number
  topPx: number
  heightPx: number
  locale: string
  showCard?: boolean
}>()

const rangeLabel = computed(() => {
  const from = formatMinutesAsTime(props.startMin, props.locale)
  const to = formatMinutesAsTime(props.endMin, props.locale)
  return `${from} — ${to}`
})
</script>

<template>
  <div
    class="pointer-events-none absolute inset-x-0 flex items-center justify-center overflow-hidden rounded-lg"
    :class="fullDay ? 'border-2 border-dashed border-primary-400/70 bg-primary-100/40' : 'border-2 border-dashed border-primary-400/60 bg-primary-100/30'"
    :style="{ top: `${topPx}px`, height: `${heightPx}px` }"
  >
    <div v-if="fullDay && showCard" class="mx-2 rounded-xl bg-white/85 backdrop-blur-sm px-3 py-3 text-center ring-1 ring-primary-200 shadow-sm max-w-[90%]">
      <p class="text-sm font-semibold text-primary-900">{{ block.reason }}</p>
      <p v-if="block.publicMessage" class="mt-1 text-xs text-primary-800/80 leading-relaxed">{{ block.publicMessage }}</p>
    </div>
    <div v-else-if="!fullDay" class="rounded-md bg-white/85 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-primary-900 ring-1 ring-primary-200 shadow-sm max-w-[90%] truncate">
      {{ block.reason }} · {{ rangeLabel }}
    </div>
  </div>
</template>
