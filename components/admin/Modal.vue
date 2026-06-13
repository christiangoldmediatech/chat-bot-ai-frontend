<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    /** Constrains the dialog width. */
    size?: 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  { size: 'md' },
)

const emit = defineEmits<{
  close: []
}>()

const sizeClass = computed(() => {
  return {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[props.size]
})

function onBackdrop(e: MouseEvent): void {
  if (e.target === e.currentTarget) emit('close')
}

// Lock body scroll while a modal is open so the page underneath doesn't
// scroll when the user wheels over the backdrop. Restore on close/unmount.
watch(
  () => props.open,
  (open) => {
    if (!import.meta.client) return
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

onMounted(() => {
  if (!import.meta.client) return
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && props.open) emit('close')
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})
</script>

<template>
  <!--
    Teleported to <body> so the modal escapes any ancestor that establishes a
    containing block via `backdrop-filter` / `filter` / `transform` (admin
    cards use `backdrop-blur-xl`, which traps `position: fixed`). Without
    the teleport, the backdrop covers only the parent card instead of the
    full viewport.
  -->
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
        @click="onBackdrop"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="open"
            class="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 flex flex-col max-h-[90vh] my-auto"
            :class="sizeClass"
          >
            <header class="flex items-start justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
              <div class="min-w-0">
                <h3 class="text-base font-semibold text-slate-900 leading-snug">{{ title }}</h3>
                <p v-if="subtitle" class="mt-0.5 text-xs text-slate-500">{{ subtitle }}</p>
              </div>
              <button
                type="button"
                class="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                :aria-label="$t('common.close')"
                @click="emit('close')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>

            <div class="flex-1 overflow-y-auto px-5 py-4">
              <slot />
            </div>

            <footer v-if="$slots.footer" class="border-t border-slate-200/70 px-5 py-3 bg-slate-50/60">
              <slot name="footer" />
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
