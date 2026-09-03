<script setup lang="ts">
const props = defineProps<{
  conversationId: string
  tenantId?: string
}>()

const emit = defineEmits<{
  unblocked: []
  error: [message: string]
}>()

const securityApi = useConversationSecurity(props.tenantId)

const open = ref(false)
const reason = ref('')
const mutating = ref(false)

async function confirm(): Promise<void> {
  mutating.value = true
  try {
    await securityApi.unblock(props.conversationId, reason.value.trim() || undefined)
    open.value = false
    reason.value = ''
    emit('unblocked')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    emit('error', msg)
  } finally {
    mutating.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
    @click.stop="open = true"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
    {{ $t('conversations.security.actions.unblock') }}
  </button>

  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      @click.self="open = false"
    >
      <div class="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <div class="h-1 w-full bg-sky-500" aria-hidden="true" />
        <div class="p-6">
          <h3 class="text-base font-semibold text-slate-900">
            {{ $t('conversations.security.unblockModal.title') }}
          </h3>
          <p class="mt-1.5 text-sm text-slate-600">
            {{ $t('conversations.security.unblockModal.message') }}
          </p>
          <label class="mt-4 block text-xs font-medium text-slate-600">
            {{ $t('conversations.security.unblockModal.reasonLabel') }}
          </label>
          <textarea
            v-model="reason"
            rows="3"
            maxlength="500"
            :placeholder="$t('conversations.security.unblockModal.reasonPlaceholder')"
            class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <div class="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              :disabled="mutating"
              @click="open = false"
            >
              {{ $t('conversations.security.unblockModal.cancel') }}
            </button>
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50"
              :disabled="mutating"
              @click="confirm"
            >
              {{ mutating ? $t('conversations.security.unblockModal.loading') : $t('conversations.security.unblockModal.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
