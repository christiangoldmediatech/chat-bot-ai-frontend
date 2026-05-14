<script setup lang="ts">
import type { ApiError, Paginated } from '~/types/api'
import type { Bot } from '~/types/bot'
import type {
  Conversation,
  ConversationStatus,
  FindConversationsQuery,
} from '~/types/conversation'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const conversationsApi = useConversations()
const botsApi = useBots()

const filters = reactive<FindConversationsQuery>({
  botId: undefined,
  status: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  customerPhone: undefined,
  q: undefined,
  page: 1,
  limit: 20,
})

const data = ref<Paginated<Conversation> | null>(null)
const bots = ref<Bot[]>([])
const botMap = computed<Map<string, Bot>>(() => new Map(bots.value.map((b) => [b.id, b])))
const loading = ref(true)
const error = ref<string | null>(null)

const totalPages = computed(() =>
  data.value ? Math.max(1, Math.ceil(data.value.total / data.value.limit)) : 1,
)

// Send an empty value as `undefined` so it doesn't show up in the query string
// as `key=` — the backend's class-validator config would reject those.
function clean<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && v !== '') {
      out[k as keyof T] = v as T[keyof T]
    }
  }
  return out
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await conversationsApi.list(clean(filters) as FindConversationsQuery)
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

function onApplyFilters(): void {
  filters.page = 1
  void load()
}

function onResetFilters(): void {
  filters.botId = undefined
  filters.status = undefined
  filters.dateFrom = undefined
  filters.dateTo = undefined
  filters.customerPhone = undefined
  filters.q = undefined
  filters.page = 1
  void load()
}

function onPage(delta: number): void {
  const next = (filters.page ?? 1) + delta
  if (next < 1 || next > totalPages.value) return
  filters.page = next
  void load()
}

await Promise.all([loadBots(), load()])

const statusOptions: ConversationStatus[] = ['BOT', 'HUMAN', 'CLOSED']

function statusClass(s: ConversationStatus): string {
  return {
    BOT: 'bg-blue-50 text-blue-700 border-blue-200',
    HUMAN: 'bg-amber-50 text-amber-700 border-amber-200',
    CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  }[s]
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString()
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold">Conversaciones</h1>

    <!-- Filtros -->
    <form
      class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 rounded-xl border border-slate-200 bg-white p-4"
      @submit.prevent="onApplyFilters"
    >
      <div class="lg:col-span-2">
        <label class="block text-xs font-medium text-slate-600">Buscar</label>
        <input
          v-model="filters.q"
          type="text"
          placeholder="Nombre o teléfono"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-600">Bot</label>
        <select
          v-model="filters.botId"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option :value="undefined">Todos</option>
          <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-600">Estado</label>
        <select
          v-model="filters.status"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option :value="undefined">Todos</option>
          <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-600">Desde</label>
        <input
          v-model="filters.dateFrom"
          type="date"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-600">Hasta</label>
        <input
          v-model="filters.dateTo"
          type="date"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
      </div>

      <div class="lg:col-span-6 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          @click="onResetFilters"
        >
          Limpiar
        </button>
        <button
          type="submit"
          class="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Aplicar
        </button>
      </div>
    </form>

    <p v-if="error" class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </p>

    <div v-if="loading" class="mt-6 text-sm text-slate-500">Cargando…</div>

    <template v-else-if="data">
      <EmptyState
        v-if="data.items.length === 0"
        title="Sin conversaciones"
        description="Ajusta los filtros o espera a que un cliente escriba."
        class="mt-6"
      />

      <div v-else class="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left font-medium px-4 py-3">Cliente</th>
              <th class="text-left font-medium px-4 py-3">Bot</th>
              <th class="text-left font-medium px-4 py-3">Estado</th>
              <th class="text-left font-medium px-4 py-3">Último mensaje</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in data.items"
              :key="c.id"
              class="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
              @click="navigateTo(`/admin/conversations/${c.id}`)"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-slate-900">{{ c.customerName || c.customerPhone }}</div>
                <div class="text-xs text-slate-500 font-mono">{{ c.customerPhone }}</div>
              </td>
              <td class="px-4 py-3 text-slate-700">{{ botMap.get(c.botId)?.name ?? '—' }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
                  :class="statusClass(c.status)"
                >
                  {{ c.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-600 text-xs">{{ formatDate(c.lastMessageAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex items-center justify-between text-sm text-slate-600">
        <div>
          {{ data.total }} conversaciones — página {{ data.page }} / {{ totalPages }}
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            :disabled="(filters.page ?? 1) <= 1"
            @click="onPage(-1)"
          >
            Anterior
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            :disabled="(filters.page ?? 1) >= totalPages"
            @click="onPage(1)"
          >
            Siguiente
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
