<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const bots = useBots()

const items = ref<Bot[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const toggling = ref<string | null>(null)

const confirmingDelete = ref<Bot | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    items.value = await bots.list()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onToggleActive(bot: Bot): Promise<void> {
  toggling.value = bot.id
  try {
    const updated = await bots.updateConfig(bot.id, { isActive: !bot.isActive })
    bot.isActive = updated.isActive
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
    await bots.remove(target.id)
    items.value = items.value.filter((b) => b.id !== target.id)
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
      <h1 class="text-2xl font-semibold">Bots</h1>
      <NuxtLink
        to="/admin/bots/create"
        class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        + Crear bot
      </NuxtLink>
    </div>

    <p v-if="error" class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </p>

    <div v-if="loading" class="mt-6 text-sm text-slate-500">Cargando…</div>

    <EmptyState
      v-else-if="items.length === 0"
      title="Aún no tienes bots"
      description="Crea el primero para conectarlo a un número de WhatsApp."
      class="mt-6"
    >
      <NuxtLink
        to="/admin/bots/create"
        class="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        + Crear bot
      </NuxtLink>
    </EmptyState>

    <div v-else class="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-600">
          <tr>
            <th class="text-left font-medium px-4 py-3">Nombre</th>
            <th class="text-left font-medium px-4 py-3">Modelo IA</th>
            <th class="text-left font-medium px-4 py-3">Phone ID</th>
            <th class="text-left font-medium px-4 py-3">Estado</th>
            <th class="text-right font-medium px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="bot in items"
            :key="bot.id"
            class="border-t border-slate-100"
          >
            <td class="px-4 py-3">
              <div class="font-medium text-slate-900">{{ bot.name }}</div>
              <div v-if="bot.description" class="text-xs text-slate-500 truncate max-w-xs">
                {{ bot.description }}
              </div>
            </td>
            <td class="px-4 py-3 text-slate-700">
              <div>{{ bot.aiModel }}</div>
              <div class="text-xs text-slate-500">{{ bot.aiProvider }}</div>
            </td>
            <td class="px-4 py-3 text-slate-600 font-mono text-xs">{{ bot.whatsappPhoneId }}</td>
            <td class="px-4 py-3">
              <button
                type="button"
                class="inline-block"
                :disabled="toggling === bot.id"
                @click="onToggleActive(bot)"
              >
                <BotStatusBadge :is-active="bot.isActive" />
              </button>
            </td>
            <td class="px-4 py-3 text-right space-x-3 text-sm">
              <NuxtLink :to="`/admin/bots/${bot.id}`" class="text-brand-600 hover:text-brand-700">Ver</NuxtLink>
              <NuxtLink :to="`/admin/bots/${bot.id}/edit`" class="text-brand-600 hover:text-brand-700">Editar</NuxtLink>
              <NuxtLink :to="`/admin/bots/${bot.id}/config`" class="text-brand-600 hover:text-brand-700">Config</NuxtLink>
              <button
                type="button"
                class="text-red-600 hover:text-red-700"
                @click="confirmingDelete = bot"
              >
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog
      :open="!!confirmingDelete"
      :title="`Eliminar bot ${confirmingDelete?.name ?? ''}`"
      message="Se borrarán también sus documentos, conversaciones e integraciones. Esta acción no se puede deshacer."
      @cancel="confirmingDelete = null"
      @confirm="onConfirmDelete"
    />
  </div>
</template>
