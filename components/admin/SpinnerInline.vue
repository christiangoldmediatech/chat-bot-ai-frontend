<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    tone?: 'light' | 'dark'
  }>(),
  {
    label: 'Loading…',
    tone: 'light',
  },
)
</script>

<template>
  <div
    class="inline-flex items-center gap-2 text-sm"
    :class="tone === 'dark' ? 'text-slate-400' : 'text-slate-500'"
    role="status"
    aria-live="polite"
  >
    <span
      class="inline-block size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin"
      aria-hidden="true"
    />
    <span>{{ label }}</span>
  </div>
</template>
