<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { CustomerSummary } from '~/types/customer'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const tenantId = route.params.id as string
const customersApi = useCustomers(tenantId)

const rows = ref<CustomerSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const query = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(
    (r) =>
      r.customerPhone.toLowerCase().includes(q) ||
      (r.customerName ?? '').toLowerCase().includes(q),
  )
})

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    rows.value = await customersApi.list()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

await load()
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${tenantId}`" class="text-sm text-slate-400 hover:text-slate-200">
      ← Back to company
    </NuxtLink>

    <header class="mt-2 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-100">Customers</h1>
        <p class="text-sm text-slate-400 mt-1">
          Personas que han escrito a algún bot de esta empresa.
        </p>
      </div>
      <div class="relative">
        <input
          v-model="query"
          type="search"
          placeholder="Buscar por nombre o teléfono"
          class="w-64 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
        >
      </div>
    </header>

    <p v-if="error" class="mt-4 rounded-md border border-danger-800 bg-danger-950 p-3 text-sm text-danger-300">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <div
      v-else-if="filtered.length === 0"
      class="mt-6 rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-10 text-center text-slate-400"
    >
      {{ query ? 'No hay coincidencias para tu búsqueda.' : 'Esta empresa aún no tiene clientes con conversaciones.' }}
    </div>

    <div
      v-else
      class="mt-6 overflow-x-auto rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg"
    >
      <table class="w-full text-sm">
        <thead class="bg-slate-950 text-slate-400">
          <tr>
            <th class="text-left font-medium px-4 py-3">Cliente</th>
            <th class="text-left font-medium px-4 py-3">Teléfono</th>
            <th class="text-left font-medium px-4 py-3">Conversaciones</th>
            <th class="text-left font-medium px-4 py-3">Abiertas</th>
            <th class="text-left font-medium px-4 py-3">Último mensaje</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in filtered"
            :key="r.customerPhone"
            class="border-t border-slate-800 cursor-pointer hover:bg-slate-800/40"
            @click="navigateTo(`/superadmin/companies/${tenantId}/customers/${encodeURIComponent(r.customerPhone)}`)"
          >
            <td class="px-4 py-3 text-slate-100">{{ r.customerName || '—' }}</td>
            <td class="px-4 py-3 text-slate-300 font-mono text-xs">{{ r.customerPhone }}</td>
            <td class="px-4 py-3 text-slate-300">{{ r.conversationCount }}</td>
            <td class="px-4 py-3 text-slate-300">{{ r.openConversationCount }}</td>
            <td class="px-4 py-3 text-slate-400 text-xs">{{ new Date(r.lastMessageAt).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
