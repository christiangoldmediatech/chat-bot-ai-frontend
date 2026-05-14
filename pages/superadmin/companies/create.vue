<script setup lang="ts">
import type { ApiError } from '~/types/api'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const companiesApi = useCompanies()
const router = useRouter()

const name = ref('')
const slug = ref('')
const slugTouched = ref(false)
const ownerEmail = ref('')
const ownerPassword = ref('')
const error = ref<string | null>(null)
const saving = ref(false)

watch(name, (value) => {
  if (slugTouched.value) return
  slug.value = value
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
  if (ownerPassword.value.length < 12) {
    error.value = 'La contraseña del OWNER debe tener al menos 12 caracteres.'
    return
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.value)) {
    error.value = 'El slug debe ser kebab-case (minúsculas, números y guiones).'
    return
  }
  error.value = null
  saving.value = true
  try {
    const created = await companiesApi.create({
      name: name.value,
      slug: slug.value,
      ownerEmail: ownerEmail.value,
      ownerPassword: ownerPassword.value,
    })
    await router.replace(`/superadmin/companies/${created.id}`)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <NuxtLink to="/superadmin/companies" class="text-sm text-slate-400 hover:text-slate-200">← Volver a empresas</NuxtLink>
    <h1 class="mt-2 text-2xl font-semibold text-slate-100">Crear empresa</h1>
    <p class="text-slate-400 text-sm mt-1">
      Se crea el tenant y un usuario OWNER inicial. El OWNER recibe credenciales en texto plano — entrégalas por un canal seguro.
    </p>

    <form class="mt-6 max-w-xl space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="block text-sm font-medium text-slate-300">Nombre</label>
        <input
          v-model="name"
          type="text"
          required
          minlength="2"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-300">Slug</label>
        <input
          v-model="slug"
          type="text"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
          @input="onSlugInput"
        >
        <p class="mt-1 text-xs text-slate-500">Identificador único, kebab-case.</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-300">Email del OWNER</label>
        <input
          v-model="ownerEmail"
          type="email"
          required
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-300">Contraseña del OWNER</label>
        <input
          v-model="ownerPassword"
          type="password"
          required
          minlength="12"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
        <p class="mt-1 text-xs text-slate-500">Mínimo 12 caracteres.</p>
      </div>

      <p v-if="error" class="rounded-md border border-red-800 bg-red-950 p-3 text-sm text-red-300">
        {{ error }}
      </p>

      <div class="pt-2">
        <button
          type="submit"
          class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? 'Creando…' : 'Crear empresa' }}
        </button>
      </div>
    </form>
  </div>
</template>
