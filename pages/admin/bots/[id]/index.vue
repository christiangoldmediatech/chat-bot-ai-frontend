<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const bots = useBots()
const id = route.params.id as string

const bot = ref<Bot | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const confirmingDelete = ref(false)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    bot.value = await bots.get(id)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onConfirmDelete(): Promise<void> {
  try {
    await bots.remove(id)
    await router.replace('/admin/bots')
  } catch (err) {
    error.value = (err as ApiError).message
    confirmingDelete.value = false
  }
}

await load()
</script>

<template>
  <div>
    <NuxtLink to="/admin/bots" class="text-sm text-slate-500 hover:text-slate-700">← Volver a bots</NuxtLink>

    <p v-if="error" class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </p>

    <div v-if="loading" class="mt-6 text-sm text-slate-500">Cargando…</div>

    <template v-else-if="bot">
      <div class="mt-2 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-semibold flex items-center gap-3">
            {{ bot.name }}
            <BotStatusBadge :is-active="bot.isActive" />
          </h1>
          <p v-if="bot.description" class="text-slate-500 mt-1 text-sm">{{ bot.description }}</p>
        </div>

        <div class="flex gap-2">
          <NuxtLink
            :to="`/admin/bots/${bot.id}/edit`"
            class="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Editar
          </NuxtLink>
          <NuxtLink
            :to="`/admin/bots/${bot.id}/config`"
            class="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
          >
            Configurar
          </NuxtLink>
          <button
            type="button"
            class="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            @click="confirmingDelete = true"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-sm font-semibold text-slate-900">IA</h2>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-500">Proveedor</dt>
              <dd class="text-slate-900">{{ bot.aiProvider }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Modelo</dt>
              <dd class="text-slate-900 font-mono">{{ bot.aiModel }}</dd>
            </div>
          </dl>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-sm font-semibold text-slate-900">WhatsApp</h2>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-500">Phone ID</dt>
              <dd class="text-slate-900 font-mono text-xs">{{ bot.whatsappPhoneId }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">WABA ID</dt>
              <dd class="text-slate-900 font-mono text-xs">{{ bot.whatsappBusinessAccountId ?? '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">App secret</dt>
              <dd class="text-slate-900">{{ bot.hasAppSecret ? 'Configurado' : 'No configurado' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Verify token</dt>
              <dd class="text-slate-900 font-mono text-xs break-all max-w-xs text-right">{{ bot.webhookVerifyToken }}</dd>
            </div>
          </dl>
        </section>

        <section class="md:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-sm font-semibold text-slate-900">System prompt</h2>
          <pre class="mt-3 whitespace-pre-wrap text-sm text-slate-700 font-mono">{{ bot.systemPrompt }}</pre>
        </section>
      </div>

      <ConfirmDialog
        :open="confirmingDelete"
        :title="`Eliminar bot ${bot.name}`"
        message="Se borrarán también sus documentos, conversaciones e integraciones. Esta acción no se puede deshacer."
        @cancel="confirmingDelete = false"
        @confirm="onConfirmDelete"
      />
    </template>
  </div>
</template>
