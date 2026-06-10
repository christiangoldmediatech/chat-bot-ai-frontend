<script setup lang="ts">
import type { ApiError } from '~/types/api'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
const auth = useSuperadminAuthStore()
const router = useRouter()
const { superadminChangePassword, superadminLogout } = useAuth()

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
    await superadminChangePassword(form.currentPassword, form.newPassword)
    success.value = t('superadmin.profile.successMessage')
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
  } catch (err) {
    error.value = (err as ApiError).message || t('superadmin.profile.errorGeneric')
  } finally {
    saving.value = false
  }
}

async function onLogout(): Promise<void> {
  superadminLogout()
  await router.replace('/superadmin/login')
}
</script>

<template>
  <div>
    <header>
      <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
        <span class="size-1.5 rounded-full bg-indigo-400" />
        {{ $t('superadmin.profile.kicker') }}
      </span>
      <h1 class="mt-2 text-2xl font-semibold text-slate-100 tracking-tight">{{ $t('superadmin.profile.title') }}</h1>
      <p class="text-slate-400 mt-1 text-sm max-w-2xl">
        {{ $t('superadmin.profile.subtitle') }}
      </p>
    </header>

    <!-- Account snapshot -->
    <section v-if="auth.user" class="mt-6 max-w-2xl rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6">
      <div class="flex items-start gap-4">
        <div class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-semibold text-2xl ring-1 ring-slate-700 shadow-inner">
          {{ auth.user.email.charAt(0).toUpperCase() }}
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-lg font-semibold text-slate-100 truncate">{{ auth.user.email }}</h2>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              {{ $t('superadmin.profile.platformAdmin') }}
            </span>
            <span class="text-xs text-slate-500">{{ $t('superadmin.profile.globalAccess') }}</span>
          </div>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="rounded-xl bg-slate-950 ring-1 ring-slate-800 px-3 py-2.5">
          <p class="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('superadmin.profile.emailLabel') }}</p>
          <p class="mt-0.5 text-sm text-slate-200 truncate">{{ auth.user.email }}</p>
        </div>
        <div class="rounded-xl bg-slate-950 ring-1 ring-slate-800 px-3 py-2.5">
          <p class="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('superadmin.profile.accountIdLabel') }}</p>
          <p class="mt-0.5 text-xs font-mono text-slate-400 truncate">{{ auth.user.id }}</p>
        </div>
      </div>

      <div class="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/5 ring-1 ring-amber-500/20 px-3 py-2.5 text-xs text-amber-200/90">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 mt-0.5 shrink-0 text-amber-400" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p class="leading-relaxed">
          {{ $t('superadmin.profile.warningNote') }}
        </p>
      </div>
    </section>

    <!-- Change password -->
    <form class="mt-4 max-w-2xl rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6 space-y-5" @submit.prevent="onSubmit">
      <header class="flex items-start gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-emerald-400" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-semibold text-slate-100">{{ $t('superadmin.profile.changePasswordTitle') }}</h2>
          <p class="text-xs text-slate-500 mt-0.5">{{ $t('superadmin.profile.changePasswordSubtitle') }}</p>
        </div>
      </header>

      <p v-if="error" class="rounded-xl border border-danger-800 bg-danger-950/80 p-3 text-sm text-danger-300">
        {{ error }}
      </p>
      <p v-if="success" class="rounded-xl border border-emerald-800 bg-emerald-950/80 p-3 text-sm text-emerald-300">
        {{ success }}
      </p>

      <!-- Current password -->
      <div>
        <label class="block text-sm font-medium text-slate-300">{{ $t('superadmin.profile.currentPassword') }}</label>
        <div class="mt-1 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition">
          <input
            v-model="form.currentPassword"
            :type="showCurrent ? 'text' : 'password'"
            required
            autocomplete="current-password"
            class="flex-1 bg-transparent text-sm text-slate-100 focus:outline-none"
          >
          <button
            type="button"
            class="text-slate-500 hover:text-slate-300 transition"
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
        <label class="block text-sm font-medium text-slate-300">{{ $t('superadmin.profile.newPassword') }}</label>
        <div class="mt-1 flex items-center gap-2 rounded-xl border bg-slate-950 px-3 py-2 focus-within:ring-1 transition" :class="form.newPassword && !meetsMinLength ? 'border-danger-700 focus-within:border-danger-500 focus-within:ring-danger-500' : 'border-slate-700 focus-within:border-indigo-500 focus-within:ring-indigo-500'">
          <input
            v-model="form.newPassword"
            :type="showNew ? 'text' : 'password'"
            required
            minlength="12"
            autocomplete="new-password"
            class="flex-1 bg-transparent text-sm text-slate-100 focus:outline-none"
          >
          <button
            type="button"
            class="text-slate-500 hover:text-slate-300 transition"
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
        <p class="mt-1 text-xs" :class="form.newPassword && !meetsMinLength ? 'text-danger-400' : 'text-slate-500'">
          {{ $t('superadmin.profile.minChars') }} <span v-if="form.newPassword">{{ form.newPassword.length }}/12</span>
        </p>
      </div>

      <!-- Confirm new password -->
      <div>
        <label class="block text-sm font-medium text-slate-300">{{ $t('superadmin.profile.confirmPassword') }}</label>
        <div class="mt-1 flex items-center gap-2 rounded-xl border bg-slate-950 px-3 py-2 focus-within:ring-1 transition" :class="form.confirmPassword && !passwordsMatch ? 'border-danger-700 focus-within:border-danger-500 focus-within:ring-danger-500' : 'border-slate-700 focus-within:border-indigo-500 focus-within:ring-indigo-500'">
          <input
            v-model="form.confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            required
            autocomplete="new-password"
            class="flex-1 bg-transparent text-sm text-slate-100 focus:outline-none"
          >
          <button
            type="button"
            class="text-slate-500 hover:text-slate-300 transition"
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
        <p v-if="form.confirmPassword && !passwordsMatch" class="mt-1 text-xs text-danger-400">{{ $t('superadmin.profile.passwordsDontMatch') }}</p>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
        <button
          type="submit"
          class="rounded-xl bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition"
          :disabled="saving || !canSubmit"
        >
          {{ saving ? $t('superadmin.profile.updating') : $t('superadmin.profile.updatePassword') }}
        </button>
      </div>
    </form>

    <!-- Session -->
    <section class="mt-4 max-w-2xl rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6">
      <header class="flex items-start gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 ring-1 ring-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-slate-400" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <div>
          <h2 class="text-base font-semibold text-slate-100">{{ $t('superadmin.profile.sessionTitle') }}</h2>
          <p class="text-xs text-slate-500 mt-0.5">{{ $t('superadmin.profile.sessionSubtitle') }}</p>
        </div>
      </header>
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-xl border border-danger-800 bg-danger-950/60 px-4 py-2 text-sm font-medium text-danger-300 hover:bg-danger-950 transition"
          @click="onLogout"
        >
          {{ $t('superadmin.profile.logout') }}
        </button>
      </div>
    </section>
  </div>
</template>
