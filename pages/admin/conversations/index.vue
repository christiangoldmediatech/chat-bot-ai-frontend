<script setup lang="ts">
import type { ApiError, Paginated } from '~/types/api'
import type { Bot } from '~/types/bot'
import type {
  Conversation,
  ConversationStatus,
  FindConversationsQuery,
} from '~/types/conversation'
import type { MessagesActivity, MessagesActivityRange } from '~/types/dashboard'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const conversationsApi = useConversations()
const botsApi = useBots()
const dashboardApi = useDashboard()

// Activity dashboard (day / week / month) shown above the filter panel.
const activity = reactive<Record<MessagesActivityRange, MessagesActivity | null>>({
  day: null,
  week: null,
  month: null,
})
const activityLoading = ref(true)
const activityError = ref<string | null>(null)

async function loadActivity(): Promise<void> {
  activityLoading.value = true
  activityError.value = null
  try {
    const [day, week, month] = await Promise.all([
      dashboardApi.messagesActivity({ range: 'day' }),
      dashboardApi.messagesActivity({ range: 'week' }),
      dashboardApi.messagesActivity({ range: 'month' }),
    ])
    activity.day = day
    activity.week = week
    activity.month = month
  } catch (err) {
    activityError.value = (err as ApiError).message
  } finally {
    activityLoading.value = false
  }
}

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

await Promise.all([loadBots(), load(), loadActivity()])

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
    <div class="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Conversations</h1>
        <p class="text-slate-500 text-sm mt-1">
          Inbound and outbound message volume across all your bots.
        </p>
      </div>
      <button
        type="button"
        class="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
        :disabled="activityLoading"
        @click="loadActivity"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="activityLoading ? 'animate-spin' : ''" aria-hidden="true">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        Reload stats
      </button>
    </div>

    <!-- Activity dashboard: day / week / month, always visible together. -->
    <section class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <MessagesActivityCard
        :data="activity.day!"
        :loading="activityLoading"
        :error="activityError"
        title="Daily"
        subtitle="Last 14 days · grouped by day"
        tone="primary"
      />
      <MessagesActivityCard
        :data="activity.week!"
        :loading="activityLoading"
        :error="activityError"
        title="Weekly"
        subtitle="Last 12 weeks · grouped by week"
        tone="success"
      />
      <MessagesActivityCard
        :data="activity.month!"
        :loading="activityLoading"
        :error="activityError"
        title="Monthly"
        subtitle="Last 12 months · grouped by month"
        tone="amber"
      />
    </section>

    <!-- Filters -->
    <form
      class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-4"
      @submit.prevent="onApplyFilters"
    >
      <div class="lg:col-span-2">
        <label class="block text-xs font-medium text-slate-600">Search</label>
        <input
          v-model="filters.q"
          type="text"
          placeholder="Name or phone"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-600">Bot</label>
        <select
          v-model="filters.botId"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option :value="undefined">All</option>
          <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-600">Status</label>
        <select
          v-model="filters.status"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option :value="undefined">All</option>
          <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-600">From</label>
        <input
          v-model="filters.dateFrom"
          type="date"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-600">To</label>
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
          Clear
        </button>
        <button
          type="submit"
          class="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Apply
        </button>
      </div>
    </form>

    <p v-if="error" class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <template v-else-if="data">
      <EmptyState
        v-if="data.items.length === 0"
        title="No conversations"
        description="Adjust the filters or wait for a customer to message you."
        class="mt-6"
      />

      <div v-else class="mt-6 overflow-x-auto rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left font-medium px-4 py-3">Customer</th>
              <th class="text-left font-medium px-4 py-3">Bot</th>
              <th class="text-left font-medium px-4 py-3">Status</th>
              <th class="text-left font-medium px-4 py-3">Last message</th>
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
          {{ data.total }} conversations — page {{ data.page }} / {{ totalPages }}
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            :disabled="(filters.page ?? 1) <= 1"
            @click="onPage(-1)"
          >
            Previous
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            :disabled="(filters.page ?? 1) >= totalPages"
            @click="onPage(1)"
          >
            Next
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
