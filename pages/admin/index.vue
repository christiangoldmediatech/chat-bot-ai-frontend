<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { DashboardSummary } from '~/types/dashboard'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const { t } = useI18n()
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
    <!-- Hero / page header -->
    <header class="flex items-start justify-between gap-4 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">{{ $t('admin.dashboard.title') }}</h1>
        <p class="mt-1 text-sm text-slate-500 max-w-2xl">{{ $t('admin.dashboard.subtitle') }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-glass hover:bg-white hover:text-slate-900 hover:ring-slate-200 disabled:opacity-60 disabled:cursor-not-allowed transition"
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
          class="size-4"
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
    </header>

    <p v-if="error" class="mt-4 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-8" />

    <template v-else-if="data">
      <!-- Stats -->
      <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          :label="$t('admin.dashboard.stats.bots')"
          :value="data.bots"
          :hint="$t('admin.dashboard.stats.botsHint', { n: data.activeBots })"
          icon="bots"
          tone="indigo"
          to="/admin/bots"
        />
        <StatCard
          :label="$t('admin.dashboard.stats.conversations')"
          :value="data.conversations"
          :hint="$t('admin.dashboard.stats.conversationsHint', { n: data.openConversations })"
          icon="conversations"
          tone="emerald"
          to="/admin/conversations"
        />
        <StatCard
          :label="$t('admin.dashboard.stats.humanHandled')"
          :value="data.humanConversations"
          :hint="$t('admin.dashboard.stats.humanHandledHint')"
          icon="humans"
          tone="amber"
          to="/admin/cases"
        />
        <StatCard
          :label="$t('admin.dashboard.stats.customers')"
          :value="data.customers"
          :hint="$t('admin.dashboard.stats.customersHint')"
          icon="customers"
          tone="sky"
          to="/admin/customers"
        />
      </div>

      <!-- Commercial activity (leads) -->
      <div class="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          :label="$t('admin.dashboard.stats.leadsTotal')"
          :value="data.totalLeads"
          :hint="$t('admin.dashboard.stats.leadsTotalHint')"
          icon="leads"
          tone="indigo"
          to="/admin/leads"
        />
        <StatCard
          :label="$t('admin.dashboard.stats.leadsNew')"
          :value="data.newLeads"
          :hint="$t('admin.dashboard.stats.leadsNewHint')"
          icon="leads"
          tone="sky"
          to="/admin/leads"
        />
        <StatCard
          :label="$t('admin.dashboard.stats.leadsQualified')"
          :value="data.qualifiedLeads"
          :hint="$t('admin.dashboard.stats.leadsQualifiedHint')"
          icon="leads"
          tone="amber"
          to="/admin/leads"
        />
        <StatCard
          :label="$t('admin.dashboard.stats.leadsWon')"
          :value="data.wonLeads"
          :hint="$t('admin.dashboard.stats.leadsWonHint')"
          icon="leads"
          tone="emerald"
          to="/admin/leads"
        />
      </div>

      <!-- Recent conversations -->
      <section class="mt-10">
        <div class="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold text-slate-900 tracking-tight">{{ $t('admin.dashboard.recentConversations') }}</h2>
            <p class="text-sm text-slate-500 mt-0.5">{{ $t('admin.dashboard.recentConversationsHint') }}</p>
          </div>
          <NuxtLink
            to="/admin/conversations"
            class="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition"
          >
            {{ $t('admin.dashboard.viewAllConversations') }}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </NuxtLink>
        </div>
        <div class="mt-4">
          <ConversationList
            :conversations="data.recentConversations"
            :empty-label="t('admin.dashboard.noConversations')"
          />
        </div>
      </section>
    </template>
  </div>
</template>
