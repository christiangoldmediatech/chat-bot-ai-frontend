<script setup lang="ts">
const props = defineProps<{
  to: string
  label: string
}>()

const cleanedLabel = computed(() => props.label.replace(/^[←‹<]\s*/u, ''))
</script>

<template>
  <NuxtLink
    :to="to"
    class="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ink-card/60 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-pearl hover:bg-ink-cardHi/60 hover:border-halo-line transition"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-3.5"
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
    {{ cleanedLabel }}
  </NuxtLink>
</template>
