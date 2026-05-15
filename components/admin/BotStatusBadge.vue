<script setup lang="ts">
defineProps<{
  isActive: boolean
}>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium"
    :class="
      isActive
        ? 'bg-success-50 text-success-700 border border-success-200'
        : 'bg-slate-100 text-slate-600 border border-slate-200'
    "
  >
    <span
      class="size-1.5 rounded-full"
      :class="isActive ? 'bg-success-500' : 'bg-slate-400'"
    />
    {{ isActive ? 'Active' : 'Inactive' }}
  </span>
</template>
