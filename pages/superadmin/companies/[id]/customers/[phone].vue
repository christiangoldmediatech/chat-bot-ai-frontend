<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { CustomerDetail } from '~/types/customer'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const tenantId = route.params.id as string
const phone = decodeURIComponent(route.params.phone as string)
const customersApi = useCustomers(tenantId)
const botsApi = useBots(tenantId)

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
</script>

<template>
  <div>
    <NuxtLink
      :to="`/superadmin/companies/${tenantId}/customers`"
      class="text-sm text-slate-400 hover:text-slate-200"
    >
      ← Back to customers
    </NuxtLink>

    <p v-if="error" class="mt-4 rounded-md border border-danger-800 bg-danger-950 p-3 text-sm text-danger-300">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <template v-else-if="data">
      <header class="mt-2">
        <h1 class="text-2xl font-semibold text-slate-100">
          {{ data.customerName || data.customerPhone }}
        </h1>
        <p class="mt-1 text-sm text-slate-500 font-mono">{{ data.customerPhone }}</p>
      </header>

      <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SuperadminStatCard label="Conversations" :value="data.conversationCount" />
        <SuperadminStatCard label="Open" :value="data.openConversationCount" />
        <SuperadminStatCard label="Last message" :value="new Date(data.lastMessageAt).toLocaleString()" />
      </div>

      <div class="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CustomerMeetingsCard :phone="phone" :tenant-id="tenantId" tone="dark" />
        <CustomerCasesCard :phone="phone" :tenant-id="tenantId" tone="dark" />
      </div>

      <h2 class="mt-8 text-base font-semibold text-slate-200">Conversations</h2>
      <div class="mt-3 overflow-x-auto rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg">
        <table class="w-full text-sm">
          <thead class="bg-slate-950 text-slate-400">
            <tr>
              <th class="text-left font-medium px-4 py-3">Bot</th>
              <th class="text-left font-medium px-4 py-3">Status</th>
              <th class="text-left font-medium px-4 py-3">Last message</th>
              <th class="text-left font-medium px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in data.conversations"
              :key="c.id"
              class="border-t border-slate-800"
            >
              <td class="px-4 py-3 text-slate-100">{{ botMap.get(c.botId)?.name ?? '—' }}</td>
              <td class="px-4 py-3 text-slate-300">{{ c.status }}</td>
              <td class="px-4 py-3 text-slate-400 text-xs">{{ new Date(c.lastMessageAt).toLocaleString() }}</td>
              <td class="px-4 py-3 text-slate-400 text-xs">{{ new Date(c.createdAt).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
