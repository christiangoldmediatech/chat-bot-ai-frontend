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
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-slate-100">Dashboard global</h1>
      <button
        type="button"
        class="text-sm text-slate-400 hover:text-slate-200"
        :disabled="loading"
        @click="load"
      >
        Recargar
      </button>
    </div>

    <p v-if="error" class="mt-4 rounded-md border border-red-800 bg-red-950 p-3 text-sm text-red-300">
      {{ error }}
    </p>

    <div v-if="loading" class="mt-6 text-sm text-slate-400">Cargando…</div>

    <template v-else-if="data">
      <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div class="text-xs uppercase tracking-wider text-slate-400">Empresas</div>
          <div class="mt-2 text-3xl font-semibold">{{ data.totalCompanies }}</div>
          <div class="mt-1 text-xs text-slate-500">
            {{ data.activeCompanies }} activas · {{ data.suspendedCompanies }} suspendidas
          </div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div class="text-xs uppercase tracking-wider text-slate-400">Usuarios</div>
          <div class="mt-2 text-3xl font-semibold">{{ data.totalUsers }}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div class="text-xs uppercase tracking-wider text-slate-400">Bots</div>
          <div class="mt-2 text-3xl font-semibold">{{ data.totalBots }}</div>
          <div class="mt-1 text-xs text-slate-500">{{ data.activeBots }} activos</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div class="text-xs uppercase tracking-wider text-slate-400">Conversaciones</div>
          <div class="mt-2 text-3xl font-semibold">{{ data.totalConversations }}</div>
          <div class="mt-1 text-xs text-slate-500">{{ data.totalDocuments }} documentos</div>
        </div>
      </div>

      <h2 class="mt-8 text-base font-semibold text-slate-200">Empresas recientes</h2>
      <ul
        v-if="data.recentCompanies.length > 0"
        class="mt-3 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900"
      >
        <li
          v-for="c in data.recentCompanies"
          :key="c.id"
          class="px-4 py-3"
        >
          <NuxtLink
            :to="`/superadmin/companies/${c.id}`"
            class="flex items-center justify-between gap-4 hover:text-white"
          >
            <div>
              <div class="font-medium text-slate-100">{{ c.name }}</div>
              <div class="text-xs text-slate-500 font-mono">{{ c.slug }}</div>
            </div>
            <div class="text-xs text-slate-400">{{ new Date(c.createdAt).toLocaleString() }}</div>
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="mt-3 text-sm text-slate-500">Aún no hay empresas registradas.</p>
    </template>
  </div>
</template>
