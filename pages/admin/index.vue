<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { DashboardSummary } from '~/types/dashboard'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const { summary } = useDashboard()

const data = ref<DashboardSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await summary()
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
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Dashboard</h1>
      <button
        type="button"
        class="text-sm text-slate-500 hover:text-slate-700"
        :disabled="loading"
        @click="load"
      >
        Reload
      </button>
    </div>

    <p v-if="error" class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <template v-else-if="data">
      <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Bots" :value="data.bots" :hint="`${data.activeBots} active`" />
        <StatCard label="Conversations" :value="data.conversations" :hint="`${data.openConversations} open`" />
        <StatCard label="Handled by humans" :value="data.humanConversations" hint="HUMAN status" />
        <StatCard label="Customers" :value="data.customers" hint="Unique phone numbers" />
      </div>

      <div class="mt-8">
        <h2 class="text-base font-semibold text-slate-900">Recent conversations</h2>
        <div class="mt-3">
          <ConversationList :conversations="data.recentConversations" />
        </div>
      </div>
    </template>
  </div>
</template>
