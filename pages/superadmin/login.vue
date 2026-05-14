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
    error.value = 'Email y contraseña son obligatorios.'
    return
  }
  error.value = null
  loading.value = true
  try {
    await superadminLogin(email.value, password.value)
    await router.replace(redirectTarget())
  } catch (err) {
    error.value = (err as ApiError).message || 'No se pudo iniciar sesión.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
    <div class="text-xs uppercase tracking-wider text-slate-500">Super Admin</div>
    <h1 class="mt-1 text-xl font-semibold text-slate-900">Iniciar sesión</h1>
    <p class="mt-1 text-sm text-slate-500">Administración global de la plataforma</p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label for="su-email" class="block text-sm font-medium text-slate-700">Email</label>
        <input
          id="su-email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
      </div>

      <div>
        <label for="su-password" class="block text-sm font-medium text-slate-700">Contraseña</label>
        <input
          id="su-password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
      </div>

      <p v-if="error" class="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
        {{ error }}
      </p>

      <button
        type="submit"
        class="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? 'Ingresando…' : 'Ingresar' }}
      </button>
    </form>

    <p class="mt-6 text-center text-xs text-slate-500">
      Para crear el primer super-admin, ejecuta en el backend:<br>
      <code class="font-mono text-[10px]">PLATFORM_ADMIN_EMAIL=… PLATFORM_ADMIN_PASSWORD=… npm run seed:platform-admin</code>
    </p>

    <p class="mt-3 text-center text-sm">
      <NuxtLink to="/login" class="text-brand-600 hover:text-brand-700">
        ← Login tenant
      </NuxtLink>
    </p>
  </div>
</template>
