<script setup lang="ts">
/**
 * Tarjeta KPI: valor grande + label + delta vs periodo anterior + hint
 * secundario. Todo el estilo se mantiene consistente con StatCard existente.
 */
const props = defineProps<{
  label: string
  value: number
  previous?: number
  hint?: string | null
  tone?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose' | 'slate'
  to?: string
}>()

const { compact, full, percent } = useDateFormat()

const delta = computed<{ ratio: number | null; kind: 'up' | 'down' | 'flat' | 'na' }>(() => {
  if (props.previous === undefined || props.previous === null) return { ratio: null, kind: 'na' }
  if (props.previous === 0) return { ratio: null, kind: props.value === 0 ? 'flat' : 'up' }
  const ratio = (props.value - props.previous) / props.previous
  const kind = ratio > 0.005 ? 'up' : ratio < -0.005 ? 'down' : 'flat'
  return { ratio, kind }
})

const tonePill = computed<string>(() => {
  switch (props.tone ?? 'slate') {
    case 'indigo':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-100'
    case 'emerald':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    case 'amber':
      return 'bg-amber-50 text-amber-700 ring-amber-100'
    case 'sky':
      return 'bg-sky-50 text-sky-700 ring-sky-100'
    case 'rose':
      return 'bg-rose-50 text-rose-700 ring-rose-100'
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-100'
  }
})

const Tag = computed(() => (props.to ? resolveComponent('NuxtLink') : 'div'))
</script>

<template>
  <component
    :is="Tag"
    :to="to"
    class="block rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-4 transition hover:ring-white/90"
  >
    <div class="flex items-start justify-between gap-2">
      <span
        class="text-[10px] uppercase tracking-wider font-semibold ring-1 rounded-full px-2 py-0.5"
        :class="tonePill"
      >
        {{ label }}
      </span>
      <span
        v-if="delta.kind !== 'na'"
        class="text-[11px] font-semibold inline-flex items-center gap-1"
        :class="delta.kind === 'up'
          ? 'text-emerald-700'
          : delta.kind === 'down'
            ? 'text-danger-700'
            : 'text-slate-400'"
        :title="`vs. previous period`"
      >
        <span v-if="delta.kind === 'up'">↑</span>
        <span v-else-if="delta.kind === 'down'">↓</span>
        <span v-else>·</span>
        {{ delta.ratio === null ? '—' : percent(Math.abs(delta.ratio), 1) }}
      </span>
    </div>

    <div class="mt-2 text-3xl font-semibold text-slate-900" :title="full(value)">
      {{ compact(value) }}
    </div>

    <div v-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</div>
  </component>
</template>
