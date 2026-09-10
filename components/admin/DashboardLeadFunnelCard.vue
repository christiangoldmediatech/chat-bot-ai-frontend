<script setup lang="ts">
import { DASHBOARD_PALETTE } from '~/utils/dashboard-palette'

const props = defineProps<{
  total: number
  new_: number
  qualified: number
  won: number
}>()

const { t } = useI18n()

const steps = computed(() => [
  {
    key: 'total',
    label: t('admin.dashboardRedesign.funnel.total'),
    value: props.total,
    color: DASHBOARD_PALETTE.primary,
  },
  {
    key: 'new',
    label: t('admin.dashboardRedesign.funnel.new'),
    value: props.new_,
    color: DASHBOARD_PALETTE.primaryLight,
  },
  {
    key: 'qualified',
    label: t('admin.dashboardRedesign.funnel.qualified'),
    value: props.qualified,
    color: DASHBOARD_PALETTE.accent,
  },
  {
    key: 'won',
    label: t('admin.dashboardRedesign.funnel.won'),
    value: props.won,
    color: DASHBOARD_PALETTE.success,
  },
])

const maxValue = computed(() => Math.max(1, ...steps.value.map(s => s.value)))

function pct(value: number): number {
  if (props.total === 0) return 0
  return Math.round((value / props.total) * 100)
}
</script>

<template>
  <section class="rounded-2xl bg-white backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-5 h-full">
    <header class="mb-4">
      <h3 class="text-sm font-semibold text-slate-900">{{ $t('admin.dashboardRedesign.funnel.title') }}</h3>
      <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.dashboardRedesign.funnel.subtitle') }}</p>
    </header>

    <ul class="space-y-3">
      <li v-for="step in steps" :key="step.key">
        <div class="flex items-baseline justify-between mb-1">
          <span class="text-xs font-medium text-slate-700">{{ step.label }}</span>
          <span class="text-xs tabular-nums text-slate-500">
            <span class="text-slate-900 font-semibold">{{ step.value.toLocaleString() }}</span>
            <span v-if="step.key !== 'total' && total > 0" class="ml-1">· {{ pct(step.value) }}%</span>
          </span>
        </div>
        <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :style="{ width: `${(step.value / maxValue) * 100}%`, backgroundColor: step.color }"
          />
        </div>
      </li>
    </ul>

    <p v-if="total === 0" class="mt-4 text-xs text-slate-400 text-center">{{ $t('admin.dashboardRedesign.funnel.empty') }}</p>
  </section>
</template>
