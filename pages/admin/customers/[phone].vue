<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { CustomerDetail } from '~/types/customer'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const route = useRoute()
const customersApi = useCustomers()
const botsApi = useBots()

const phone = decodeURIComponent(route.params.phone as string)

const data = ref<CustomerDetail | null>(null)
const bots = ref<Bot[]>([])
const botMap = computed(() => new Map(bots.value.map((b) => [b.id, b])))
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [detail, botList] = await Promise.all([
      customersApi.get(phone),
      botsApi.list().catch(() => [] as Bot[]),
    ])
    data.value = detail
    bots.value = botList
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

await load()

const notification = ref<{ kind: 'success' | 'error'; text: string } | null>(null)
const { t } = useI18n()

function notify(kind: 'success' | 'error', text: string): void {
  notification.value = { kind, text }
  setTimeout(() => {
    notification.value = null
  }, 2500)
}

function onUnblocked(): void {
  notify('success', t('conversations.security.toast.unblocked'))
  void load()
}

function onUnblockError(): void {
  notify('error', t('conversations.security.toast.errorUnblock'))
}

function isConversationBlocked(status: string | null | undefined): boolean {
  return status === 'AUTO_BLOCKED' || status === 'MANUAL_BLOCKED'
}
</script>

<template>
  <div>
    <NuxtLink to="/admin/customers" class="text-sm text-slate-500 hover:text-slate-700">{{ $t('customers.detail.back') }}</NuxtLink>

    <p v-if="error" class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <template v-else-if="data">
      <header class="mt-2">
        <h1 class="text-2xl font-semibold">{{ data.customerName || data.customerPhone }}</h1>
        <p class="mt-1 text-sm text-slate-500 font-mono">{{ data.customerPhone }}</p>
      </header>

      <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard :label="$t('customers.detail.stats.conversations')" :value="data.conversationCount" />
        <StatCard :label="$t('customers.detail.stats.open')" :value="data.openConversationCount" />
        <StatCard :label="$t('customers.detail.stats.lastMessage')" :value="new Date(data.lastMessageAt).toLocaleString()" />
      </div>

      <div class="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CustomerMeetingsCard :phone="phone" />
        <CustomerCasesCard :phone="phone" />
      </div>

      <p
        v-if="notification"
        class="mt-4 rounded-md p-3 text-sm"
        :class="notification.kind === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-danger-200 bg-danger-50 text-danger-700'"
      >
        {{ notification.text }}
      </p>

      <h2 class="mt-8 text-base font-semibold text-slate-900">{{ $t('customers.detail.conversationsTitle') }}</h2>
      <div class="mt-3 overflow-x-auto rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left font-medium px-4 py-3">{{ $t('customers.detail.table.bot') }}</th>
              <th class="text-left font-medium px-4 py-3">{{ $t('customers.detail.table.status') }}</th>
              <th class="text-left font-medium px-4 py-3">{{ $t('conversations.security.blockedList.filter.status') }}</th>
              <th class="text-left font-medium px-4 py-3">{{ $t('customers.detail.table.lastMessage') }}</th>
              <th class="text-left font-medium px-4 py-3">{{ $t('customers.detail.table.created') }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in data.conversations"
              :key="c.id"
              class="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
              @click="navigateTo(`/admin/conversations/${c.id}`)"
            >
              <td class="px-4 py-3 text-slate-700">{{ botMap.get(c.botId)?.name ?? '—' }}</td>
              <td class="px-4 py-3 text-slate-700">{{ c.status }}</td>
              <td class="px-4 py-3">
                <SecurityBadge :status="c.blockStatus" size="xs" />
              </td>
              <td class="px-4 py-3 text-slate-600 text-xs">{{ new Date(c.lastMessageAt).toLocaleString() }}</td>
              <td class="px-4 py-3 text-slate-600 text-xs">{{ new Date(c.createdAt).toLocaleString() }}</td>
              <td class="px-4 py-3 text-right">
                <UnblockButton
                  v-if="isConversationBlocked(c.blockStatus)"
                  :conversation-id="c.id"
                  @unblocked="onUnblocked"
                  @error="onUnblockError"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
