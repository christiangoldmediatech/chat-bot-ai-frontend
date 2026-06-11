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

const PAGE_SIZE = 50

const items = ref<CustomerSummary[]>([])
const total = ref(0)
const page = ref(1)
const bots = ref<Bot[]>([])
const filterBotId = ref<string | undefined>(undefined)
const search = ref('')
const loading = ref(true)
const error = ref<string | null>(null)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const fromIndex = computed(() => total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1)
const toIndex = computed(() => Math.min(total.value, page.value * PAGE_SIZE))
const isFiltered = computed(() => Boolean(search.value.trim()) || Boolean(filterBotId.value))

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await customersApi.listPaginated({
      botId: filterBotId.value,
      search: search.value.trim() || undefined,
      page: page.value,
      pageSize: PAGE_SIZE,
    })
    items.value = res.items
    total.value = res.total
    // Server may clamp page if user requested past the end — sync local state.
    page.value = res.page
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

// Debounce the search-as-you-type so we don't hammer the backend.
let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    page.value = 1
    void load()
  }, 300)
})

function onBotChange(): void {
  page.value = 1
  void load()
}

function clearFilters(): void {
  search.value = ''
  filterBotId.value = undefined
  page.value = 1
  void load()
}

function goPrev(): void {
  if (page.value <= 1) return
  page.value -= 1
  void load()
}
function goNext(): void {
  if (page.value >= pageCount.value) return
  page.value += 1
  void load()
}

await Promise.all([loadBots(), load()])
</script>

<template>
  <div>
    <!-- Page header — indigo (primary) tone to match the platform palette -->
    <header class="flex items-start gap-4 flex-wrap">
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white ring-1 ring-indigo-300/60 shadow-[0_8px_24px_-10px_rgba(79,70,229,0.45)]"
        aria-hidden="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5">
          <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">{{ $t('customers.title') }}</h1>
        <p class="text-sm text-slate-500 mt-1 max-w-2xl">
          {{ $t('customers.subtitle') }}
        </p>
      </div>

      <!-- Total / matching count chip -->
      <div
        class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-primary-50 via-white to-white ring-1 ring-primary-200/70 px-4 py-2 shadow-[0_6px_18px_-10px_rgba(79,70,229,0.30)]"
      >
        <span class="text-[10px] uppercase tracking-wider font-semibold text-primary-700/80">
          {{ isFiltered ? $t('customers.matchingLabel') : $t('customers.totalLabel') }}
        </span>
        <span class="text-xl font-bold text-primary-900 tabular-nums tracking-tight">{{ total }}</span>
      </div>
    </header>

    <!-- Filters bar — glassmorphic with search + bot filter -->
    <div
      class="mt-6 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-3 flex flex-wrap items-center gap-2"
    >
      <!-- Search -->
      <div class="relative flex-1 min-w-[18rem]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="$t('customers.searchPlaceholder')"
          class="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none transition"
        >
      </div>

      <!-- Bot filter -->
      <select
        v-model="filterBotId"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none transition"
        @change="onBotChange"
      >
        <option :value="undefined">{{ $t('customers.all') }} · {{ $t('customers.filterByBot') }}</option>
        <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>

      <button
        v-if="isFiltered"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
        @click="clearFilters"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        {{ $t('common.cancel') }}
      </button>

      <button
        type="button"
        class="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-white ring-1 ring-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
        :disabled="loading"
        @click="load"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-3.5"
          :class="{ 'animate-spin': loading }"
          aria-hidden="true"
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
          <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
        </svg>
        {{ $t('common.reload') }}
      </button>
    </div>

    <p v-if="search.trim()" class="mt-2 text-xs text-slate-500">
      {{ $t('customers.searchHint') }}
    </p>

    <p v-if="error" class="mt-4 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading && items.length === 0" class="mt-6" />

    <EmptyState
      v-else-if="items.length === 0"
      :title="isFiltered ? $t('customers.emptyFiltered.title') : $t('customers.empty.title')"
      :description="isFiltered ? $t('customers.emptyFiltered.description') : $t('customers.empty.description')"
      class="mt-6"
    />

    <!-- Customers table -->
    <div
      v-else
      class="mt-4 overflow-x-auto rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-[0_8px_28px_-12px_rgba(79,70,229,0.16),0_4px_10px_-6px_rgba(15,23,42,0.08),0_-2px_8px_-4px_rgba(79,70,229,0.05)]"
      :class="{ 'opacity-60 pointer-events-none': loading }"
    >
      <table class="w-full text-sm">
        <thead class="bg-gradient-to-r from-primary-50 via-white to-white text-slate-600">
          <tr>
            <th class="text-left font-semibold uppercase tracking-wider text-[11px] px-4 py-3 text-primary-700/80">{{ $t('customers.table.customer') }}</th>
            <th class="text-left font-semibold uppercase tracking-wider text-[11px] px-4 py-3 text-primary-700/80">{{ $t('customers.table.phone') }}</th>
            <th class="text-right font-semibold uppercase tracking-wider text-[11px] px-4 py-3 text-primary-700/80">{{ $t('customers.table.conversations') }}</th>
            <th class="text-right font-semibold uppercase tracking-wider text-[11px] px-4 py-3 text-primary-700/80">{{ $t('customers.table.open') }}</th>
            <th class="text-left font-semibold uppercase tracking-wider text-[11px] px-4 py-3 text-primary-700/80">{{ $t('customers.table.lastMessage') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in items"
            :key="c.customerPhone"
            class="border-t border-slate-100/80 cursor-pointer hover:bg-primary-50/40 transition"
            @click="navigateTo(`/admin/customers/${encodeURIComponent(c.customerPhone)}`)"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-semibold text-sm ring-1 ring-indigo-300/60 shadow-sm">
                  {{ (c.customerName || c.customerPhone || '?').charAt(0).toUpperCase() }}
                </div>
                <span class="text-slate-900 font-medium truncate">{{ c.customerName || '—' }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-slate-600 font-mono text-xs">{{ c.customerPhone }}</td>
            <td class="px-4 py-3 text-right">
              <span class="inline-flex items-center justify-center min-w-[2rem] rounded-full bg-primary-50 ring-1 ring-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 tabular-nums">
                {{ c.conversationCount }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <span
                class="inline-flex items-center justify-center min-w-[2rem] rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1"
                :class="c.openConversationCount > 0
                  ? 'bg-emerald-50 ring-emerald-100 text-emerald-700'
                  : 'bg-slate-50 ring-slate-200 text-slate-500'"
              >
                {{ c.openConversationCount }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-600 text-xs">{{ new Date(c.lastMessageAt).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination footer — visible when there's more than one page -->
    <div
      v-if="items.length > 0 && pageCount > 1"
      class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass px-4 py-3"
    >
      <p class="text-xs text-slate-600 tabular-nums">
        {{ $t('customers.pagination.summary', { from: fromIndex, to: toIndex, total }) }}
      </p>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-500 tabular-nums">
          {{ $t('customers.pagination.page', { page, total: pageCount }) }}
        </span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-xl bg-white ring-1 ring-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          :disabled="page <= 1 || loading"
          @click="goPrev"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {{ $t('customers.pagination.previous') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-primary-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          :disabled="page >= pageCount || loading"
          @click="goNext"
        >
          {{ $t('customers.pagination.next') }}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
