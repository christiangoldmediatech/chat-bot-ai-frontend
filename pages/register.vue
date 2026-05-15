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
    <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white shadow-glass ring-1 ring-slate-900/5">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-6 text-slate-900" aria-hidden="true">
        <path d="M21 13.255A23.93 23.93 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m13 4H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2z" />
      </svg>
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
          <div class="mt-1 rounded-2xl bg-white/80 ring-1 ring-slate-200/80 px-4 py-3 focus-within:ring-2 focus-within:ring-slate-900 transition">
            <input
              v-model="password"
              type="password"
              required
              minlength="12"
              autocomplete="new-password"
              class="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            >
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
