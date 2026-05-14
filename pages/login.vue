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
    error.value = 'Email y contraseña son obligatorios.'
    return
  }
  error.value = null
  loading.value = true
  try {
    await login(email.value, password.value)
    await router.replace(redirectTarget())
  } catch (err) {
    const apiError = err as ApiError
    error.value = apiError.message || 'No se pudo iniciar sesión.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
    <h1 class="text-xl font-semibold text-slate-900">Iniciar sesión</h1>
    <p class="mt-1 text-sm text-slate-500">Panel administrador</p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label for="email" class="block text-sm font-medium text-slate-700">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-slate-700">Contraseña</label>
        <input
          id="password"
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
        class="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? 'Ingresando…' : 'Ingresar' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500">
      ¿No tienes cuenta?
      <NuxtLink to="/register" class="text-brand-600 hover:text-brand-700 font-medium">
        Registrar empresa
      </NuxtLink>
    </p>
  </div>
</template>
