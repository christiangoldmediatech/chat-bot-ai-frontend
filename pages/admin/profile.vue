<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Tenant } from '~/types/company'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const { changePassword, logout } = useAuth()
const tenant = useTenant()
const bots = useBots()

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

// Plan + bot usage: surfaced here (next to the user's account) instead of on
// the company page — this is "your" subscription view from the user's lens.
const tenantData = ref<Tenant | null>(null)
const botCount = ref<number>(0)
const planLoading = ref(true)
const planError = ref<string | null>(null)

const botsLimit = computed(() => resolveBotsLimit(tenantData.value))
const atBotLimit = computed(() =>
  botsLimit.value !== null && botCount.value >= botsLimit.value,
)

async function loadPlan(): Promise<void> {
  planLoading.value = true
  planError.value = null
  try {
    const [me, list] = await Promise.all([tenant.me(), bots.list()])
    tenantData.value = me
    botCount.value = list.length
  } catch (err) {
    planError.value = (err as ApiError).message || t('admin.profile.loadPlanError')
  } finally {
    planLoading.value = false
  }
}

loadPlan()

const passwordsMatch = computed(() => form.newPassword === form.confirmPassword)
const meetsMinLength = computed(() => form.newPassword.length >= 12)
const canSubmit = computed(() => Boolean(
  form.currentPassword && form.newPassword && form.confirmPassword
  && passwordsMatch.value && meetsMinLength.value,
))

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return
  saving.value = true
  error.value = null
  success.value = null
  try {
    await changePassword(form.currentPassword, form.newPassword)
    success.value = t('admin.profile.successMessage')
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
  } catch (err) {
    error.value = (err as ApiError).message || t('admin.profile.errorGeneric')
  } finally {
    saving.value = false
  }
}

async function onLogout(): Promise<void> {
  logout()
  await router.replace('/login')
}
</script>

