<script setup lang="ts">
defineProps<{
  open: boolean
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { lostReason: string | undefined }]
  close: []
}>()

const lostReason = ref('')

watch(
  () => lostReason.value,
  () => {
    /* keep for future validation hooks */
  },
)

function onSubmit(): void {
  emit('submit', { lostReason: lostReason.value.trim() || undefined })
}
</script>

<template>
  <Modal :open="open" :title="$t('admin.sales.markLostTitle')" size="sm" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {{ $t('admin.sales.field.lostReason') }}
        </label>
        <textarea
          v-model="lostReason"
          rows="3"
          maxlength="500"
          class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          :placeholder="$t('admin.sales.field.lostReasonPlaceholder')"
        />
      </div>
      <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          class="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          @click="emit('close')"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          type="submit"
          class="rounded-xl bg-danger-600 px-4 py-2 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-50"
          :disabled="submitting"
        >
          {{ submitting ? $t('common.saving') : $t('admin.sales.markLostSubmit') }}
        </button>
      </div>
    </form>
  </Modal>
</template>
