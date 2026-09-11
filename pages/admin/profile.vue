<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { BillingState } from '~/types/billing'
import type { Tenant } from '~/types/company'
import { scorePassword } from '~/composables/usePasswordStrength'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const {
  logout,
  requestPasswordChange,
  verifyPasswordChangeCode,
  changePasswordWithCode,
} = useAuth()
const tenant = useTenant()
const bots = useBots()
const billing = useBilling()

// ─── Password change flow (3 steps + success) ─────────────────────────────

type ChangeStep = 'idle' | 'code' | 'password' | 'done'
const changeStep = ref<ChangeStep>('idle')
const changeCode = ref('')
const changeToken = ref<string | null>(null)
const codeExpiresAt = ref<number | null>(null)
const nextResendAt = ref<number | null>(null)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrent = ref(false)
const showNew = ref(false)

const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

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
  () => Boolean(currentPassword.value) && strength.value.meetsPolicy && passwordsMatch.value,
)

function normalizeChangeError(err: unknown): string {
  const apiError = err as ApiError
  const msg = apiError?.message ?? ''
  if (apiError?.status === 429) return t('auth.password.errors.rateLimited')
  if (apiError?.status === 401 && /actual/i.test(msg)) return t('admin.profile.currentPasswordWrong')
  if (apiError?.status === 400 && /expira|expired|inv[aá]lido/i.test(msg)) {
    return t('auth.password.errors.codeInvalid')
  }
  return msg || t('auth.password.errors.generic')
}

async function startChange(): Promise<void> {
  error.value = null
  success.value = null
  saving.value = true
  try {
    await requestPasswordChange()
    codeExpiresAt.value = Date.now() + 10 * 60 * 1000
    nextResendAt.value = Date.now() + 60 * 1000
    changeCode.value = ''
    changeToken.value = null
    changeStep.value = 'code'
  } catch (err) {
    error.value = normalizeChangeError(err)
  } finally {
    saving.value = false
  }
}

async function submitCode(): Promise<void> {
  if (changeCode.value.length !== 6) return
  error.value = null
  saving.value = true
  try {
    const res = await verifyPasswordChangeCode(changeCode.value)
    changeToken.value = res.token
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    changeStep.value = 'password'
  } catch (err) {
    error.value = normalizeChangeError(err)
  } finally {
    saving.value = false
  }
}

async function resendChangeCode(): Promise<void> {
  if (!canResend.value || saving.value) return
  error.value = null
  saving.value = true
  try {
    await requestPasswordChange()
    codeExpiresAt.value = Date.now() + 10 * 60 * 1000
    nextResendAt.value = Date.now() + 60 * 1000
    changeCode.value = ''
    success.value = t('auth.password.change.requestSent')
    setTimeout(() => {
      success.value = null
    }, 3000)
  } catch (err) {
    error.value = normalizeChangeError(err)
  } finally {
    saving.value = false
  }
}

async function submitPasswordChange(): Promise<void> {
  if (!canSubmitPassword.value || !changeToken.value) return
  error.value = null
  saving.value = true
  try {
    await changePasswordWithCode({
      changeToken: changeToken.value,
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    })
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    changeStep.value = 'done'
  } catch (err) {
    const apiError = err as ApiError
    if (apiError?.status === 400 && /Token/i.test(apiError.message ?? '')) {
      error.value = t('auth.password.errors.tokenExpired')
      changeStep.value = 'code'
      changeToken.value = null
    } else {
      error.value = normalizeChangeError(err)
    }
  } finally {
    saving.value = false
  }
}

function resetChangeFlow(): void {
  changeStep.value = 'idle'
  changeCode.value = ''
  changeToken.value = null
  codeExpiresAt.value = null
  nextResendAt.value = null
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  error.value = null
  success.value = null
}

const tenantData = ref<Tenant | null>(null)
const botCount = ref<number>(0)
const planLoading = ref(true)
const planError = ref<string | null>(null)
const billingState = ref<BillingState | null>(null)

const botsLimit = computed(() => resolveBotsLimit(tenantData.value))
const atBotLimit = computed(() =>
  botsLimit.value !== null && botCount.value >= botsLimit.value,
)

