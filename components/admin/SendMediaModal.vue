<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Message } from '~/types/conversation'

const props = defineProps<{
  open: boolean
  conversationId: string
}>()

const emit = defineEmits<{
  close: []
  sent: [message: Message]
}>()

const { t } = useI18n()
const conversationsApi = useConversations()

const file = ref<File | null>(null)
const caption = ref('')
const sending = ref(false)
const error = ref<string | null>(null)
const previewUrl = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      file.value = null
      caption.value = ''
      error.value = null
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
        previewUrl.value = null
      }
      if (fileInput.value) fileInput.value.value = ''
    }
  },
)

function onFilePick(ev: Event): void {
  const target = ev.target as HTMLInputElement
  const picked = target.files?.[0] ?? null
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  file.value = picked
  if (picked && picked.type.startsWith('image/')) {
    previewUrl.value = URL.createObjectURL(picked)
  }
}

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

async function onSend(): Promise<void> {
  if (!file.value) return
  sending.value = true
  error.value = null
  try {
    const msg = await conversationsApi.sendMedia(
      props.conversationId,
      file.value,
      caption.value || undefined,
    )
    emit('sent', msg)
    emit('close')
  }
  catch (err) {
    error.value = (err as ApiError).message
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <Modal
    :open="open"
    :title="t('admin.templates.convMedia.title')"
    :subtitle="t('admin.templates.convMedia.subtitle')"
    size="md"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-800">{{ t('admin.templates.convMedia.pickFile') }}</label>
        <div class="mt-2 flex items-center gap-3">
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
            @click="fileInput?.click()"
          >
            {{ file ? t('admin.templates.convMedia.replaceFile') : t('admin.templates.convMedia.pickFile') }}
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*,video/*,application/pdf"
            class="hidden"
            @change="onFilePick"
          >
          <span v-if="file" class="truncate text-sm text-slate-700">
            {{ file.name }} · {{ formatSize(file.size) }}
          </span>
        </div>
        <p class="mt-1 text-xs text-slate-500">{{ t('admin.templates.convMedia.fileHint') }}</p>
      </div>

      <div v-if="previewUrl" class="rounded-lg border border-slate-200 bg-slate-50/70 p-2">
        <img :src="previewUrl" alt="" class="max-h-48 w-auto rounded">
      </div>

      <label class="block text-sm">
        <span class="font-medium text-slate-800">{{ t('admin.templates.convMedia.caption') }}</span>
        <textarea
          v-model="caption"
          rows="2"
          maxlength="1024"
          class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
        />
        <span class="mt-1 block text-xs text-slate-500">{{ t('admin.templates.convMedia.captionHint') }}</span>
      </label>

      <div v-if="error" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        <p class="font-medium">{{ t('admin.templates.convMedia.errorTitle') }}</p>
        <p class="mt-1">{{ error }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
          @click="emit('close')"
        >
          {{ t('admin.templates.convMedia.cancel') }}
        </button>
        <button
          type="button"
          class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-60"
          :disabled="!file || sending"
          @click="onSend"
        >
          {{ sending ? t('admin.templates.convMedia.sending') : t('admin.templates.convMedia.send') }}
        </button>
      </div>
    </template>
  </Modal>
</template>
