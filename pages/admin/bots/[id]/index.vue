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
    <NuxtLink to="/admin/bots" class="text-sm text-slate-500 hover:text-slate-700">← Back to bots</NuxtLink>

    <p v-if="error" class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

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
            Edit
          </NuxtLink>
          <NuxtLink
            :to="`/admin/bots/${bot.id}/config`"
            class="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
          >
            Configure
          </NuxtLink>
          <button
            type="button"
            class="rounded-md border border-danger-200 px-3 py-1.5 text-sm text-danger-700 hover:bg-danger-50"
            @click="confirmingDelete = true"
          >
            Delete
          </button>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
          <h2 class="text-sm font-semibold text-slate-900">AI</h2>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-500">Provider</dt>
              <dd class="text-slate-900">{{ bot.aiProvider }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Model</dt>
              <dd class="text-slate-900 font-mono">{{ bot.aiModel }}</dd>
            </div>
          </dl>
        </section>

        <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
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
              <dd class="text-slate-900">{{ bot.hasAppSecret ? 'Configured' : 'Not configured' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-500">Verify token</dt>
              <dd class="text-slate-900 font-mono text-xs break-all max-w-xs text-right">{{ bot.webhookVerifyToken }}</dd>
            </div>
          </dl>
        </section>

        <section class="md:col-span-2 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
          <h2 class="text-sm font-semibold text-slate-900">System prompt</h2>
          <pre class="mt-3 whitespace-pre-wrap text-sm text-slate-700 font-mono">{{ bot.systemPrompt }}</pre>
        </section>

        <BotCalendarCard :bot-id="bot.id" />
        <BotDocumentsCard :bot-id="bot.id" />
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
