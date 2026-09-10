<script setup lang="ts">
import { DASHBOARD_PALETTE } from '~/utils/dashboard-palette'

const props = defineProps<{
  label: string
  value: number
  previousValue?: number
  sparkline?: number[]
  hint?: string
  icon?: 'calendar' | 'chat' | 'users'
  tone?: 'primary' | 'accent' | 'success'
  compact?: boolean
}>()

const tone = computed(() => props.tone ?? 'primary')
const color = computed(() => {
  if (tone.value === 'accent') return DASHBOARD_PALETTE.accent
  if (tone.value === 'success') return DASHBOARD_PALETTE.success
  return DASHBOARD_PALETTE.primary
})

const delta = computed(() => {
  if (props.previousValue === undefined) return null
  if (props.previousValue === 0) return props.value > 0 ? { text: '+∞', tone: 'text-emerald-700' } : null
  const pct = ((props.value - props.previousValue) / props.previousValue) * 100
  const rounded = Math.round(pct)
  if (rounded === 0) return { text: '0%', tone: 'text-slate-500' }
  return {
    text: `${rounded > 0 ? '+' : ''}${rounded}%`,
    tone: rounded > 0 ? 'text-emerald-700' : 'text-danger-600',
  }
})

const sparkChart = computed(() => {
  const data = props.sparkline ?? []
  return {
    options: {
      chart: {
        type: 'area',
        sparkline: { enabled: true },
        fontFamily: 'inherit',
      },
      colors: [color.value],
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      tooltip: { enabled: false },
    },
    series: [{ name: props.label, data }],
  }
})
</script>

<template>
  <section
    class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass h-full flex flex-col"
    :class="compact ? 'p-3' : 'p-5'"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="uppercase tracking-wider font-semibold text-slate-500" :class="compact ? 'text-[10px]' : 'text-[11px]'">{{ label }}</p>
        <p v-if="hint && !compact" class="text-[11px] text-slate-500 mt-0.5">{{ hint }}</p>
      </div>
      <div class="shrink-0 flex items-center justify-center rounded-xl ring-1 ring-slate-200" :class="compact ? 'size-7' : 'size-9'" :style="{ backgroundColor: `${color}15`, color }" aria-hidden="true">
        <svg v-if="icon === 'calendar'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="compact ? 'size-3.5' : 'size-4'"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        <svg v-else-if="icon === 'chat'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="compact ? 'size-3.5' : 'size-4'"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="compact ? 'size-3.5' : 'size-4'"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
      </div>
    </div>

    <div class="flex items-baseline gap-2" :class="compact ? 'mt-2' : 'mt-3 gap-3'">
      <p class="font-bold text-slate-900 tabular-nums leading-none" :class="compact ? 'text-2xl' : 'text-4xl'">{{ value.toLocaleString() }}</p>
      <span v-if="delta" class="text-xs font-semibold" :class="delta.tone">{{ delta.text }}</span>
    </div>
    <p v-if="previousValue !== undefined && !compact" class="mt-1 text-[11px] text-slate-500">vs. período anterior ({{ previousValue.toLocaleString() }})</p>

    <div v-if="sparkline && sparkline.length > 1" class="mt-2 -mx-2 flex-1" :class="compact ? 'min-h-[32px]' : 'mt-4 min-h-[60px]'">
      <ClientOnly>
        <apexchart type="area" :height="compact ? 40 : 80" :options="sparkChart.options" :series="sparkChart.series" />
      </ClientOnly>
    </div>
  </section>
</template>
