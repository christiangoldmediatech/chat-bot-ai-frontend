<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { CustomerSummary } from '~/types/customer'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const customersApi = useCustomers()
const botsApi = useBots()

const items = ref<CustomerSummary[]>([])
const bots = ref<Bot[]>([])
const filterBotId = ref<string | undefined>(undefined)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    items.value = await customersApi.list(filterBotId.value)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function loadBots(): Promise<void> {
  try {
    bots.value = await botsApi.list()
  } catch {
    bots.value = []
  }
}

function onFilterChange(): void {
  void load()
}

await Promise.all([loadBots(), load()])
</script>

<template>
  <div>
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-semibold">Clientes</h1>

      <div>
        <label class="text-xs text-slate-500 mr-2">Filtrar por bot</label>
        <select
          v-model="filterBotId"
          class="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          @change="onFilterChange"
        >
          <option :value="undefined">Todos</option>
          <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </div>
    </div>

    <p v-if="error" class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </p>

    <div v-if="loading" class="mt-6 text-sm text-slate-500">Cargando…</div>

    <EmptyState
      v-else-if="items.length === 0"
      title="Aún no hay clientes"
      description="Los clientes aparecen cuando alguien escribe a uno de tus bots."
      class="mt-6"
    />

    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-600">
          <tr>
            <th class="text-left font-medium px-4 py-3">Cliente</th>
            <th class="text-left font-medium px-4 py-3">Teléfono</th>
            <th class="text-right font-medium px-4 py-3">Conversaciones</th>
            <th class="text-right font-medium px-4 py-3">Abiertas</th>
            <th class="text-left font-medium px-4 py-3">Último mensaje</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in items"
            :key="c.customerPhone"
            class="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
            @click="navigateTo(`/admin/customers/${encodeURIComponent(c.customerPhone)}`)"
          >
            <td class="px-4 py-3 text-slate-900 font-medium">{{ c.customerName || '—' }}</td>
            <td class="px-4 py-3 text-slate-600 font-mono text-xs">{{ c.customerPhone }}</td>
            <td class="px-4 py-3 text-right">{{ c.conversationCount }}</td>
            <td class="px-4 py-3 text-right">{{ c.openConversationCount }}</td>
            <td class="px-4 py-3 text-slate-600 text-xs">{{ new Date(c.lastMessageAt).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