const activeUntilFormatted = computed<string | null>(() => {
  const ends = billingState.value?.activeCycle?.endsAt
  if (!ends) return null
  return new Date(ends).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const cycleTone = computed<'trial' | 'warning' | 'expired' | 'ok'>(() => {
  if (!billingState.value) return 'ok'
  if (billingState.value.tenantStatus !== 'ACTIVE') return 'expired'
  if (billingState.value.activeCycle?.isTrial) return 'trial'
  const days = billingState.value.daysRemaining
  if (days !== null && days <= 10) return 'warning'
  return 'ok'
})

async function loadPlan(): Promise<void> {
  planLoading.value = true
  planError.value = null
  try {
    const [me, list, bs] = await Promise.all([
      tenant.me(),
      bots.list(),
      billing.me(),
    ])
    tenantData.value = me
    botCount.value = list.length
    billingState.value = bs
  } catch (err) {
    planError.value = (err as ApiError).message || t('admin.profile.loadPlanError')
  } finally {
    planLoading.value = false
  }
}

loadPlan()

async function onLogout(): Promise<void> {
  logout()
  await router.replace('/login')
}

// Shared visual recipe — matches the StatCard tones on /admin so the profile
// page reads as part of the same surface. Each card declares its tone via
// `card / ring / shadow / pill` selectors below.
const cardShadow = {
  indigo: 'shadow-[0_8px_28px_-12px_rgba(79,70,229,0.22),0_4px_10px_-6px_rgba(79,70,229,0.10),0_-2px_8px_-4px_rgba(79,70,229,0.05)]',
  emerald: 'shadow-[0_8px_28px_-12px_rgba(16,185,129,0.22),0_4px_10px_-6px_rgba(16,185,129,0.10),0_-2px_8px_-4px_rgba(16,185,129,0.05)]',
  amber: 'shadow-[0_8px_28px_-12px_rgba(245,158,11,0.24),0_4px_10px_-6px_rgba(245,158,11,0.12),0_-2px_8px_-4px_rgba(245,158,11,0.06)]',
  rose: 'shadow-[0_8px_28px_-12px_rgba(244,63,94,0.22),0_4px_10px_-6px_rgba(244,63,94,0.10),0_-2px_8px_-4px_rgba(244,63,94,0.05)]',
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <header class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('admin.profile.title') }}</h1>
        <p class="text-slate-500 mt-1 text-sm max-w-2xl">
          {{ $t('admin.profile.subtitle') }}
        </p>
      </div>
      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-rose-600 hover:to-rose-700 transition"
        :class="cardShadow.rose"
        @click="onLogout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {{ $t('admin.profile.logout') }}
      </button>
    </header>

    <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- LEFT COLUMN — account + change password -->
      <div class="lg:col-span-2 space-y-4">
        <!-- Account snapshot — indigo tone -->
        <section
          v-if="auth.user"
          class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-white ring-1 ring-indigo-200/70 p-6"
          :class="cardShadow.indigo"
        >
          <span class="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-indigo-300/30 blur-3xl" aria-hidden="true" />
          <div class="relative flex items-start gap-4">
            <div class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-semibold text-2xl ring-1 ring-indigo-300/60 shadow-sm">
              {{ auth.user.email.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-slate-900 truncate">{{ auth.user.email }}</h2>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                    <path d="M12 11c2.21 0 4-1.79 4-4S14.21 3 12 3 8 4.79 8 7s1.79 4 4 4z" />
                    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
                  </svg>
                  {{ auth.user.role }}
                </span>
                <span class="text-xs text-slate-500">{{ $t('admin.profile.inThisWorkspace') }}</span>
              </div>
            </div>
          </div>

          <div class="relative mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="rounded-xl bg-white/80 ring-1 ring-indigo-100 px-3 py-2.5">
              <p class="text-[10px] uppercase tracking-wider font-semibold text-indigo-700/80">{{ $t('admin.profile.emailLabel') }}</p>
              <p class="mt-0.5 text-sm text-slate-800 truncate">{{ auth.user.email }}</p>
            </div>
            <div class="rounded-xl bg-white/80 ring-1 ring-indigo-100 px-3 py-2.5">
              <p class="text-[10px] uppercase tracking-wider font-semibold text-indigo-700/80">{{ $t('admin.profile.roleLabel') }}</p>
              <p class="mt-0.5 text-sm text-slate-800">{{ auth.user.role }}</p>
            </div>
          </div>

          <p class="relative mt-4 text-xs text-slate-500">
            {{ $t('admin.profile.emailRoleNote') }}
          </p>
        </section>

        <!-- Change password — emerald tone, 3-step verified flow -->
        <section
          class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-white ring-1 ring-emerald-200/70 p-6 space-y-5"
          :class="cardShadow.emerald"
        >
          <span class="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-emerald-300/30 blur-3xl" aria-hidden="true" />
          <header class="relative flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white ring-1 ring-emerald-300/60 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div class="flex-1">
              <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.profile.changePasswordTitle') }}</h2>
              <p class="text-xs text-slate-500 mt-0.5">{{ $t('auth.password.change.subtitle') }}</p>
            </div>
            <button
              v-if="changeStep !== 'idle' && changeStep !== 'done'"
              type="button"
              class="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
              @click="resetChangeFlow"
            >
              {{ $t('auth.password.change.startOver') }}
            </button>
          </header>

          <p v-if="error" class="relative rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
            {{ error }}
          </p>
          <p v-if="success" class="relative rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-700">
            {{ success }}
          </p>

          <!-- Step: idle → button to request the code -->
          <div v-if="changeStep === 'idle'" class="relative space-y-4">
            <p class="text-sm text-slate-600 leading-relaxed">
              {{ $t('admin.profile.changeCodeExplainer', { email: auth.user?.email ?? '' }) }}
            </p>
            <div class="flex items-center justify-end pt-1 border-t border-emerald-100">
              <button
                type="button"
                class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 shadow-glass transition"
                :disabled="saving"
                @click="startChange"
              >
                {{ saving ? $t('auth.password.change.requestSubmitting') : $t('auth.password.change.requestSubmit') }}
              </button>
            </div>
          </div>

          <!-- Step: code -->
          <div v-else-if="changeStep === 'code'" class="relative space-y-4">
            <p class="text-sm text-slate-600">
              {{ $t('auth.password.code.subtitle', { minutes: 10 }) }}
            </p>
            <p class="text-xs font-medium text-slate-700 break-all">
              {{ auth.user?.email }}
            </p>
            <div class="flex justify-center">
              <PasswordCodeInput
                v-model="changeCode"
                :disabled="saving || codeExpired"
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
                :disabled="!canResend || saving"
                @click="resendChangeCode"
              >
                {{ canResend
                  ? $t('auth.password.code.resend')
                  : $t('auth.password.code.resendIn', { seconds: resendCooldownSec }) }}
              </button>
            </div>
            <div class="flex items-center justify-end pt-1 border-t border-emerald-100">
              <button
                type="button"
                class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 shadow-glass transition"
                :disabled="saving || changeCode.length !== 6 || codeExpired"
                @click="submitCode"
              >
                {{ saving ? $t('auth.password.code.verifying') : $t('auth.password.code.verify') }}
              </button>
            </div>
          </div>

          <!-- Step: new password -->
          <form v-else-if="changeStep === 'password'" class="relative space-y-4" @submit.prevent="submitPasswordChange">
            <div>
              <label class="block text-sm font-medium text-slate-700">{{ $t('auth.password.change.currentLabel') }}</label>
              <div class="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition">
                <input
                  v-model="currentPassword"
                  :type="showCurrent ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  class="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none"
                >
                <button
                  type="button"
                  class="text-slate-400 hover:text-slate-700 transition"
                  :aria-pressed="showCurrent"
                  @click="showCurrent = !showCurrent"
                >
                  <svg v-if="showCurrent" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
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
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700">{{ $t('auth.password.reset.newLabel') }}</label>
              <div class="mt-1 flex items-center gap-2 rounded-xl border bg-white/90 px-3 py-2 focus-within:ring-1 transition" :class="newPassword && !strength.meetsPolicy ? 'border-danger-300 focus-within:border-danger-500 focus-within:ring-danger-500' : 'border-slate-200 focus-within:border-primary-500 focus-within:ring-primary-500'">
                <input
                  v-model="newPassword"
                  :type="showNew ? 'text' : 'password'"
                  required
                  autocomplete="new-password"
                  class="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none"
                >
                <button
                  type="button"
                  class="text-slate-400 hover:text-slate-700 transition"
                  :aria-pressed="showNew"
                  @click="showNew = !showNew"
                >
                  <svg v-if="showNew" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
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
              </div>
              <div v-if="newPassword.length > 0" class="mt-2">
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
                  <span v-if="!strength.meetsPolicy" class="text-slate-500 text-right ml-2">
                    {{ $t('auth.password.policy') }}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700">{{ $t('auth.password.reset.confirmLabel') }}</label>
              <div class="mt-1 flex items-center gap-2 rounded-xl border bg-white/90 px-3 py-2 focus-within:ring-1 transition"
                :class="confirmPassword && !passwordsMatch ? 'border-danger-300 focus-within:border-danger-500 focus-within:ring-danger-500' : 'border-slate-200 focus-within:border-primary-500 focus-within:ring-primary-500'">
                <input
                  v-model="confirmPassword"
                  :type="showNew ? 'text' : 'password'"
                  required
                  autocomplete="new-password"
                  class="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none"
                >
              </div>
              <p v-if="confirmPassword && !passwordsMatch" class="mt-1 text-xs text-danger-600">
                {{ $t('auth.password.confirmMismatch') }}
              </p>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-emerald-100">
              <button
                type="submit"
                class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 shadow-glass transition"
                :disabled="saving || !canSubmitPassword"
              >
                {{ saving ? $t('auth.password.reset.submitting') : $t('auth.password.reset.submit') }}
              </button>
            </div>
          </form>

          <!-- Step: done -->
          <div v-else class="relative flex flex-col items-center text-center py-2">
            <div class="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-6">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 class="mt-3 text-base font-semibold text-slate-900">
              {{ $t('auth.password.change.successTitle') }}
            </h3>
            <p class="mt-1 text-sm text-slate-600 max-w-sm">
              {{ $t('auth.password.change.successBody') }}
            </p>
            <button
              type="button"
              class="mt-4 rounded-xl bg-white ring-1 ring-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              @click="resetChangeFlow"
            >
              {{ $t('admin.profile.changePasswordTitle') }}
            </button>
          </div>
        </section>
      </div>

      <!-- RIGHT COLUMN — plan + session -->
      <div class="lg:col-span-1 space-y-4">
        <!-- Plan — amber tone (matches dashboard "humans handled" / value/usage feel) -->
        <section
          class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-white to-white ring-1 ring-amber-200/70 p-6"
          :class="cardShadow.amber"
        >
          <span class="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-amber-300/30 blur-3xl" aria-hidden="true" />
          <header class="relative flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white ring-1 ring-amber-300/60 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.profile.planSectionTitle') }}</h2>
              <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.profile.planSectionSubtitle') }}</p>
            </div>
          </header>

          <SpinnerInline v-if="planLoading" class="relative mt-4" />

          <p v-else-if="planError" class="relative mt-4 rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
            {{ planError }}
          </p>

          <template v-else-if="tenantData">
            <div class="relative mt-4">
              <PlanCard :plan="tenantData.planDetails" />
            </div>

            <!-- Bot usage row -->
            <div
              class="relative mt-4 rounded-xl p-3 ring-1"
              :class="atBotLimit
                ? 'bg-amber-50/80 ring-amber-200'
                : 'bg-white/80 ring-slate-200/70'"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] uppercase tracking-wider font-semibold" :class="atBotLimit ? 'text-amber-700' : 'text-slate-500'">
                    {{ $t('admin.profile.botsUsageLabel') }}
                  </p>
                  <p class="mt-0.5 text-sm font-semibold" :class="atBotLimit ? 'text-amber-800' : 'text-slate-800'">
                    <template v-if="botsLimit === null">
                      {{ $t('admin.profile.botsUsageUnlimited', { used: botCount }) }}
                    </template>
                    <template v-else>
                      {{ $t('admin.profile.botsUsageWithLimit', { used: botCount, limit: botsLimit }) }}
                    </template>
                  </p>
                </div>
                <div v-if="botsLimit !== null" class="flex items-center gap-1 shrink-0">
                  <span
                    v-for="i in botsLimit"
                    :key="i"
                    class="size-2 rounded-full"
                    :class="i <= botCount
                      ? (atBotLimit ? 'bg-amber-500' : 'bg-primary-500')
                      : 'bg-slate-200'"
                  />
                </div>
              </div>
              <p v-if="atBotLimit" class="mt-2 text-xs text-amber-800/90 leading-relaxed">
                {{ $t('admin.profile.botsAtLimitNote') }}
              </p>
            </div>

            <!-- Billing cycle — keeps its semantic tone (ok/trial/warning/expired) -->
            <div
              v-if="billingState"
              class="relative mt-3 rounded-xl p-3 ring-1"
              :class="{
                'bg-emerald-50/80 ring-emerald-200': cycleTone === 'ok',
                'bg-sky-50/80 ring-sky-200': cycleTone === 'trial',
                'bg-amber-50/80 ring-amber-200': cycleTone === 'warning',
                'bg-rose-50/80 ring-rose-200': cycleTone === 'expired',
              }"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p
                    class="text-[10px] uppercase tracking-wider font-semibold"
                    :class="{
                      'text-emerald-700': cycleTone === 'ok',
                      'text-sky-700': cycleTone === 'trial',
                      'text-amber-700': cycleTone === 'warning',
                      'text-rose-700': cycleTone === 'expired',
                    }"
                  >
                    {{ $t('admin.profile.cycleLabel') }}
                  </p>
                  <template v-if="cycleTone === 'expired'">
                    <p class="mt-0.5 text-sm font-semibold text-rose-800">
                      {{ billingState.tenantStatus === 'SUSPENDED'
                        ? $t('admin.profile.cycleSuspended')
                        : $t('admin.profile.cycleExpired') }}
                    </p>
                  </template>
                  <template v-else-if="activeUntilFormatted">
                    <p
                      class="mt-0.5 text-sm font-semibold"
                      :class="{
                        'text-emerald-800': cycleTone === 'ok',
                        'text-sky-800': cycleTone === 'trial',
                        'text-amber-800': cycleTone === 'warning',
                      }"
                    >
                      <template v-if="billingState.activeCycle?.isTrial">
                        {{ $t('admin.profile.cycleTrialUntil', { date: activeUntilFormatted }) }}
                      </template>
                      <template v-else>
                        {{ $t('admin.profile.cycleActiveUntil', { date: activeUntilFormatted }) }}
                      </template>
                    </p>
                    <p
                      v-if="billingState.daysRemaining !== null"
                      class="mt-0.5 text-xs"
                      :class="{
                        'text-emerald-700/80': cycleTone === 'ok',
                        'text-sky-700/80': cycleTone === 'trial',
                        'text-amber-700/90': cycleTone === 'warning',
                      }"
                    >
                      {{ billingState.daysRemaining === 0
                        ? $t('admin.profile.cycleDaysToday')
                        : $t('admin.profile.cycleDaysRemaining', { days: billingState.daysRemaining }, billingState.daysRemaining) }}
                    </p>
                  </template>
                  <template v-else>
                    <p class="mt-0.5 text-sm font-semibold text-rose-800">
                      {{ $t('admin.profile.cycleNoActive') }}
                    </p>
                  </template>
                </div>
              </div>
            </div>

            <!-- Pay-by-transfer entry point — visually distinct so it doesn't
                 read as part of the billing-cycle status. -->
            <NuxtLink
              to="/admin/payment"
              class="relative mt-3 flex items-center justify-between gap-3 rounded-xl bg-white/90 ring-1 ring-slate-200/80 p-3 hover:bg-white hover:ring-amber-300 transition group"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFDD00] text-slate-900 ring-1 ring-amber-300/60 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                    <rect x="2" y="6" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                    <path d="M6 14h4" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-[10px] uppercase tracking-wider font-semibold text-amber-700">
                    {{ $t('admin.profile.paymentLinkLabel') }}
                  </p>
                  <p class="mt-0.5 text-sm font-semibold text-slate-800 truncate">
                    {{ $t('admin.profile.paymentLinkTitle') }}
                  </p>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 shrink-0 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </NuxtLink>
          </template>
        </section>
      </div>
    </div>
  </div>
</template>
