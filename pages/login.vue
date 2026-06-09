<script setup lang="ts">
import type { ApiError } from '~/types/api'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { login } = useAuth()

// If the user is already authenticated, bounce them straight into /admin.
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
  if (typeof r === 'string' && r.startsWith('/')) {
    return r
  }
  return '/admin'
}

async function onSubmit(): Promise<void> {
  if (!email.value || !password.value) {
    error.value = 'Email and password are required.'
    return
  }
  error.value = null
  loading.value = true
  try {
    await login(email.value, password.value)
    await router.replace(redirectTarget())
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Could not sign in.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <!-- Glass card -->
    <div
      class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/50 via-white/30 to-white/15 backdrop-blur-3xl backdrop-saturate-150 ring-1 ring-white/40 shadow-glass-lg p-8 sm:p-10"
      style="box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.6), inset 0 -1px 0 0 rgba(255,255,255,0.15), 0 30px 60px -25px rgba(15,23,42,0.25), 0 10px 20px -10px rgba(15,23,42,0.1);"
    >
      <!-- Top edge specular highlight -->
      <div class="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" aria-hidden="true" />
      <!-- Soft inner glow blob (top-left) -->
      <div class="pointer-events-none absolute -top-20 -left-16 size-56 rounded-full bg-white/40 blur-3xl" aria-hidden="true" />
      <!-- Soft inner glow blob (bottom-right, tinted) -->
      <div class="pointer-events-none absolute -bottom-24 -right-16 size-60 rounded-full bg-sky-200/40 blur-3xl" aria-hidden="true" />

      <div class="relative z-10">
      <h1 class="text-2xl font-semibold text-slate-900 text-center tracking-tight">Sign in with email</h1>
      <p class="mt-2 text-sm text-slate-500 text-center max-w-xs mx-auto">
        Manage your bots, conversations, and customers in one place.
      </p>

      <form class="mt-8 space-y-3" @submit.prevent="onSubmit">
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
            placeholder="Email"
            class="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          >
        </label>

        <label class="flex items-center gap-3 rounded-2xl bg-white/80 ring-1 ring-slate-200/80 px-4 py-3 focus-within:ring-2 focus-within:ring-slate-900 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-slate-400" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="current-password"
            placeholder="Password"
            class="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          >
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-md"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
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

        <p v-if="error" class="rounded-2xl bg-danger-50/80 border border-danger-200/80 px-4 py-2.5 text-sm text-danger-700">
          {{ error }}
        </p>

        <button
          type="submit"
          class="w-full mt-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-glass"
          :disabled="loading"
        >
          {{ loading ? 'Signing in…' : 'Get Started' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-500">
        Don't have an account?
        <NuxtLink to="/register" class="text-slate-900 hover:underline font-medium">
          Register a company
        </NuxtLink>
      </p>
      </div>
    </div>
  </div>
</template>
