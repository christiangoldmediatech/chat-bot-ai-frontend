<script setup lang="ts">
/**
 * Wrapper con título, subtítulo (qué mide y con qué fecha se agrupa),
 * estados de carga y vacío. Los charts pasan como slot para que la lógica
 * de ApexCharts viva dentro del caller.
 */
defineProps<{
  title: string
  subtitle?: string
  loading?: boolean
  empty?: boolean
  emptyLabel?: string
}>()
</script>

<template>
  <section class="rounded-2xl bg-white backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-4">
    <header class="flex flex-wrap items-start justify-between gap-2 mb-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">{{ title }}</h3>
        <p v-if="subtitle" class="text-[11px] text-slate-500 mt-0.5 max-w-lg">{{ subtitle }}</p>
      </div>
      <slot name="controls" />
    </header>
    <div v-if="loading" class="h-56 rounded-xl bg-slate-100/60 animate-pulse" />
    <div
      v-else-if="empty"
      class="h-56 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400"
    >
      {{ emptyLabel || $t('admin.dashboard.chart.emptyDefault') }}
    </div>
    <div v-else>
      <slot />
    </div>
  </section>
</template>
