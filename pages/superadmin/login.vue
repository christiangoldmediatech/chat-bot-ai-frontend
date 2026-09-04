<script setup lang="ts">
import type { ApiError } from '~/types/api'

definePageMeta({
  layout: 'superadmin-auth',
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useSuperadminAuthStore()
const { superadminLogin } = useAuth()

if (auth.isAuthenticated) {
  await navigateTo(redirectTarget())
}

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref<string | null>(null)
const loading = ref(false)

function redirectTarget(): string {
  const r = route.query.redirect
  if (typeof r === 'string' && r.startsWith('/superadmin')) {
    return r
  }
  return '/superadmin'
}

async function onSubmit(): Promise<void> {
  if (!email.value || !password.value) {
    error.value = t('superadmin.login.errorRequired')
    return
  }
  error.value = null
  loading.value = true
  try {
    await superadminLogin(email.value, password.value)
    await router.replace(redirectTarget())
  } catch (err) {
    error.value = (err as ApiError).message || t('superadmin.login.errorGeneric')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-halo-glow ring-1 ring-halo-line">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-6 text-ink-tealDeep" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>

    <div class="mt-5 rounded-3xl bg-ink-card/60 backdrop-blur-2xl ring-1 ring-halo-line shadow-glass-lg p-8 sm:p-10">
      <div class="text-center">
        <div class="text-xs uppercase tracking-wider text-halo-dim">{{ $t('superadmin.login.kicker') }}</div>
        <h1 class="mt-1 text-2xl font-semibold text-pearl tracking-tight">{{ $t('superadmin.login.title') }}</h1>
        <p class="mt-2 text-sm text-mist max-w-xs mx-auto">
          {{ $t('superadmin.login.subtitle') }}
        </p>
      </div>

      <form class="mt-8 space-y-3" @submit.prevent="onSubmit">
        <label class="flex items-center gap-3 rounded-2xl bg-ink-surface/60 ring-1 ring-halo-line px-4 py-3 focus-within:ring-2 focus-within:ring-halo transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-mist-dim" aria-hidden="true">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            :placeholder="$t('superadmin.login.emailPlaceholder')"
            class="flex-1 bg-transparent text-sm text-pearl placeholder:text-mist-dim focus:outline-none"
          >
        </label>

        <label class="flex items-center gap-3 rounded-2xl bg-ink-surface/60 ring-1 ring-halo-line px-4 py-3 focus-within:ring-2 focus-within:ring-halo transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-mist-dim" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="current-password"
            :placeholder="$t('superadmin.login.passwordPlaceholder')"
            class="flex-1 bg-transparent text-sm text-pearl placeholder:text-mist-dim focus:outline-none"
          >
          <button
            type="button"
            class="text-mist-dim hover:text-pearl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-halo rounded-md"
            :aria-label="showPassword ? $t('auth.login.hidePassword') : $t('auth.login.showPassword')"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
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
        </label>

        <p v-if="error" class="rounded-2xl bg-danger-500/15 border border-danger-400/40 px-4 py-2.5 text-sm text-danger-200">
          {{ error }}
        </p>

        <button
          type="submit"
          class="w-full mt-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-medium text-ink-tealDeep hover:-translate-y-0.5 disabled:opacity-60 transition-all shadow-halo-glow"
          :disabled="loading"
        >
          {{ loading ? $t('superadmin.login.submitting') : $t('superadmin.login.submit') }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm">
        <NuxtLink to="/login" class="text-halo hover:underline">
          {{ $t('superadmin.login.tenantLoginLink') }}
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
