<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { CompanyDetail } from '~/types/company'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const router = useRouter()
const companiesApi = useCompanies()
const id = route.params.id as string

const data = ref<CompanyDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const confirmingDelete = ref(false)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await companiesApi.get(id)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onConfirmDelete(): Promise<void> {
  try {
    await companiesApi.remove(id)
    await router.replace('/superadmin/companies')
  } catch (err) {
    error.value = (err as ApiError).message
    confirmingDelete.value = false
  }
}

await load()
</script>

<template>
  <div>
    <NuxtLink to="/superadmin/companies" class="text-sm text-slate-400 hover:text-slate-200">← Volver a empresas</NuxtLink>

    <p v-if="error" class="mt-4 rounded-md border border-red-800 bg-red-950 p-3 text-sm text-red-300">
      {{ error }}
    </p>

    <div v-if="loading" class="mt-6 text-sm text-slate-400">Cargando…</div>

    <template v-else-if="data">
      <header class="mt-2 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            {{ data.name }}
            <span
              class="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
              :class="
                data.status === 'ACTIVE'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              "
            >
              {{ data.status }}
            </span>
          </h1>
          <p class="mt-1 text-sm text-slate-500 font-mono">{{ data.slug }}</p>
        </div>

        <div class="flex gap-2">
          <NuxtLink
            :to="`/superadmin/companies/${data.id}/edit`"
            class="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Editar
          </NuxtLink>
          <button
            type="button"
            class="rounded-md border border-red-800 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950"
            @click="confirmingDelete = true"
          >
            Eliminar
          </button>
        </div>
      </header>

      <div class="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div class="text-xs uppercase tracking-wider text-slate-400">Plan</div>
          <div class="mt-2 text-2xl font-semibold">{{ data.plan }}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div class="text-xs uppercase tracking-wider text-slate-400">Usuarios</div>
          <div class="mt-2 text-2xl font-semibold">{{ data.userCount }}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div class="text-xs uppercase tracking-wider text-slate-400">Bots</div>
          <div class="mt-2 text-2xl font-semibold">{{ data.botCount }}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div class="text-xs uppercase tracking-wider text-slate-400">Conversaciones</div>
          <div class="mt-2 text-2xl font-semibold">{{ data.conversationCount }}</div>
        </div>
      </div>

      <section class="mt-8">
        <h2 class="text-base font-semibold text-slate-200">Usuarios</h2>
        <div class="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table class="w-full text-sm">
            <thead class="bg-slate-950 text-slate-400">
              <tr>
                <th class="text-left font-medium px-4 py-3">Email</th>
                <th class="text-left font-medium px-4 py-3">Rol</th>
                <th class="text-left font-medium px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="data.users.length === 0">
                <td colspan="3" class="px-4 py-6 text-center text-slate-500">Sin usuarios</td>
              </tr>
              <tr
                v-for="u in data.users"
                v-else
                :key="u.id"
                class="border-t border-slate-800"
              >
                <td class="px-4 py-3 text-slate-100">{{ u.email }}</td>
                <td class="px-4 py-3 text-slate-300">{{ u.role }}</td>
                <td class="px-4 py-3 text-slate-400 text-xs">{{ new Date(u.createdAt).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="mt-6">
        <h2 class="text-base font-semibold text-slate-200">Bots</h2>
        <div class="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <table class="w-full text-sm">
            <thead class="bg-slate-950 text-slate-400">
              <tr>
                <th class="text-left font-medium px-4 py-3">Nombre</th>
                <th class="text-left font-medium px-4 py-3">Estado</th>
                <th class="text-left font-medium px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="data.bots.length === 0">
                <td colspan="3" class="px-4 py-6 text-center text-slate-500">Sin bots</td>
              </tr>
              <tr
                v-for="b in data.bots"
                v-else
                :key="b.id"
                class="border-t border-slate-800"
              >
                <td class="px-4 py-3 text-slate-100">{{ b.name }}</td>
                <td class="px-4 py-3 text-slate-300">{{ b.isActive ? 'Activo' : 'Inactivo' }}</td>
                <td class="px-4 py-3 text-slate-400 text-xs">{{ new Date(b.createdAt).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        :open="confirmingDelete"
        :title="`Eliminar empresa ${data.name}`"
        message="Se eliminarán también todos sus usuarios, bots, conversaciones y documentos. Esta acción no se puede deshacer."
        @cancel="confirmingDelete = false"
        @confirm="onConfirmDelete"
      />
    </template>
  </div>
</template>
