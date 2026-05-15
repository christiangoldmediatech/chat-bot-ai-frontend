<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <div class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
    <div class="text-xs uppercase tracking-wider text-slate-500">{{ label }}</div>
    <div class="mt-2 text-3xl font-semibold text-slate-900">{{ value }}</div>
    <div v-if="hint" class="mt-1 text-xs text-slate-400">{{ hint }}</div>
  </div>
</template>
