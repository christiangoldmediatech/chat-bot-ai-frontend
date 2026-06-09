<script setup lang="ts">
import type { ApiError } from '~/types/api'

definePageMeta({
  layout: 'default',
})

const router = useRouter()
const auth = useAuthStore()
const { register } = useAuth()

if (auth.isAuthenticated) {
  await navigateTo('/admin')
}

const tenantName = ref('')
const tenantSlug = ref('')
const slugTouched = ref(false)
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref<string | null>(null)
const loading = ref(false)

// Slug auto-suggest: derive a kebab-case slug from the company name until the
// user manually edits the slug field.
watch(tenantName, (value) => {
  if (slugTouched.value) return
  tenantSlug.value = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
})

function onSlugInput(): void {
  slugTouched.value = true
}

async function onSubmit(): Promise<void> {
  if (password.value.length < 12) {
    error.value = 'Password must be at least 12 characters.'
    return
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug.value)) {
    error.value = 'Slug must be kebab-case (lowercase letters, numbers, and hyphens).'
    return
  }
  error.value = null
  loading.value = true
  try {
    await register({
      tenantName: tenantName.value,
      tenantSlug: tenantSlug.value,
      email: email.value,
      password: password.value,
    })
    await router.replace('/admin')
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'Could not create the company.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <div class="flex flex-col items-center">
      <KaibotLogo :size="72" rounded="rounded-3xl" class="bg-white ring-1 ring-white/70 shadow-glass-lg" />
      <p class="mt-3 text-base font-semibold tracking-tight text-slate-900">Kaibot</p>
      <p class="text-xs text-slate-500">WhatsApp AI for businesses</p>
    </div>

    <div class="mt-5 rounded-3xl bg-white/70 backdrop-blur-2xl ring-1 ring-white/60 shadow-glass-lg p-8 sm:p-10">
      <h1 class="text-2xl font-semibold text-slate-900 text-center tracking-tight">Register your company</h1>
      <p class="mt-2 text-sm text-slate-500 text-center max-w-xs mx-auto">
        Creates a tenant and an OWNER user to manage your bots.
      </p>

      <form class="mt-8 space-y-3" @submit.prevent="onSubmit">
        <label class="block">
          <span class="ml-1 text-xs font-medium text-slate-600">Company name</span>
          <div class="mt-1 rounded-2xl bg-white/80 ring-1 ring-slate-200/80 px-4 py-3 focus-within:ring-2 focus-within:ring-slate-900 transition">
            <input
              v-model="tenantName"
              type="text"
              required
              minlength="2"
              class="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            >
          </div>
        </label>

        <label class="block">
          <span class="ml-1 text-xs font-medium text-slate-600">Slug</span>
          <div class="mt-1 rounded-2xl bg-white/80 ring-1 ring-slate-200/80 px-4 py-3 focus-within:ring-2 focus-within:ring-slate-900 transition">
            <input
              v-model="tenantSlug"
              type="text"
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              class="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none font-mono"
              @input="onSlugInput"
            >
          </div>
          <span class="ml-1 mt-1 block text-xs text-slate-500">Unique identifier, kebab-case.</span>
        </label>

        <label class="block">
          <span class="ml-1 text-xs font-medium text-slate-600">OWNER email</span>
          <div class="mt-1 rounded-2xl bg-white/80 ring-1 ring-slate-200/80 px-4 py-3 focus-within:ring-2 focus-within:ring-slate-900 transition">
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            >
          </div>
        </label>

        <label class="block">
          <span class="ml-1 text-xs font-medium text-slate-600">Password</span>
          <div class="mt-1 flex items-center gap-3 rounded-2xl bg-white/80 ring-1 ring-slate-200/80 px-4 py-3 focus-within:ring-2 focus-within:ring-slate-900 transition">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              minlength="12"
              autocomplete="new-password"
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
          </div>
          <span class="ml-1 mt-1 block text-xs text-slate-500">Minimum 12 characters.</span>
        </label>

        <p v-if="error" class="rounded-2xl bg-danger-50/80 border border-danger-200/80 px-4 py-2.5 text-sm text-danger-700">
          {{ error }}
        </p>

        <button
          type="submit"
          class="w-full mt-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-glass"
          :disabled="loading"
        >
          {{ loading ? 'Creating…' : 'Create company' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-500">
        Already have an account?
        <NuxtLink to="/login" class="text-slate-900 hover:underline font-medium">
          Sign in
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
