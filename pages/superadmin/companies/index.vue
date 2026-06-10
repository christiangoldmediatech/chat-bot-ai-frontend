<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Company } from '~/types/company'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const companiesApi = useCompanies()

const items = ref<Company[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const confirmingDelete = ref<Company | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    items.value = await companiesApi.list()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onConfirmDelete(): Promise<void> {
  const target = confirmingDelete.value
  if (!target) return
  try {
    await companiesApi.remove(target.id)
    items.value = items.value.filter((c) => c.id !== target.id)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    confirmingDelete.value = null
  }
}

await load()
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-slate-100">{{ $t('superadmin.companies.title') }}</h1>
      <NuxtLink
        to="/superadmin/companies/create"
        class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        {{ $t('superadmin.companies.create') }}
      </NuxtLink>
    </div>

    <p v-if="error" class="mt-4 rounded-md border border-danger-800 bg-danger-950 p-3 text-sm text-danger-300">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <div
      v-else-if="items.length === 0"
      class="mt-6 rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/40 backdrop-blur-xl p-12 text-center"
    >
      <h3 class="text-base font-medium text-slate-200">{{ $t('superadmin.companies.empty.title') }}</h3>
      <p class="mt-1 text-sm text-slate-500">{{ $t('superadmin.companies.empty.description') }}</p>
    </div>

    <div v-else class="mt-6 overflow-x-auto rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg">
      <table class="w-full text-sm">
        <thead class="bg-slate-950 text-slate-400">
          <tr>
            <th class="text-left font-medium px-4 py-3">{{ $t('superadmin.companies.tableName') }}</th>
            <th class="text-left font-medium px-4 py-3">{{ $t('superadmin.companies.tablePlan') }}</th>
            <th class="text-left font-medium px-4 py-3">{{ $t('superadmin.companies.tableStatus') }}</th>
            <th class="text-right font-medium px-4 py-3">{{ $t('superadmin.dashboard.stat.users') }}</th>
            <th class="text-right font-medium px-4 py-3">{{ $t('nav.bots') }}</th>
            <th class="text-right font-medium px-4 py-3">{{ $t('nav.conversations') }}</th>
            <th class="text-right font-medium px-4 py-3">{{ $t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in items"
            :key="c.id"
            class="border-t border-slate-800"
          >
            <td class="px-4 py-3">
              <NuxtLink
                :to="`/superadmin/companies/${c.id}`"
                class="font-medium text-slate-100 hover:text-white"
              >
                {{ c.name }}
              </NuxtLink>
              <div class="text-xs text-slate-500 font-mono">{{ c.slug }}</div>
            </td>
            <td class="px-4 py-3 text-slate-300">{{ c.plan }}</td>
            <td class="px-4 py-3">
              <span
                class="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
                :class="
                  c.status === 'ACTIVE'
                    ? 'bg-success-950 text-success-300 border-success-800'
                    : 'bg-amber-950 text-amber-300 border-amber-800'
                "
              >
                {{ c.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-right text-slate-300">{{ c.userCount }}</td>
            <td class="px-4 py-3 text-right text-slate-300">{{ c.botCount }}</td>
            <td class="px-4 py-3 text-right text-slate-300">{{ c.conversationCount }}</td>
            <td class="px-4 py-3 text-right space-x-3 text-sm">
              <NuxtLink :to="`/superadmin/companies/${c.id}`" class="text-brand-300 hover:text-white">{{ $t('common.view') }}</NuxtLink>
              <NuxtLink :to="`/superadmin/companies/${c.id}/edit`" class="text-brand-300 hover:text-white">{{ $t('common.edit') }}</NuxtLink>
              <button
                type="button"
                class="text-danger-400 hover:text-danger-300"
                @click="confirmingDelete = c"
              >
                {{ $t('common.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog
      :open="!!confirmingDelete"
      :title="$t('superadmin.companyEdit.deleteConfirmTitle', { name: confirmingDelete?.name ?? '' })"
      :message="$t('superadmin.companyEdit.deleteConfirmMessage')"
      @cancel="confirmingDelete = null"
      @confirm="onConfirmDelete"
    />
  </div>
</template>
