<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { SuperadminDashboardSummary } from '~/types/dashboard'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const { superadminSummary } = useDashboard()

const data = ref<SuperadminDashboardSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await superadminSummary()
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
    <!-- Hero header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
          <span class="size-1.5 rounded-full bg-indigo-400" />
          {{ $t('superadmin.dashboard.kicker') }}
        </span>
        <h1 class="mt-2 text-2xl font-semibold text-slate-100 tracking-tight">{{ $t('superadmin.dashboard.title') }}</h1>
        <p class="mt-1 text-sm text-slate-400 max-w-2xl">
          {{ $t('superadmin.dashboard.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition"
          :disabled="loading"
          @click="load"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" :class="loading ? 'animate-spin' : ''" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {{ $t('superadmin.dashboard.reload') }}
        </button>
        <NuxtLink
          to="/superadmin/companies"
          class="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100 transition"
        >
          {{ $t('superadmin.dashboard.allCompanies') }}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </NuxtLink>
      </div>
    </header>

    <p v-if="error" class="mt-4 rounded-2xl border border-danger-800 bg-danger-950/80 p-3 text-sm text-danger-300">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <template v-else-if="data">
      <!-- Tenants group -->
      <section class="mt-6">
        <h2 class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('superadmin.dashboard.groupTenants') }}</h2>
        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.companies')"
            icon="companies"
            tone="indigo"
            :value="data.totalCompanies"
            :hint="$t('superadmin.dashboard.stat.companiesHint', { active: data.activeCompanies, suspended: data.suspendedCompanies })"
          />
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.users')"
            icon="users"
            tone="emerald"
            :value="data.totalUsers"
            :hint="$t('superadmin.dashboard.stat.usersHint')"
          />
        </div>
      </section>

      <!-- Activity group -->
      <section class="mt-6">
        <h2 class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('superadmin.dashboard.groupActivity') }}</h2>
        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.bots')"
            icon="bots"
            tone="amber"
            :value="data.totalBots"
            :hint="$t('superadmin.dashboard.stat.botsHint', { n: data.activeBots })"
          />
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.conversations')"
            icon="conversations"
            tone="indigo"
            :value="data.totalConversations"
            :hint="$t('superadmin.dashboard.stat.conversationsHint')"
          />
          <SuperadminStatCard
            :label="$t('superadmin.dashboard.stat.documents')"
            icon="documents"
            tone="rose"
            :value="data.totalDocuments"
            :hint="$t('superadmin.dashboard.stat.documentsHint')"
          />
        </div>
      </section>

      <!-- Recent companies -->
      <section class="mt-8">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-slate-100">{{ $t('superadmin.dashboard.recent.title') }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('superadmin.dashboard.recent.subtitle') }}</p>
          </div>
          <NuxtLink to="/superadmin/companies" class="text-sm text-slate-400 hover:text-slate-200 inline-flex items-center gap-1">
            {{ $t('superadmin.dashboard.recent.viewAll') }}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </NuxtLink>
        </div>

        <div
          v-if="data.recentCompanies.length > 0"
          class="mt-3 rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg overflow-hidden"
        >
          <ul class="divide-y divide-slate-800">
            <li v-for="c in data.recentCompanies" :key="c.id">
              <NuxtLink
                :to="`/superadmin/companies/${c.id}`"
                class="group flex items-center gap-4 px-4 py-3.5 hover:bg-slate-800/40 transition"
              >
                <!-- Avatar -->
                <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-semibold text-sm ring-1 ring-slate-700">
                  {{ c.name.charAt(0).toUpperCase() }}
                </div>
                <!-- Identity -->
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-slate-100 truncate group-hover:text-white">{{ c.name }}</div>
                  <div class="text-xs text-slate-500 font-mono truncate">{{ c.slug }}</div>
                </div>
                <!-- Created -->
                <div class="hidden sm:flex flex-col items-end text-xs text-slate-500">
                  <span>{{ new Date(c.createdAt).toLocaleDateString() }}</span>
                  <span class="text-[11px] mt-0.5">{{ new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
                </div>
                <!-- Arrow -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-slate-500 group-hover:text-slate-300 transition" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="mt-3 rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-8 text-center"
        >
          <div class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-slate-400" aria-hidden="true">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
            </svg>
          </div>
          <p class="mt-3 text-sm text-slate-300 font-medium">{{ $t('superadmin.dashboard.recent.emptyTitle') }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ $t('superadmin.dashboard.recent.emptyBody') }}</p>
        </div>
      </section>
    </template>
  </div>
</template>
