<script setup lang="ts">
import type { LeadInterest } from '~/types/lead'

interface Props {
  score: number
  interest: LeadInterest
  /** Compact mode hides the score value and shows only the colored ring + label. */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), { compact: false })

const palette = computed(() => {
  if (props.interest === 'HIGH') {
    return {
      ring: 'ring-emerald-300/70',
      bg: 'bg-gradient-to-br from-emerald-50 via-white to-white',
      dot: 'bg-emerald-500',
      score: 'text-emerald-900',
      label: 'text-emerald-700/80',
    }
  }
  if (props.interest === 'MEDIUM') {
    return {
      ring: 'ring-amber-300/70',
      bg: 'bg-gradient-to-br from-amber-50 via-white to-white',
      dot: 'bg-amber-500',
      score: 'text-amber-900',
      label: 'text-amber-700/80',
    }
  }
  return {
    ring: 'ring-slate-200/80',
    bg: 'bg-gradient-to-br from-slate-50 via-white to-white',
    dot: 'bg-slate-400',
    score: 'text-slate-700',
    label: 'text-slate-500',
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset px-2.5 py-0.5"
    :class="[palette.bg, palette.ring]"
    :title="$t('leads.score.tooltip', { score, interest })"
  >
    <span class="size-1.5 rounded-full" :class="palette.dot" />
    <span v-if="!compact" class="text-xs font-bold tabular-nums" :class="palette.score">
      {{ score }}
    </span>
    <span class="text-[10px] uppercase tracking-wider font-semibold" :class="palette.label">
      {{ $t(`leads.interest.${interest}`) }}
    </span>
  </span>
</template>
