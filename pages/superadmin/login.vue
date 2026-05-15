<script setup lang="ts">
import type { ApiError } from '~/types/api'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const auth = useSuperadminAuthStore()
const { superadminLogin } = useAuth()

if (auth.isAuthenticated) {
  await navigateTo(redirectTarget())
}

const email = ref('')
const password = ref('')
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
    error.value = 'Email and password are required.'
    return
  }
  error.value = null
  loading.value = true
  try {
    await superadminLogin(email.value, password.value)
    await router.replace(redirectTarget())
  } catch (err) {
    error.value = (err as ApiError).message || 'Could not sign in.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-900 shadow-glass ring-1 ring-slate-900/10">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-6 text-white" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>

    <div class="mt-5 rounded-3xl bg-white/70 backdrop-blur-2xl ring-1 ring-white/60 shadow-glass-lg p-8 sm:p-10">
      <div class="text-center">
        <div class="text-xs uppercase tracking-wider text-slate-500">Super Admin</div>
        <h1 class="mt-1 text-2xl font-semibold text-slate-900 tracking-tight">Sign in</h1>
        <p class="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
          Global platform administration.
        </p>
      </div>

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
            type="password"
            required
            autocomplete="current-password"
            placeholder="Password"
            class="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          >
        </label>

        <p v-if="error" class="rounded-2xl bg-danger-50/80 border border-danger-200/80 px-4 py-2.5 text-sm text-danger-700">
          {{ error }}
        </p>

        <button
          type="submit"
          class="w-full mt-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-glass"
          :disabled="loading"
        >
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="mt-6 text-center text-xs text-slate-500">
        To create the first super-admin, run in the backend:<br>
        <code class="font-mono text-[10px]">PLATFORM_ADMIN_EMAIL=… PLATFORM_ADMIN_PASSWORD=… npm run seed:platform-admin</code>
      </p>

      <p class="mt-3 text-center text-sm">
        <NuxtLink to="/login" class="text-slate-900 hover:underline">
          ← Tenant login
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
