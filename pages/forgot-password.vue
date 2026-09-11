<script setup lang="ts">
import type { ApiError } from '~/types/api'
import { scorePassword } from '~/composables/usePasswordStrength'

definePageMeta({ layout: 'default' })

const { t } = useI18n()
const {
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
} = useAuth()

type Step = 'email' | 'code' | 'password' | 'success'

const currentStep = ref<Step>('email')
const email = ref('')
const code = ref('')
const resetToken = ref<string | null>(null)
const codeExpiresAt = ref<number | null>(null)
const nextResendAt = ref<number | null>(null)
const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)

const error = ref<string | null>(null)
const success = ref<string | null>(null)
const loading = ref(false)

// ─── Live clock so the countdown re-renders every second ──────────────────

const now = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
})

// ─── Derived state ────────────────────────────────────────────────────────

const codeRemainingMs = computed(() =>
  codeExpiresAt.value ? Math.max(0, codeExpiresAt.value - now.value) : 0,
)
const codeExpired = computed(
  () => codeExpiresAt.value !== null && codeRemainingMs.value === 0,
)
const codeCountdown = computed(() => {
  const s = Math.floor(codeRemainingMs.value / 1000)
  return {
    mm: String(Math.floor(s / 60)).padStart(2, '0'),
    ss: String(s % 60).padStart(2, '0'),
  }
})

const resendCooldownSec = computed(() =>
  nextResendAt.value ? Math.max(0, Math.ceil((nextResendAt.value - now.value) / 1000)) : 0,
)
const canResend = computed(() => resendCooldownSec.value === 0)

const strength = computed(() => scorePassword(newPassword.value))
const passwordsMatch = computed(
  () => newPassword.value.length > 0 && newPassword.value === confirmPassword.value,
)
const canSubmitPassword = computed(
  () => strength.value.meetsPolicy && passwordsMatch.value,
)

const steps: { key: Step; labelKey: string }[] = [
  { key: 'email', labelKey: 'auth.password.steps.email' },
  { key: 'code', labelKey: 'auth.password.steps.code' },
  { key: 'password', labelKey: 'auth.password.steps.newPassword' },
]
const activeStepIndex = computed(() => {
  if (currentStep.value === 'success') return steps.length - 1
  return steps.findIndex((s) => s.key === currentStep.value)
})

// ─── Actions ──────────────────────────────────────────────────────────────

function normalizeError(err: unknown): string {
  const apiError = err as ApiError
  const msg = apiError?.message ?? ''
  if (apiError?.status === 429) return t('auth.password.errors.rateLimited')
  if (apiError?.status === 400) {
    if (/expira|expired|inv[aá]lido/i.test(msg)) return t('auth.password.errors.codeInvalid')
    return msg || t('auth.password.errors.generic')
  }
  return msg || t('auth.password.errors.generic')
}

async function submitEmail(): Promise<void> {
  if (!email.value) return
  error.value = null
  loading.value = true
  try {
    await requestPasswordReset(email.value)
    codeExpiresAt.value = Date.now() + 10 * 60 * 1000
    nextResendAt.value = Date.now() + 60 * 1000
    code.value = ''
    currentStep.value = 'code'
  } catch (err) {
    error.value = normalizeError(err)
  } finally {
    loading.value = false
  }
}

async function submitCode(): Promise<void> {
  if (code.value.length !== 6) return
  error.value = null
  loading.value = true
  try {
    const res = await verifyPasswordResetCode(email.value, code.value)
    resetToken.value = res.token
    newPassword.value = ''
    confirmPassword.value = ''
    currentStep.value = 'password'
  } catch (err) {
    error.value = normalizeError(err)
  } finally {
    loading.value = false
  }
}

async function resendCode(): Promise<void> {
  if (!canResend.value || loading.value) return
  error.value = null
  loading.value = true
  try {
    await requestPasswordReset(email.value)
    codeExpiresAt.value = Date.now() + 10 * 60 * 1000
    nextResendAt.value = Date.now() + 60 * 1000
    code.value = ''
    success.value = t('auth.password.forgot.sentGeneric')
    setTimeout(() => {
      success.value = null
    }, 3000)
  } catch (err) {
    error.value = normalizeError(err)
  } finally {
    loading.value = false
  }
}

async function submitPassword(): Promise<void> {
  if (!canSubmitPassword.value || !resetToken.value) return
  error.value = null
  loading.value = true
  try {
    await resetPassword({
      resetToken: resetToken.value,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    })
    currentStep.value = 'success'
  } catch (err) {
    const apiError = err as ApiError
    if (apiError?.status === 400 && /Token/i.test(apiError.message ?? '')) {
      error.value = t('auth.password.errors.tokenExpired')
      currentStep.value = 'code'
      resetToken.value = null
    } else {
      error.value = normalizeError(err)
    }
  } finally {
    loading.value = false
  }
}

