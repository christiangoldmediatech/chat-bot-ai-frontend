<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
    role="dialog"
    aria-modal="true"
  >
    <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
      <div class="h-1 w-full bg-danger-500" aria-hidden="true" />
      <div class="p-6">
        <h3 class="text-lg font-semibold text-slate-900">{{ title }}</h3>
        <p v-if="message" class="mt-2 text-sm text-slate-600">{{ message }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button
            class="px-4 py-2 text-sm rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
            @click="$emit('cancel')"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 text-sm rounded-md bg-danger-600 text-white hover:bg-danger-700 transition-colors"
            @click="$emit('confirm')"
          >
            {{ confirmLabel ?? 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
