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
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
  >
    <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
      <h3 class="text-lg font-semibold text-slate-900">{{ title }}</h3>
      <p v-if="message" class="mt-2 text-sm text-slate-600">{{ message }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <button
          class="px-4 py-2 text-sm rounded-md text-slate-700 hover:bg-slate-100"
          @click="$emit('cancel')"
        >
          Cancelar
        </button>
        <button
          class="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
          @click="$emit('confirm')"
        >
          {{ confirmLabel ?? 'Eliminar' }}
        </button>
      </div>
    </div>
  </div>
</template>
