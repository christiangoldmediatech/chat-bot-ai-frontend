<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  /**
   * Tone of the action. `danger` is destructive (red header), `warning` is amber,
   * `default` is neutral. Defaults to `danger` to preserve the previous look.
   */
  tone?: 'danger' | 'warning' | 'default'
  /**
   * If provided, the user must type this exact string in the confirmation input
   * for the Confirm button to enable. Use for hard-to-undo destructive actions
   * like deleting a bot or a company.
   */
  requireTyped?: string
  /** Label shown above the typed-confirmation input. */
  requireTypedLabel?: string
}>(), {
  tone: 'danger',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const typed = ref('')

// Reset the typed input every time the dialog opens, so closing + reopening
// always starts from a clean state.
watch(() => props.open, (isOpen) => {
  if (isOpen) typed.value = ''
})

const canConfirm = computed(() => {
  if (!props.requireTyped) return true
  return typed.value.trim() === props.requireTyped
})

const accentClasses = computed(() => {
  switch (props.tone) {
    case 'warning':
      return { bar: 'bg-amber-500', icon: 'text-amber-600 bg-amber-50 ring-amber-200', btn: 'bg-amber-600 hover:bg-amber-700' }
    case 'default':
      return { bar: 'bg-slate-400', icon: 'text-slate-600 bg-slate-100 ring-slate-200', btn: 'bg-slate-900 hover:bg-slate-800' }
    case 'danger':
    default:
      return { bar: 'bg-danger-500', icon: 'text-danger-600 bg-danger-50 ring-danger-200', btn: 'bg-danger-600 hover:bg-danger-700' }
  }
})

function onConfirm(): void {
  if (!canConfirm.value) return
  emit('confirm')
}

function onBackdrop(e: MouseEvent): void {
  // Close only when clicking the backdrop itself, not the modal content.
  if (e.target === e.currentTarget) emit('cancel')
}

// Allow Esc to close the dialog. Bound at the document level so it works
// regardless of where focus is.
onMounted(() => {
  if (!import.meta.client) return
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && props.open) emit('cancel')
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`confirm-title-${title}`"
      @click="onBackdrop"
    >
      <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <div class="h-1 w-full" :class="accentClasses.bar" aria-hidden="true" />
        <div class="p-6">
          <div class="flex items-start gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl ring-1"
              :class="accentClasses.icon"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <h3 :id="`confirm-title-${title}`" class="text-base font-semibold text-slate-900 leading-snug">{{ title }}</h3>
              <p v-if="message" class="mt-1.5 text-sm text-slate-600 leading-relaxed">{{ message }}</p>
            </div>
          </div>

          <!-- Typed confirmation: user has to type the exact name to enable Confirm. -->
          <div v-if="requireTyped" class="mt-5">
            <label class="block text-xs font-medium text-slate-600">
              {{ requireTypedLabel ?? 'To confirm, type' }}
              <span class="font-mono font-semibold text-slate-900">{{ requireTyped }}</span>
            </label>
            <input
              v-model="typed"
              type="text"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-danger-500 focus:outline-none focus:ring-1 focus:ring-danger-500"
              @keyup.enter="onConfirm"
            >
            <p v-if="typed && !canConfirm" class="mt-1 text-xs text-slate-500">
              The text doesn't match yet.
            </p>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              @click="$emit('cancel')"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition shadow-glass"
              :class="accentClasses.btn"
              :disabled="!canConfirm"
              @click="onConfirm"
            >
              {{ confirmLabel ?? 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