<template>
  <div>
    <header>
      <h1 class="text-2xl font-semibold tracking-tight">{{ $t('admin.profile.title') }}</h1>
      <p class="text-slate-500 mt-1 text-sm max-w-2xl">
        {{ $t('admin.profile.subtitle') }}
      </p>
    </header>

    <!-- Account snapshot card -->
    <section v-if="auth.user" class="mt-6 max-w-2xl rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6">
      <div class="flex items-start gap-4">
        <div class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-semibold text-2xl ring-1 ring-white/40 shadow-inner">
          {{ auth.user.email.charAt(0).toUpperCase() }}
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-lg font-semibold text-slate-900 truncate">{{ auth.user.email }}</h2>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary-700 ring-1 ring-primary-100">
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

      <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="rounded-xl bg-slate-50/80 ring-1 ring-slate-200/70 px-3 py-2.5">
          <p class="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('admin.profile.emailLabel') }}</p>
          <p class="mt-0.5 text-sm text-slate-700 truncate">{{ auth.user.email }}</p>
        </div>
        <div class="rounded-xl bg-slate-50/80 ring-1 ring-slate-200/70 px-3 py-2.5">
          <p class="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('admin.profile.roleLabel') }}</p>
          <p class="mt-0.5 text-sm text-slate-700">{{ auth.user.role }}</p>
        </div>
      </div>

      <p class="mt-4 text-xs text-slate-500">
        {{ $t('admin.profile.emailRoleNote') }}
      </p>
    </section>

    <!-- Plan card: subscription tied to the workspace, but surfaced here so
         the user sees their plan and bot usage in their own profile view. -->
    <section class="mt-4 max-w-2xl rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6">
      <header class="flex items-start gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-100">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-violet-600" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.profile.planSectionTitle') }}</h2>
          <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.profile.planSectionSubtitle') }}</p>
        </div>
      </header>

      <SpinnerInline v-if="planLoading" class="mt-4" />

      <p v-else-if="planError" class="mt-4 rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
        {{ planError }}
      </p>

      <template v-else-if="tenantData">
        <div class="mt-4">
          <PlanCard :plan="tenantData.planDetails" />
        </div>

        <!-- Bot usage row: makes the BASIC plan's "1 bot" feel tangible. -->
        <div
          class="mt-4 rounded-xl p-3 ring-1"
          :class="atBotLimit
            ? 'bg-amber-50/70 ring-amber-200'
            : 'bg-slate-50/80 ring-slate-200/70'"
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
            <!-- Progress dots (used / limit) — small visual cue, only when there's a finite limit. -->
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
      </template>
    </section>

    <!-- Change password card -->
    <form class="mt-4 max-w-2xl rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6 space-y-5" @submit.prevent="onSubmit">
      <header class="flex items-start gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-50 ring-1 ring-success-100">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-success-600" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.profile.changePasswordTitle') }}</h2>
          <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.profile.changePasswordSubtitle') }}</p>
        </div>
      </header>

      <p v-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
        {{ error }}
      </p>
      <p v-if="success" class="rounded-xl border border-success-200 bg-success-50/80 p-3 text-sm text-success-700">
        {{ success }}
      </p>

      <!-- Current password -->
      <div>
        <label class="block text-sm font-medium text-slate-700">{{ $t('admin.profile.currentPassword') }}</label>
        <div class="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition">
          <input
            v-model="form.currentPassword"
            :type="showCurrent ? 'text' : 'password'"
            required
            autocomplete="current-password"
            class="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none"
          >
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700 transition"
            :aria-label="showCurrent ? $t('auth.login.hidePassword') : $t('auth.login.showPassword')"
            :aria-pressed="showCurrent"
            @click="showCurrent = !showCurrent"
          >
            <svg v-if="showCurrent" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.77 19.77 0 0 1-3.16 4.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>

      <!-- New password -->
      <div>
        <label class="block text-sm font-medium text-slate-700">{{ $t('admin.profile.newPassword') }}</label>
        <div class="mt-1 flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2 focus-within:ring-1 transition" :class="form.newPassword && !meetsMinLength ? 'border-danger-300 focus-within:border-danger-500 focus-within:ring-danger-500' : 'border-slate-200 focus-within:border-primary-500 focus-within:ring-primary-500'">
          <input
            v-model="form.newPassword"
            :type="showNew ? 'text' : 'password'"
            required
            minlength="12"
            autocomplete="new-password"
            class="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none"
          >
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700 transition"
            :aria-label="showNew ? $t('auth.login.hidePassword') : $t('auth.login.showPassword')"
            :aria-pressed="showNew"
            @click="showNew = !showNew"
          >
            <svg v-if="showNew" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.77 19.77 0 0 1-3.16 4.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
        <p class="mt-1 text-xs" :class="form.newPassword && !meetsMinLength ? 'text-danger-600' : 'text-slate-500'">
          {{ $t('admin.profile.minChars') }} <span v-if="form.newPassword">{{ form.newPassword.length }}/12</span>
        </p>
      </div>

      <!-- Confirm new password -->
      <div>
        <label class="block text-sm font-medium text-slate-700">{{ $t('admin.profile.confirmPassword') }}</label>
        <div class="mt-1 flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2 focus-within:ring-1 transition" :class="form.confirmPassword && !passwordsMatch ? 'border-danger-300 focus-within:border-danger-500 focus-within:ring-danger-500' : 'border-slate-200 focus-within:border-primary-500 focus-within:ring-primary-500'">
          <input
            v-model="form.confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            required
            autocomplete="new-password"
            class="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none"
          >
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700 transition"
            :aria-label="showConfirm ? $t('auth.login.hidePassword') : $t('auth.login.showPassword')"
            :aria-pressed="showConfirm"
            @click="showConfirm = !showConfirm"
          >
            <svg v-if="showConfirm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.77 19.77 0 0 1-3.16 4.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
        <p v-if="form.confirmPassword && !passwordsMatch" class="mt-1 text-xs text-danger-600">{{ $t('admin.profile.passwordsDontMatch') }}</p>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/70">
        <button
          type="submit"
          class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 shadow-glass transition"
          :disabled="saving || !canSubmit"
        >
          {{ saving ? $t('admin.profile.updating') : $t('admin.profile.updatePassword') }}
        </button>
      </div>
    </form>

    <!-- Session card -->
    <section class="mt-4 max-w-2xl rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6">
      <header class="flex items-start gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-slate-600" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.profile.sessionTitle') }}</h2>
          <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.profile.sessionSubtitle') }}</p>
        </div>
      </header>
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-xl border border-danger-200 bg-danger-50/60 px-4 py-2 text-sm font-medium text-danger-700 hover:bg-danger-50 transition"
          @click="onLogout"
        >
          {{ $t('admin.profile.logout') }}
        </button>
      </div>
    </section>
  </div>
</template>
