<script setup lang="ts">
import type { BlockStatus } from '~/types/security'

const props = defineProps<{
  status: BlockStatus | null
  size?: 'sm' | 'xs'
}>()

const size = computed(() => props.size ?? 'sm')

const shown = computed(() => {
  const s = props.status
  return s === 'AUTO_BLOCKED' || s === 'MANUAL_BLOCKED' || s === 'MANUAL_UNBLOCKED'
})

function classesFor(s: BlockStatus): string {
  return {
    NONE: '',
    AUTO_BLOCKED: 'bg-amber-50 text-amber-800 ring-amber-200',
    MANUAL_BLOCKED: 'bg-danger-50 text-danger-700 ring-danger-200',
    MANUAL_UNBLOCKED: 'bg-sky-50 text-sky-700 ring-sky-200',
  }[s]
}
</script>

<template>
  <span
    v-if="shown && status"
    class="inline-flex items-center rounded-full font-medium ring-1"
    :class="[
      classesFor(status),
      size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
    ]"
  >
    {{ $t(`conversations.security.badge.${status}`) }}
  </span>
</template>
