<script setup lang="ts">
import type { ApiError } from '~/types/api'

const props = withDefaults(defineProps<{
  phone: string
  botId: string
  effectiveName: string | null
  profileName: string | null
  size?: 'default' | 'compact'
  disabled?: boolean
}>(), {
  size: 'default',
  disabled: false,
})

const emit = defineEmits<{
  updated: [newName: string]
}>()

const { t } = useI18n()
const customersApi = useCustomers()

const editing = ref(false)
const draft = ref('')
const saving = ref(false)
const error = ref<string | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const nameToShow = computed(() => props.effectiveName || null)
const whatsappReference = computed(() => {
  const n = props.profileName?.trim()
  if (!n) return null
  if (n === props.effectiveName) return null
  return n
})
const sizeClasses = computed(() => props.size === 'compact'
  ? { input: 'text-sm px-2 py-1', btn: 'size-7', icon: 'size-3.5', hint: 'text-[11px]' }
  : { input: 'text-base px-2.5 py-1.5', btn: 'size-8', icon: 'size-4', hint: 'text-xs' })

function startEdit(e?: Event): void {
  if (props.disabled) return
  e?.stopPropagation()
  draft.value = nameToShow.value ?? ''
  error.value = null
  editing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function cancel(e?: Event): void {
  e?.stopPropagation()
  editing.value = false
  draft.value = ''
  error.value = null
}

async function save(e?: Event): Promise<void> {
  e?.stopPropagation()
  if (saving.value) return
  const value = draft.value.trim()
  if (value.length === 0) {
    error.value = t('common.customer.edit.errors.required')
    return
  }
  saving.value = true
  error.value = null
  try {
    const res = await customersApi.updateDisplayName(props.phone, props.botId, value)
    editing.value = false
    emit('updated', res.displayName)
  }
  catch (err) {
    const apiErr = err as ApiError & { errorCode?: string }
    const code = apiErr?.errorCode
    const key = code && code.startsWith('customers.edit.errors.')
      ? `common.customer.edit.errors.${code.split('.').pop()}`
      : 'common.customer.edit.errors.generic'
    error.value = t(key)
  }
  finally {
    saving.value = false
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault()
    void save()
  }
  else if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  }
}

function useSuggestion(e: Event): void {
  e.stopPropagation()
  if (whatsappReference.value) {
    draft.value = whatsappReference.value
    nextTick(() => inputRef.value?.focus())
  }
}
</script>

<template>
  <div class="group/name min-w-0" @click.stop>
    <!-- Normal state -->
    <div v-if="!editing" class="flex items-center gap-1.5 min-w-0">
      <button
        v-if="!nameToShow"
        type="button"
        :disabled="disabled"
        class="inline-flex items-center gap-1 rounded-md border border-dashed border-primary-300 bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
        :aria-label="t('common.customer.edit.editLabel')"
        @click="startEdit"
      >
        {{ t('common.customer.edit.addName') }}
      </button>
      <span v-else class="truncate font-medium text-slate-900">{{ nameToShow }}</span>
      <button
        v-if="nameToShow && !disabled"
        type="button"
        class="shrink-0 inline-flex items-center justify-center rounded-md text-slate-400 opacity-0 transition group-hover/name:opacity-100 hover:text-slate-700 hover:bg-slate-100 touch:opacity-100 focus-visible:opacity-100 size-6"
        :aria-label="t('common.customer.edit.editLabel')"
        :title="t('common.customer.edit.editLabel')"
        @click="startEdit"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="sizeClasses.icon" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
    </div>

    <!-- Editing state -->
    <div v-else class="flex items-center gap-1.5 min-w-0">
      <input
        ref="inputRef"
        v-model="draft"
        type="text"
        :placeholder="t('common.customer.edit.placeholder')"
        :disabled="saving"
        :aria-invalid="error ? 'true' : 'false'"
        :aria-describedby="error ? 'editable-name-error' : undefined"
        class="min-w-0 flex-1 rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none disabled:bg-slate-50"
        :class="[sizeClasses.input, error ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-200' : '']"
        @keydown="onKeyDown"
        @click.stop
      >
      <button
        type="button"
        :disabled="saving"
        class="shrink-0 inline-flex items-center justify-center rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 transition"
        :class="sizeClasses.btn"
        :aria-label="t('common.save')"
        :title="t('common.save')"
        @click="save"
      >
        <svg v-if="!saving" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :class="sizeClasses.icon" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="[sizeClasses.icon, 'animate-spin']" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </button>
      <button
        type="button"
        :disabled="saving"
        class="shrink-0 inline-flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
        :class="sizeClasses.btn"
        :aria-label="t('common.cancel')"
        :title="t('common.cancel')"
        @click="cancel"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :class="sizeClasses.icon" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Error message -->
    <p v-if="editing && error" id="editable-name-error" :class="[sizeClasses.hint, 'mt-1 text-danger-600']">
      {{ error }}
    </p>

    <!-- WhatsApp profile reference / suggestion -->
    <p v-if="whatsappReference" :class="[sizeClasses.hint, 'mt-0.5 text-slate-500 truncate']">
      <span class="font-medium">{{ t('common.customer.edit.whatsappLabel') }}</span>
      <span class="ml-1">{{ whatsappReference }}</span>
      <button
        v-if="editing && !saving && whatsappReference !== draft"
        type="button"
        class="ml-2 inline-flex items-center text-primary-600 hover:text-primary-800 underline underline-offset-2"
        @click="useSuggestion"
      >
        {{ t('common.customer.edit.suggestUse', { name: whatsappReference }) }}
      </button>
    </p>
  </div>
</template>
