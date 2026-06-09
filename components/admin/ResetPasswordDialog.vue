<script setup lang="ts">
const props = defineProps<{
  open: boolean
  userEmail: string
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  confirm: [newPassword: string]
  cancel: []
}>()

const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      password.value = ''
      confirmPassword.value = ''
      showPassword.value = false
    }
  },
)

const mismatch = computed(
  () => confirmPassword.value.length > 0 && password.value !== confirmPassword.value,
)
const tooShort = computed(
  () => password.value.length > 0 && password.value.length < 12,
)
const canConfirm = computed(
  () =>
    password.value.length >= 12 &&
    password.value === confirmPassword.value &&
    !props.loading,
)

function onConfirm(): void {
  if (!canConfirm.value) return
  emit('confirm', password.value)
}

function onBackdrop(e: MouseEvent): void {
  if (e.target === e.currentTarget && !props.loading) emit('cancel')
}

onMounted(() => {
  if (!import.meta.client) return
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && props.open && !props.loading) emit('cancel')
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})

function generateStrong(): void {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*'
  const length = 16
  let out = ''
  const arr = new Uint32Array(length)
  if (import.meta.client && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr)
    for (let i = 0; i < length; i++) {
      out += alphabet[arr[i] % alphabet.length]
    }
  } else {
    for (let i = 0; i < length; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
  }
  password.value = out
  confirmPassword.value = out
  showPassword.value = true
}
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
      aria-labelledby="reset-password-title"
      @click="onBackdrop"
    >
      <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <div class="h-1 w-full bg-amber-500" aria-hidden="true" />
        <div class="p-6">
          <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl text-amber-600 bg-amber-50 ring-1 ring-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <h3 id="reset-password-title" class="text-base font-semibold text-slate-900 leading-snug">
                Reset password
              </h3>
              <p class="mt-1.5 text-sm text-slate-600 leading-relaxed">
                Set a new password for
                <span class="font-mono font-medium text-slate-900">{{ userEmail }}</span>.
                The user will need this new password to log in.
              </p>
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <div>
              <label class="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>New password <span class="text-slate-400">(min 12 chars)</span></span>
                <button
                  type="button"
                  class="text-xs font-medium text-amber-700 hover:text-amber-800"
                  @click="generateStrong"
                >
                  Generate
                </button>
              </label>
              <div class="relative mt-1.5">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  spellcheck="false"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  :class="{ 'border-danger-300 focus:border-danger-500 focus:ring-danger-500': tooShort }"
                  @keyup.enter="onConfirm"
                >
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 px-3 text-xs text-slate-500 hover:text-slate-700"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
              <p v-if="tooShort" class="mt-1 text-xs text-danger-600">
                Must be at least 12 characters.
              </p>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-600">Confirm password</label>
              <input
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                spellcheck="false"
                class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                :class="{ 'border-danger-300 focus:border-danger-500 focus:ring-danger-500': mismatch }"
                @keyup.enter="onConfirm"
              >
              <p v-if="mismatch" class="mt-1 text-xs text-danger-600">
                Passwords don't match.
              </p>
            </div>

            <p v-if="error" class="rounded-md border border-danger-200 bg-danger-50 p-2 text-xs text-danger-700">
              {{ error }}
            </p>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              :disabled="loading"
              @click="$emit('cancel')"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-xl px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-glass"
              :disabled="!canConfirm"
              @click="onConfirm"
            >
              {{ loading ? 'Saving…' : 'Reset password' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