function goToLogin(): void {
  navigateTo('/login')
}
</script>

<template>
  <div class="w-full max-w-md">
    <!-- Brand mark -->
    <div class="mb-6 flex flex-col items-center">
      <LurviaxLogo :size="72" rounded="rounded-3xl" class="bg-white ring-1 ring-white/70 shadow-glass-lg" />
      <p class="mt-3 text-base font-semibold tracking-tight text-pearl drop-shadow-sm">LURVIAX</p>
      <p class="text-xs text-white/75">{{ $t('auth.brandTagline') }}</p>
    </div>

    <div
      class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/50 via-white/30 to-white/15 backdrop-blur-3xl backdrop-saturate-150 ring-1 ring-white/40 shadow-glass-lg p-8 sm:p-10"
      style="box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.6), inset 0 -1px 0 0 rgba(255,255,255,0.15), 0 30px 60px -25px rgba(15,23,42,0.25), 0 10px 20px -10px rgba(15,23,42,0.1);"
    >
      <div class="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" aria-hidden="true" />
      <div class="pointer-events-none absolute -top-20 -left-16 size-56 rounded-full bg-white/40 blur-3xl" aria-hidden="true" />
      <div class="pointer-events-none absolute -bottom-24 -right-16 size-60 rounded-full bg-sky-200/40 blur-3xl" aria-hidden="true" />

      <div class="relative z-10">
        <!-- Stepper -->
        <div v-if="currentStep !== 'success'" class="mb-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <template v-for="(step, idx) in steps" :key="step.key">
            <span
              :class="[
                'flex items-center gap-2 rounded-full px-3 py-1 transition',
                idx === activeStepIndex
                  ? 'bg-slate-900 text-white shadow-sm'
                  : idx < activeStepIndex
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-white/70 text-slate-500 ring-1 ring-slate-200',
              ]"
            >
              <span class="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold"
                :class="idx <= activeStepIndex ? 'bg-white/20' : 'bg-slate-200 text-slate-500'">
                {{ idx + 1 }}
              </span>
              <span class="hidden sm:inline">{{ $t(step.labelKey) }}</span>
            </span>
            <span v-if="idx < steps.length - 1" class="h-px w-3 bg-slate-300" aria-hidden="true" />
          </template>
        </div>

        <!-- Step: email -->
        <template v-if="currentStep === 'email'">
          <h1 class="text-2xl font-semibold text-slate-900 text-center tracking-tight">
            {{ $t('auth.password.forgot.title') }}
          </h1>
          <p class="mt-2 text-sm text-slate-500 text-center max-w-xs mx-auto">
            {{ $t('auth.password.forgot.subtitle') }}
          </p>
          <form class="mt-8 space-y-3" @submit.prevent="submitEmail">
            <label class="flex items-center gap-3 rounded-2xl bg-white/80 ring-1 ring-slate-200/80 px-4 py-3 focus-within:ring-2 focus-within:ring-slate-900 transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-slate-400" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                v-model="email"
                type="email"
                required
                autocomplete="email"
                :placeholder="$t('auth.password.forgot.emailPlaceholder')"
                class="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              >
            </label>
            <p v-if="error" class="rounded-2xl bg-danger-50/80 border border-danger-200/80 px-4 py-2.5 text-sm text-danger-700">
              {{ error }}
            </p>
            <button
              type="submit"
              class="w-full mt-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-glass"
              :disabled="loading || !email"
            >
              {{ loading ? $t('auth.password.forgot.submitting') : $t('auth.password.forgot.submit') }}
            </button>
          </form>
        </template>

        <!-- Step: code -->
        <template v-else-if="currentStep === 'code'">
          <h1 class="text-2xl font-semibold text-slate-900 text-center tracking-tight">
            {{ $t('auth.password.code.title') }}
          </h1>
          <p class="mt-2 text-sm text-slate-500 text-center max-w-xs mx-auto">
            {{ $t('auth.password.code.subtitle', { minutes: 10 }) }}
          </p>
          <p class="mt-1 text-center text-xs font-medium text-slate-700 break-all">
            {{ email }}
          </p>

          <form class="mt-6 space-y-4" @submit.prevent="submitCode">
            <div class="flex justify-center">
              <PasswordCodeInput
                v-model="code"
                :disabled="loading || codeExpired"
                :has-error="!!error"
                @complete="submitCode"
              />
            </div>

            <div class="flex items-center justify-center gap-4 text-xs text-slate-500">
              <span v-if="!codeExpired">
                {{ $t('auth.password.code.expiresAt', codeCountdown) }}
              </span>
              <span v-else class="text-danger-600 font-medium">
                {{ $t('auth.password.code.expired') }}
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                class="font-medium text-slate-700 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!canResend || loading"
                @click="resendCode"
              >
                {{ canResend
                  ? $t('auth.password.code.resend')
                  : $t('auth.password.code.resendIn', { seconds: resendCooldownSec }) }}
              </button>
            </div>

            <p v-if="success" class="rounded-2xl bg-emerald-50/80 border border-emerald-200/80 px-4 py-2.5 text-sm text-emerald-700 text-center">
              {{ success }}
            </p>
            <p v-if="error" class="rounded-2xl bg-danger-50/80 border border-danger-200/80 px-4 py-2.5 text-sm text-danger-700 text-center">
              {{ error }}
            </p>

            <button
              type="submit"
              class="w-full mt-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-glass"
              :disabled="loading || code.length !== 6 || codeExpired"
            >
              {{ loading ? $t('auth.password.code.verifying') : $t('auth.password.code.verify') }}
            </button>
          </form>
        </template>

        <!-- Step: new password -->
        <template v-else-if="currentStep === 'password'">
          <h1 class="text-2xl font-semibold text-slate-900 text-center tracking-tight">
            {{ $t('auth.password.reset.title') }}
          </h1>
          <p class="mt-2 text-sm text-slate-500 text-center max-w-xs mx-auto">
            {{ $t('auth.password.reset.subtitle') }}
          </p>

          <form class="mt-6 space-y-3" @submit.prevent="submitPassword">
            <label class="flex items-center gap-3 rounded-2xl bg-white/80 ring-1 ring-slate-200/80 px-4 py-3 focus-within:ring-2 focus-within:ring-slate-900 transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-slate-400" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                :placeholder="$t('auth.password.reset.newLabel')"
                class="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              >
              <button
                type="button"
                class="text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                :aria-pressed="showNewPassword"
                @click="showNewPassword = !showNewPassword"
              >
                <svg v-if="showNewPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.77 19.77 0 0 1-3.16 4.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </label>

            <!-- Strength meter -->
            <div v-if="newPassword.length > 0" class="px-1">
              <div class="flex gap-1">
                <span
                  v-for="i in 5"
                  :key="i"
                  :class="[
                    'h-1 flex-1 rounded-full transition-colors',
                    i - 1 <= strength.score ? strength.color : 'bg-slate-200',
                  ]"
                />
              </div>
              <div class="mt-1.5 flex items-center justify-between text-xs">
                <span class="text-slate-500">
                  {{ $t('auth.password.strength.label') }}
                  <span class="font-medium text-slate-700">{{ $t(strength.label) }}</span>
                </span>
                <span v-if="!strength.meetsPolicy" class="text-slate-500">
                  {{ $t('auth.password.policy') }}
                </span>
              </div>
            </div>

            <label class="flex items-center gap-3 rounded-2xl bg-white/80 ring-1 px-4 py-3 focus-within:ring-2 transition"
              :class="confirmPassword && !passwordsMatch
                ? 'ring-danger-300 focus-within:ring-danger-500'
                : 'ring-slate-200/80 focus-within:ring-slate-900'">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-slate-400" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                v-model="confirmPassword"
                :type="showNewPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                :placeholder="$t('auth.password.reset.confirmLabel')"
                class="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              >
            </label>
            <p v-if="confirmPassword && !passwordsMatch" class="px-1 text-xs text-danger-600">
              {{ $t('auth.password.confirmMismatch') }}
            </p>

            <p v-if="error" class="rounded-2xl bg-danger-50/80 border border-danger-200/80 px-4 py-2.5 text-sm text-danger-700">
              {{ error }}
            </p>

            <button
              type="submit"
              class="w-full mt-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-glass"
              :disabled="loading || !canSubmitPassword"
            >
              {{ loading ? $t('auth.password.reset.submitting') : $t('auth.password.reset.submit') }}
            </button>
          </form>
        </template>

        <!-- Success -->
        <template v-else>
          <div class="flex flex-col items-center text-center">
            <div class="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-7">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 class="mt-4 text-2xl font-semibold text-slate-900 tracking-tight">
              {{ $t('auth.password.reset.successTitle') }}
            </h1>
            <p class="mt-2 text-sm text-slate-500 max-w-xs">
              {{ $t('auth.password.reset.successBody') }}
            </p>
            <button
              type="button"
              class="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors shadow-glass"
              @click="goToLogin"
            >
              {{ $t('auth.password.reset.goToLogin') }}
            </button>
          </div>
        </template>

        <p v-if="currentStep !== 'success'" class="mt-6 text-center text-sm">
          <NuxtLink to="/login" class="text-slate-700 hover:text-slate-900 hover:underline font-medium">
            ← {{ $t('auth.password.backToLogin') }}
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
