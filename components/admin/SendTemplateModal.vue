<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Message } from '~/types/conversation'
import type { WhatsappTemplate } from '~/types/whatsapp-template'

const props = defineProps<{
  open: boolean
  conversationId: string
  botId: string
}>()

const emit = defineEmits<{
  close: []
  sent: [message: Message]
}>()

const { t } = useI18n()
const templatesApi = useTemplates()
const conversationsApi = useConversations()

const templates = ref<WhatsappTemplate[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const selectedId = ref<string>('')
const values = ref<string[]>([])
const sending = ref(false)
const error = ref<string | null>(null)
const pickerOpen = ref(false)
const pickerRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<{ top: string, left: string, width: string, maxHeight: string }>({
  top: '0px',
  left: '0px',
  width: '0px',
  maxHeight: '320px',
})
const panelFlipUp = ref(false)

const PANEL_MAX_HEIGHT = 320
const PANEL_GAP = 6
const VIEWPORT_PADDING = 12

function updatePanelPosition(): void {
  if (!import.meta.client || !triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING
  const spaceAbove = rect.top - VIEWPORT_PADDING
  const flip = spaceBelow < 160 && spaceAbove > spaceBelow
  panelFlipUp.value = flip
  const available = flip ? spaceAbove : spaceBelow
  const maxH = Math.min(PANEL_MAX_HEIGHT, Math.max(140, available - PANEL_GAP))
  panelStyle.value = {
    top: flip
      ? `${Math.max(VIEWPORT_PADDING, rect.top - PANEL_GAP - maxH)}px`
      : `${rect.bottom + PANEL_GAP}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${maxH}px`,
  }
}

async function togglePicker(): Promise<void> {
  const next = !pickerOpen.value
  if (next) {
    updatePanelPosition()
    pickerOpen.value = true
    await nextTick()
    updatePanelPosition()
  }
  else {
    pickerOpen.value = false
  }
}

function pickTemplate(id: string): void {
  selectedId.value = id
  pickerOpen.value = false
}

function onDocClick(e: MouseEvent): void {
  if (!pickerOpen.value) return
  const target = e.target as Node | null
  const insideTrigger = pickerRef.value && target && pickerRef.value.contains(target)
  const insidePanel = panelRef.value && target && panelRef.value.contains(target)
  if (!insideTrigger && !insidePanel) {
    pickerOpen.value = false
  }
}

function onDocKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && pickerOpen.value) pickerOpen.value = false
}

function onReposition(): void {
  if (pickerOpen.value) updatePanelPosition()
}

onMounted(() => {
  if (!import.meta.client) return
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onDocKey)
  window.addEventListener('resize', onReposition)
  window.addEventListener('scroll', onReposition, true)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onDocKey)
  window.removeEventListener('resize', onReposition)
  window.removeEventListener('scroll', onReposition, true)
})

watch(() => props.open, (isOpen) => {
  if (!isOpen) pickerOpen.value = false
})

const selected = computed<WhatsappTemplate | null>(() =>
  templates.value.find(t => t.id === selectedId.value) ?? null,
)

const preview = computed<string>(() => {
  if (!selected.value) return ''
  let out = selected.value.bodyPreview
  selected.value.variables.forEach((v, i) => {
    const val = values.value[i]
    const token = val && val.trim().length ? val : (v.example ?? `{${v.label}}`)
    out = out.replaceAll(`{{${v.index}}}`, token)
  })
  return out
})

async function load(): Promise<void> {
  if (!props.botId) return
  loading.value = true
  loadError.value = null
  try {
    templates.value = (await templatesApi.listForBot(props.botId)).filter(
      t => t.status === 'ACTIVE',
    )
  }
  catch (err) {
    loadError.value = (err as ApiError).message || t('admin.templates.errors.loadFailed')
  }
  finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.botId] as const,
  ([isOpen]) => {
    if (!isOpen) return
    selectedId.value = ''
    values.value = []
    error.value = null
    void load()
  },
  { immediate: true },
)

