<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type {
  BlockStatus,
  BlockedConversationListResponse,
  ListBlockedQuery,
} from '~/types/security'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const tenantId = route.params.id as string
const securityApi = useConversationSecurity(tenantId)
const botsApi = useBots(tenantId)

const filters = reactive<ListBlockedQuery>({
  botId: undefined,
  securityStatus: undefined,
  page: 1,
  pageSize: 20,
})

const data = ref<BlockedConversationListResponse | null>(null)
const bots = ref<Bot[]>([])
const botMap = computed<Map<string, Bot>>(() => new Map(bots.value.map((b) => [b.id, b])))
const loading = ref(true)
const errorMsg = ref<string | null>(null)

const totalPages = computed(() =>
  data.value ? Math.max(1, Math.ceil(data.value.total / data.value.pageSize)) : 1,
)

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
  errorMsg.value = null
  try {
    data.value = await securityApi.listBlocked(clean(filters) as ListBlockedQuery)
  } catch (err) {
    errorMsg.value = (err as ApiError).message
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

function onPage(delta: number): void {
  const next = (filters.page ?? 1) + delta
  if (next < 1 || next > totalPages.value) return
  filters.page = next
  void load()
}

function onApply(): void {
  filters.page = 1
  void load()
}

await Promise.all([loadBots(), load()])

function badgeClass(s: BlockStatus): string {
  return {
    NONE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    AUTO_BLOCKED: 'bg-amber-50 text-amber-800 ring-amber-200',
    MANUAL_BLOCKED: 'bg-danger-50 text-danger-700 ring-danger-200',
    MANUAL_UNBLOCKED: 'bg-sky-50 text-sky-700 ring-sky-200',
  }[s]
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleString()
}
</script>

<template>
  <div>
    <NuxtLink
      :to="`/superadmin/companies/${tenantId}/conversations`"
      class="text-sm text-slate-500 hover:text-slate-700"
    >
      {{ $t('conversations.security.blockedList.back') }}
    </NuxtLink>

    <div class="mt-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {{ $t('conversations.security.blockedList.kicker') }}
      </p>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        {{ $t('conversations.security.blockedList.title') }}
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        {{ $t('conversations.security.blockedList.subtitle') }}
      </p>
    </div>

    <form
      class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-4"
      @submit.prevent="onApply"
    >
      <div>
        <label class="block text-xs font-medium text-slate-600">{{ $t('conversations.filter.bot') }}</label>
        <select
          v-model="filters.botId"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
        >
          <option :value="undefined">{{ $t('conversations.filter.all') }}</option>
          <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium text-slate-600">
          {{ $t('conversations.security.blockedList.filter.status') }}
        </label>
        <select
          v-model="filters.securityStatus"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
        >
          <option :value="undefined">{{ $t('conversations.security.blockedList.filter.all') }}</option>
          <option value="AUTO_BLOCKED">{{ $t('conversations.security.blockedList.filter.auto') }}</option>
          <option value="MANUAL_BLOCKED">{{ $t('conversations.security.blockedList.filter.manual') }}</option>
        </select>
      </div>

      <div class="flex items-end">
        <button
          type="submit"
          class="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {{ $t('conversations.filter.apply') }}
        </button>
      </div>
    </form>

    <p v-if="errorMsg" class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
      {{ errorMsg }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <template v-else-if="data">
      <EmptyState
        v-if="data.items.length === 0"
        :title="$t('conversations.security.blockedList.empty')"
        class="mt-6"
      />

      <div v-else class="mt-6 overflow-x-auto rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left font-medium px-4 py-3">{{ $t('conversations.security.blockedList.table.customer') }}</th>
              <th class="text-left font-medium px-4 py-3">{{ $t('conversations.security.blockedList.table.bot') }}</th>
              <th class="text-left font-medium px-4 py-3">{{ $t('conversations.security.blockedList.table.state') }}</th>
              <th class="text-left font-medium px-4 py-3">{{ $t('conversations.security.blockedList.table.score') }}</th>
              <th class="text-left font-medium px-4 py-3">{{ $t('conversations.security.blockedList.table.blockedAt') }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in data.items"
              :key="c.conversationId"
              class="border-t border-slate-100 hover:bg-slate-50"
            >
              <td class="px-4 py-3">
                <div class="font-mono text-xs text-slate-700">{{ c.customerPhone }}</div>
              </td>
              <td class="px-4 py-3 text-slate-700">
                {{ c.botId ? (botMap.get(c.botId)?.name ?? '—') : '—' }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                  :class="badgeClass(c.blockStatus)"
                >
                  {{ $t(`conversations.security.badge.${c.blockStatus}`) }}
                </span>
              </td>
              <td class="px-4 py-3 font-mono text-slate-900">{{ c.suspiciousScore }}</td>
              <td class="px-4 py-3 text-slate-600 text-xs">
                {{ formatDate(c.blockedAt ?? c.blockedUntil) }}
              </td>
              <td class="px-4 py-3 text-right">
                <NuxtLink
                  :to="`/superadmin/companies/${tenantId}/conversations/${c.conversationId}`"
                  class="text-xs text-sky-700 hover:text-sky-900"
                >
                  {{ $t('conversations.security.blockedList.openDetail') }}
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex items-center justify-between text-sm text-slate-600">
        <div>
          {{ $t('conversations.pagination.summary', { total: data.total, page: data.page, totalPages }) }}
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            :disabled="(filters.page ?? 1) <= 1"
            @click="onPage(-1)"
          >
            {{ $t('conversations.pagination.previous') }}
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            :disabled="(filters.page ?? 1) >= totalPages"
            @click="onPage(1)"
          >
            {{ $t('conversations.pagination.next') }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
