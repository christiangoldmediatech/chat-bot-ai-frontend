<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const router = useRouter()
const tenantId = route.params.id as string
const botId = route.params.botId as string
const bots = useBots(tenantId)

const bot = ref<Bot | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const confirmingDelete = ref(false)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    bot.value = await bots.get(botId)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onConfirmDelete(): Promise<void> {
  try {
    await bots.remove(botId)
    await router.replace(`/superadmin/companies/${tenantId}`)
  } catch (err) {
    error.value = (err as ApiError).message
    confirmingDelete.value = false
  }
}

await load()
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${tenantId}`" class="text-sm text-slate-400 hover:text-slate-200">← Back to company</NuxtLink>

    <p v-if="error" class="mt-4 rounded-md border border-danger-800 bg-danger-950 p-3 text-sm text-danger-300">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <template v-else-if="bot">
      <div class="mt-2 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            {{ bot.name }}
            <BotStatusBadge :is-active="bot.isActive" />
          </h1>
          <p v-if="bot.description" class="text-slate-400 mt-1 text-sm">{{ bot.description }}</p>
        </div>

        <div class="flex gap-2">
          <NuxtLink
            :to="`/superadmin/companies/${tenantId}/bots/${bot.id}/edit`"
            class="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Edit
          </NuxtLink>
          <NuxtLink
            :to="`/superadmin/companies/${tenantId}/bots/${bot.id}/config`"
            class="rounded-md bg-white px-3 py-1.5 text-sm text-slate-900 hover:bg-slate-100"
          >
            Configure
          </NuxtLink>
          <button
            type="button"
            class="rounded-md border border-danger-800 px-3 py-1.5 text-sm text-danger-300 hover:bg-danger-950"
            @click="confirmingDelete = true"
          >
            Delete
          </button>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section class="rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5">
          <h2 class="text-sm font-semibold text-slate-100">AI</h2>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-400">Provider</dt>
              <dd class="text-slate-100">{{ bot.aiProvider }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-400">Model</dt>
              <dd class="text-slate-100 font-mono">{{ bot.aiModel }}</dd>
            </div>
          </dl>
        </section>

        <section class="rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5">
          <h2 class="text-sm font-semibold text-slate-100">WhatsApp</h2>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-400">Phone ID</dt>
              <dd class="text-slate-100 font-mono text-xs">{{ bot.whatsappPhoneId }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-400">WABA ID</dt>
              <dd class="text-slate-100 font-mono text-xs">{{ bot.whatsappBusinessAccountId ?? '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-400">App secret</dt>
              <dd class="text-slate-100">{{ bot.hasAppSecret ? 'Configured' : 'Not configured' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-400">Verify token</dt>
              <dd class="text-slate-100 font-mono text-xs break-all max-w-xs text-right">{{ bot.webhookVerifyToken }}</dd>
            </div>
          </dl>
        </section>

        <section class="md:col-span-2 rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5">
          <h2 class="text-sm font-semibold text-slate-100">System prompt</h2>
          <pre class="mt-3 whitespace-pre-wrap text-sm text-slate-200 font-mono">{{ bot.systemPrompt }}</pre>
        </section>

        <BotCalendarCard :bot-id="bot.id" :tenant-id="tenantId" />
        <BotDocumentsCard :bot-id="bot.id" :tenant-id="tenantId" />
      </div>

      <ConfirmDialog
        :open="confirmingDelete"
        :title="`Delete bot ${bot.name}`"
        message="Its documents, conversations, and integrations will also be deleted. This action cannot be undone."
        @cancel="confirmingDelete = false"
        @confirm="onConfirmDelete"
      />
    </template>
  </div>
</template>