watch(selected, (row) => {
  values.value = row ? row.variables.map(v => v.example ?? '') : []
})

async function onSend(): Promise<void> {
  if (!selected.value) return
  sending.value = true
  error.value = null
  try {
    const msg = await conversationsApi.sendTemplate(props.conversationId, {
      templateId: selected.value.id,
      variables: values.value,
    })
    emit('sent', msg)
    emit('close')
  }
  catch (err) {
    error.value = (err as ApiError).message || t('admin.templates.errors.generic')
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <Modal
    :open="open"
    :title="t('admin.templates.convSend.title')"
    :subtitle="t('admin.templates.convSend.subtitle')"
    size="lg"
    @close="emit('close')"
  >
    <div v-if="loading" class="py-6 flex justify-center">
      <SpinnerInline />
    </div>

    <div v-else-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ loadError }}
    </div>

    <div v-else-if="!templates.length" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-sm">
      <p class="font-medium text-amber-900">{{ t('admin.templates.convSend.noTemplatesTitle') }}</p>
      <p class="mt-1 text-amber-800">{{ t('admin.templates.convSend.noTemplatesHint') }}</p>
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSend">
      <div class="block text-sm">
        <span class="font-medium text-slate-800">{{ t('admin.templates.convSend.pickTemplate') }}</span>
        <div ref="pickerRef" class="relative mt-1">
          <button
            ref="triggerRef"
            type="button"
            class="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
            :aria-expanded="pickerOpen"
            :aria-haspopup="'listbox'"
            @click="togglePicker"
          >
            <span v-if="selected" class="flex items-center gap-2 truncate">
              <span class="font-mono text-sm text-slate-900 truncate">{{ selected.name }}</span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">{{ selected.language }}</span>
            </span>
            <span v-else class="text-slate-500">{{ t('admin.templates.convSend.pickPlaceholder') }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 shrink-0 text-slate-400 transition" :class="pickerOpen ? 'rotate-180' : ''" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="selected && selected.variables.length" class="space-y-2">
        <label
          v-for="(v, i) in selected.variables"
          :key="v.index"
          class="block text-sm"
        >
          <span class="font-medium text-slate-800">{{ v.label }}</span>
          <input
            v-model="values[i]"
            :placeholder="v.example ?? ''"
            required
            class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
          >
        </label>
      </div>

      <div v-if="selected" class="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {{ t('admin.templates.convSend.preview') }}
        </p>
        <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">{{ preview }}</p>
      </div>

      <div v-if="error" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        <p class="font-medium">{{ t('admin.templates.convSend.errorTitle') }}</p>
        <p class="mt-1">{{ error }}</p>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
          @click="emit('close')"
        >
          {{ t('admin.templates.convSend.cancel') }}
        </button>
        <button
          type="button"
          class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-60"
          :disabled="!selected || sending"
          @click="onSend"
        >
          {{ sending ? t('admin.templates.convSend.sending') : t('admin.templates.convSend.send') }}
        </button>
      </div>
    </template>
  </Modal>

  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <ul
        v-if="pickerOpen"
        ref="panelRef"
        role="listbox"
        class="fixed z-[200] overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-2xl ring-1 ring-slate-900/5"
        :style="panelStyle"
      >
        <li
          v-for="row in templates"
          :key="row.id"
          role="option"
          :aria-selected="row.id === selectedId"
          class="group flex cursor-pointer items-start justify-between gap-3 px-3 py-2 text-sm transition hover:bg-emerald-50"
          :class="row.id === selectedId ? 'bg-emerald-50/80' : ''"
          @click="pickTemplate(row.id)"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm font-semibold text-slate-900 truncate">{{ row.name }}</span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">{{ row.language }}</span>
            </div>
            <p class="mt-0.5 line-clamp-2 text-xs text-slate-500">{{ row.bodyPreview }}</p>
          </div>
          <svg
            v-if="row.id === selectedId"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mt-0.5 size-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </li>
      </ul>
    </Transition>
  </Teleport>
</template>

