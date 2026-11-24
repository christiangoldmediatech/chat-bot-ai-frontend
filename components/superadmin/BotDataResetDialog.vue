<script setup lang="ts">
const props = defineProps<{
  open: boolean
  botName: string
  submitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  confirm: [typedName: string]
  cancel: []
}>()

const typed = ref('')

const deletedKeys = [
  'customers',
  'conversations',
  'leads',
  'appointments',
  'usage',
] as const

const keptKeys = [
  'config',
  'services',
  'templates',
  'documents',
  'calendar',
] as const

watch(() => props.open, (isOpen) => {
  if (isOpen) typed.value = ''
})

const canConfirm = computed(() => typed.value === props.botName && !props.submitting)

function onConfirm(): void {
  if (!canConfirm.value) return
  emit('confirm', typed.value)
}

function onCancel(): void {
  if (props.submitting) return
  emit('cancel')
}

function onBackdrop(e: MouseEvent): void {
  if (e.target === e.currentTarget) onCancel()
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.open) onCancel()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bot-data-reset-title"
        @click="onBackdrop"
      >
        <div class="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 my-auto">
          <div class="h-1 w-full bg-danger-500" aria-hidden="true" />
          <div class="p-6">
            <div class="flex items-start gap-3">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 text-danger-600 bg-danger-50 ring-danger-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <h3 id="bot-data-reset-title" class="text-base font-semibold text-slate-900 leading-snug">
                  {{ $t('superadmin.botDataReset.title', { name: botName }) }}
                </h3>
                <p class="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  {{ $t('superadmin.botDataReset.intro') }}
                </p>
              </div>
            </div>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div class="rounded-xl border border-danger-200 bg-danger-50 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-danger-700">
                  {{ $t('superadmin.botDataReset.deletedTitle') }}
                </p>
                <ul class="mt-2 space-y-1 text-sm text-slate-700 list-disc pl-4">
                  <li v-for="key in deletedKeys" :key="key">{{ $t(`superadmin.botDataReset.deleted.${key}`) }}</li>
                </ul>
              </div>
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {{ $t('superadmin.botDataReset.keptTitle') }}
                </p>
                <ul class="mt-2 space-y-1 text-sm text-slate-700 list-disc pl-4">
                  <li v-for="key in keptKeys" :key="key">{{ $t(`superadmin.botDataReset.kept.${key}`) }}</li>
                </ul>
              </div>
            </div>

            <ul class="mt-4 space-y-1 text-xs text-slate-600 list-disc pl-4">
              <li>{{ $t('superadmin.botDataReset.noteBackground') }}</li>
              <li>{{ $t('superadmin.botDataReset.noteGoogleCalendar') }}</li>
              <li>{{ $t('superadmin.botDataReset.noteBlockedCustomers') }}</li>
              <li class="font-semibold text-danger-700">{{ $t('superadmin.botDataReset.noteIrreversible') }}</li>
            </ul>

            <div class="mt-5">
              <label for="bot-data-reset-typed" class="block text-xs font-medium text-slate-600">
                {{ $t('superadmin.botDataReset.typedLabel') }}
                <span class="font-mono font-semibold text-slate-900">{{ botName }}</span>
              </label>
              <input
                id="bot-data-reset-typed"
                v-model="typed"
                type="text"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                :disabled="submitting"
                class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 px-3 py-2 text-sm font-mono focus:border-danger-500 focus:outline-none focus:ring-1 focus:ring-danger-500 disabled:opacity-60"
                @keyup.enter="onConfirm"
              >
              <p v-if="typed && typed !== botName" class="mt-1 text-xs text-slate-500">
                {{ $t('superadmin.botDataReset.typedMismatch') }}
              </p>
            </div>

            <p v-if="error" class="mt-4 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
              {{ error }}
            </p>

            <div class="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                :disabled="submitting"
                @click="onCancel"
              >
                {{ $t('superadmin.botDataReset.cancel') }}
              </button>
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-glass"
                :disabled="!canConfirm"
                @click="onConfirm"
              >
                {{ submitting ? $t('superadmin.botDataReset.submitting') : $t('superadmin.botDataReset.confirm') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
