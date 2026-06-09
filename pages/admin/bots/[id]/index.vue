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
const config = useRuntimeConfig()
const id = route.params.id as string

const callbackUrl = computed(() => `${config.public.apiBaseUrl}/webhooks/whatsapp/${id}`)

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

    <p v-if="error" class="mt-4 rounded-2xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <template v-else-if="bot">
      <!-- Header -->
      <div class="mt-2 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-semibold text-xl ring-1 ring-white/40 shadow-inner">
            {{ bot.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <h1 class="text-2xl font-semibold tracking-tight flex items-center gap-3">
              {{ bot.name }}
              <BotStatusBadge :is-active="bot.isActive" />
            </h1>
            <p v-if="bot.description" class="text-slate-500 mt-0.5 text-sm">{{ bot.description }}</p>
          </div>
        </div>

        <div class="flex gap-2">
          <NuxtLink
            :to="`/admin/bots/${bot.id}/edit`"
            class="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            WhatsApp
          </NuxtLink>
          <NuxtLink
            :to="`/admin/bots/${bot.id}/config`"
            class="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 shadow-glass transition"
          >
            Configure agent
          </NuxtLink>
          <button
            type="button"
            class="rounded-xl border border-danger-200 bg-danger-50/40 px-3 py-1.5 text-sm font-medium text-danger-700 hover:bg-danger-50 transition"
            @click="confirmingDelete = true"
          >
            Delete
          </button>
        </div>
      </div>

      <!-- Quick-jump nav -->
      <nav class="mt-5 flex flex-wrap items-center gap-2 text-sm">
        <a href="#overview" class="rounded-full bg-white/70 ring-1 ring-slate-200/70 px-3 py-1 text-slate-700 hover:bg-white hover:ring-slate-300 transition">Overview</a>
        <a href="#documents" class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 ring-1 ring-amber-100 px-3 py-1 text-amber-700 hover:bg-amber-100 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Documents
        </a>
        <a href="#calendar" class="inline-flex items-center gap-1.5 rounded-full bg-sky-50 ring-1 ring-sky-100 px-3 py-1 text-sky-700 hover:bg-sky-100 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Google Calendar
        </a>
      </nav>

      <!-- Overview: AI + WhatsApp summary, then system prompt -->
      <section id="overview" class="scroll-mt-24 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
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
        </div>

        <div class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
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
          </dl>

          <!-- Webhook info (read-only, copyable) — for pasting in Meta -->
          <div class="mt-4 pt-4 border-t border-slate-200/70 space-y-3">
            <div>
              <div class="flex items-center justify-between">
                <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Callback URL</p>
                <CopyButton :value="callbackUrl" label="Copy" />
              </div>
              <code class="mt-1 block text-[11px] font-mono text-slate-700 break-all select-all bg-slate-50/80 ring-1 ring-slate-200/70 rounded-lg px-2 py-1.5">
                {{ callbackUrl }}
              </code>
            </div>
            <div>
              <div class="flex items-center justify-between">
                <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Verify token</p>
                <CopyButton :value="bot.webhookVerifyToken" label="Copy" />
              </div>
              <code class="mt-1 block text-[11px] font-mono text-slate-700 break-all select-all bg-slate-50/80 ring-1 ring-slate-200/70 rounded-lg px-2 py-1.5">
                {{ bot.webhookVerifyToken }}
              </code>
            </div>
            <p class="text-[11px] text-slate-500">
              Paste both in <span class="font-medium text-slate-600">Meta App → WhatsApp → Configuration → Webhook</span>.
            </p>
          </div>
        </div>

        <div class="md:col-span-2 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
          <h2 class="text-sm font-semibold text-slate-900">System prompt</h2>
          <pre class="mt-3 whitespace-pre-wrap text-sm text-slate-700 font-mono">{{ bot.systemPrompt }}</pre>
        </div>
      </section>

      <!-- Documents (knowledge base) -->
      <section id="documents" class="scroll-mt-24 mt-6">
        <header class="flex items-start gap-3 mb-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-amber-600" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-900">Documents</h2>
            <p class="text-xs text-slate-500 mt-0.5">Upload .md, .txt or .pdf files — the bot uses them as knowledge context (RAG).</p>
          </div>
        </header>
        <BotDocumentsCard :bot-id="bot.id" />
      </section>

      <!-- Google Calendar -->
      <section id="calendar" class="scroll-mt-24 mt-6">
        <header class="flex items-start gap-3 mb-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-sky-600" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-900">Google Calendar</h2>
            <p class="text-xs text-slate-500 mt-0.5">Connect a Google account so the bot can read availability and book meetings.</p>
          </div>
        </header>
        <BotCalendarCard :bot-id="bot.id" />
      </section>

      <ConfirmDialog
        :open="confirmingDelete"
        :title="`Delete bot ${bot.name}?`"
        message="Its documents, conversations, customers, and integrations will also be permanently deleted. This action cannot be undone."
        :require-typed="bot.name"
        require-typed-label="To confirm, type the bot's name:"
        confirm-label="Delete bot"
        @cancel="confirmingDelete = false"
        @confirm="onConfirmDelete"
      />
    </template>
  </div>
</template>
