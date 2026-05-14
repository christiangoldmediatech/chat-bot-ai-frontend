<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { CompanyDetail, Plan, TenantStatus } from '~/types/company'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const router = useRouter()
const companiesApi = useCompanies()
const id = route.params.id as string

const data = ref<CompanyDetail | null>(null)
const name = ref('')
const plan = ref<Plan>('FREE')
const status = ref<TenantStatus>('ACTIVE')
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const planOptions: Plan[] = ['FREE', 'PRO', 'ENTERPRISE']
const statusOptions: TenantStatus[] = ['ACTIVE', 'SUSPENDED']

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await companiesApi.get(id)
    name.value = data.value.name
    plan.value = data.value.plan
    status.value = data.value.status
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onSubmit(): Promise<void> {
  saving.value = true
  error.value = null
  success.value = null
  try {
    await companiesApi.update(id, {
      name: name.value,
      plan: plan.value,
      status: status.value,
    })
    success.value = 'Cambios guardados'
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

async function onCancel(): Promise<void> {
  await router.replace(`/superadmin/companies/${id}`)
}

await load()
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${id}`" class="text-sm text-slate-400 hover:text-slate-200">← Volver al detalle</NuxtLink>
    <h1 class="mt-2 text-2xl font-semibold text-slate-100">Editar empresa</h1>

    <p v-if="error" class="mt-4 rounded-md border border-red-800 bg-red-950 p-3 text-sm text-red-300">
      {{ error }}
    </p>
    <p v-if="success" class="mt-4 rounded-md border border-emerald-800 bg-emerald-950 p-3 text-sm text-emerald-300">
      {{ success }}
    </p>

    <div v-if="loading" class="mt-6 text-sm text-slate-400">Cargando…</div>

    <form v-else-if="data" class="mt-6 max-w-xl space-y-4" @submit.prevent="onSubmit">
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
        <div class="mt-1 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-400 font-mono">
          {{ data.slug }}
        </div>
        <p class="mt-1 text-xs text-slate-500">El slug no se puede cambiar.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-300">Plan</label>
          <select
            v-model="plan"
            class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option v-for="p in planOptions" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-300">Estado</label>
          <select
            v-model="status"
            class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
          </select>
          <p class="mt-1 text-xs text-slate-500">SUSPENDED bloquea login para todos los usuarios del tenant.</p>
        </div>
      </div>

      <div class="pt-2 flex gap-2">
        <button
          type="submit"
          class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </button>
        <button
          type="button"
          class="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          @click="onCancel"
        >
          Cancelar
        </button>
      </div>
    </form>
  </div>
</template>
