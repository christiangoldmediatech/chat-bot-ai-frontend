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
    error.value = 'La contraseña debe tener al menos 12 caracteres.'
    return
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug.value)) {
    error.value = 'El slug debe ser kebab-case (minúsculas, números y guiones).'
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
    error.value = apiError.message || 'No se pudo crear la empresa.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
    <h1 class="text-xl font-semibold text-slate-900">Registrar empresa</h1>
    <p class="mt-1 text-sm text-slate-500">
      Se crea una empresa y un usuario OWNER para administrarla.
    </p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label for="tenantName" class="block text-sm font-medium text-slate-700">Nombre de la empresa</label>
        <input
          id="tenantName"
          v-model="tenantName"
          type="text"
          required
          minlength="2"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
      </div>

      <div>
        <label for="tenantSlug" class="block text-sm font-medium text-slate-700">Slug</label>
        <input
          id="tenantSlug"
          v-model="tenantSlug"
          type="text"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          @input="onSlugInput"
        >
        <p class="mt-1 text-xs text-slate-500">Identificador único, kebab-case.</p>
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-slate-700">Email del OWNER</label>
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
          minlength="12"
          autocomplete="new-password"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
        <p class="mt-1 text-xs text-slate-500">Mínimo 12 caracteres.</p>
      </div>

      <p v-if="error" class="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
        {{ error }}
      </p>

      <button
        type="submit"
        class="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? 'Creando…' : 'Crear empresa' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500">
      ¿Ya tienes cuenta?
      <NuxtLink to="/login" class="text-brand-600 hover:text-brand-700 font-medium">
        Iniciar sesión
      </NuxtLink>
    </p>
  </div>
</template>
