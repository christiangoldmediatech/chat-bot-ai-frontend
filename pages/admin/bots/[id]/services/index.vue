<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Service } from '~/types/service'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const route = useRoute()
const botId = String(route.params.id)
const services = useServices()

const items = ref<Service[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const toggling = ref<string | null>(null)
const confirmingDelete = ref<Service | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    items.value = await services.list(botId)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onToggleActive(svc: Service): Promise<void> {
  toggling.value = svc.id
  try {
    const updated = await services.update(botId, svc.id, { isActive: !svc.isActive })
    Object.assign(svc, updated)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    toggling.value = null
  }
}

async function onConfirmDelete(): Promise<void> {
  const target = confirmingDelete.value
  if (!target) return
  try {
    await services.remove(botId, target.id)
    items.value = items.value.filter((s) => s.id !== target.id)
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
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('admin.services.title') }}</h1>
        <p class="text-slate-500 text-sm mt-1 max-w-2xl">{{ $t('admin.services.subtitle') }}</p>
      </div>
      <NuxtLink
        :to="`/admin/bots/${botId}/services/create`"
        class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 shadow-glass transition"
      >
        {{ $t('admin.services.createButton') }}
      </NuxtLink>
    </div>

    <p v-if="error" class="mt-4 rounded-2xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <div v-if="loading" class="mt-6 text-slate-500 text-sm">{{ $t('common.loading') }}…</div>

    <EmptyState
      v-else-if="items.length === 0"
      :title="$t('admin.services.emptyTitle')"
      :description="$t('admin.services.emptyDescription')"
      class="mt-6"
    />

    <div v-else class="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="svc in items"
        :key="svc.id"
        class="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl p-4 flex flex-col gap-3"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <h3 class="text-base font-semibold text-slate-900">{{ svc.name }}</h3>
            <p class="text-xs font-mono text-slate-500">{{ svc.slug }}</p>
          </div>
          <span
            class="text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ring-1"
            :class="svc.isActive
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-slate-100 text-slate-500 ring-slate-200'"
          >
            {{ svc.isActive ? $t('common.active') : $t('common.inactive') }}
          </span>
        </div>

        <p class="text-sm text-slate-600 line-clamp-3 min-h-[3rem]">
          {{ svc.shortDescription || svc.description }}
        </p>

        <div class="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
          <div>
            <p class="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              {{ $t('admin.services.priceLabel') }}
            </p>
            <p class="text-lg font-semibold text-slate-900">{{ svc.priceFormatted }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40"
              :disabled="toggling === svc.id"
              @click="onToggleActive(svc)"
            >
              {{ svc.isActive ? $t('common.deactivate') : $t('common.activate') }}
            </button>
            <NuxtLink
              :to="`/admin/bots/${botId}/services/${svc.id}/edit`"
              class="text-xs font-medium text-primary-700 hover:text-primary-800"
            >
              {{ $t('common.edit') }}
            </NuxtLink>
            <button
              type="button"
              class="text-xs font-medium text-danger-600 hover:text-danger-800"
              @click="confirmingDelete = svc"
            >
              {{ $t('common.delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="!!confirmingDelete"
      :title="$t('admin.services.deleteTitle')"
      :message="$t('admin.services.deleteDescription', { name: confirmingDelete?.name ?? '' })"
      :confirm-label="$t('common.delete')"
      tone="danger"
      @cancel="confirmingDelete = null"
      @confirm="onConfirmDelete"
    />
  </div>
</template>
