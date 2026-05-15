<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <div class="rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5">
    <div class="text-xs uppercase tracking-wider text-slate-400">{{ label }}</div>
    <div class="mt-2 text-3xl font-semibold text-slate-100">{{ value }}</div>
    <div v-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</div>
  </div>
</template>
