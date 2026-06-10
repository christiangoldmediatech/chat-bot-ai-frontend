<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { MessagesActivity, MessagesActivityRange } from '~/types/dashboard'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const tenantId = route.params.id as string
const botId = route.params.botId as string
const bots = useBots(tenantId)

const callbackUrl = computed(() => `${config.public.apiBaseUrl}/webhooks/whatsapp/${botId}`)

const bot = ref<Bot | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const confirmingDelete = ref(false)

// Per-bot messages activity (day / week / month) shown alongside the overview.
const activity = reactive<Record<MessagesActivityRange, MessagesActivity | null>>({
  day: null,
  week: null,
  month: null,
})
const activityLoading = ref(true)
const activityError = ref<string | null>(null)

async function loadActivity(): Promise<void> {
  activityLoading.value = true
  activityError.value = null
  try {
    const [day, week, month] = await Promise.all([
      bots.messagesActivity(botId, 'day'),
      bots.messagesActivity(botId, 'week'),
      bots.messagesActivity(botId, 'month'),
    ])
    activity.day = day
    activity.week = week
    activity.month = month
  } catch (err) {
    activityError.value = (err as ApiError).message
  } finally {
    activityLoading.value = false
  }
}

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

await Promise.all([load(), loadActivity()])
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${tenantId}`" class="text-sm text-slate-400 hover:text-slate-200">{{ $t('superadmin.companyBotDetail.back') }}</NuxtLink>

    <p v-if="error" class="mt-4 rounded-2xl border border-danger-800 bg-danger-950/80 p-3 text-sm text-danger-300">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <template v-else-if="bot">
      <!-- Header -->
      <div class="mt-2 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-semibold text-xl ring-1 ring-slate-700 shadow-inner">
            {{ bot.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <h1 class="text-2xl font-semibold text-slate-100 tracking-tight flex items-center gap-3">
              {{ bot.name }}
              <BotStatusBadge :is-active="bot.isActive" />
            </h1>
            <p v-if="bot.description" class="text-slate-400 mt-0.5 text-sm">{{ bot.description }}</p>
          </div>
        </div>

        <div class="flex gap-2">
          <NuxtLink
            :to="`/superadmin/companies/${tenantId}/bots/${bot.id}/edit`"
            class="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
          >
            {{ $t('superadmin.companyBotDetail.whatsapp') }}
          </NuxtLink>
          <NuxtLink
            :to="`/superadmin/companies/${tenantId}/bots/${bot.id}/config`"
            class="rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100 transition"
          >
            {{ $t('superadmin.companyBotDetail.configureAgent') }}
          </NuxtLink>
          <button
            type="button"
            class="rounded-xl border border-danger-800 bg-danger-950/40 px-3 py-1.5 text-sm font-medium text-danger-300 hover:bg-danger-950 transition"
            @click="confirmingDelete = true"
          >
            {{ $t('common.delete') }}
          </button>
        </div>
      </div>

      <!-- Quick-jump nav -->
      <nav class="mt-5 flex flex-wrap items-center gap-2 text-sm">
        <a href="#activity" class="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/30 px-3 py-1 text-indigo-300 hover:bg-indigo-500/20 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          {{ $t('superadmin.companyBotDetail.nav.activity') }}
        </a>
        <a href="#overview" class="rounded-full bg-slate-900 ring-1 ring-slate-700 px-3 py-1 text-slate-300 hover:bg-slate-800 hover:ring-slate-600 transition">{{ $t('superadmin.companyBotDetail.nav.overview') }}</a>
        <a href="#documents" class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 ring-1 ring-amber-500/30 px-3 py-1 text-amber-300 hover:bg-amber-500/20 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {{ $t('superadmin.companyBotDetail.nav.documents') }}
        </a>
        <a href="#media" class="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/30 px-3 py-1 text-indigo-300 hover:bg-indigo-500/20 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          {{ $t('superadmin.companyBotDetail.nav.multimedia') }}
        </a>
        <a href="#calendar" class="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 ring-1 ring-sky-500/30 px-3 py-1 text-sky-300 hover:bg-sky-500/20 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {{ $t('superadmin.companyBotDetail.nav.calendar') }}
        </a>
      </nav>

      <!-- Activity dashboard: day / week / month, always visible together. -->
      <section id="activity" class="scroll-mt-24 mt-6">
        <div class="flex items-end justify-between gap-3 flex-wrap mb-3">
          <div>
            <h2 class="text-base font-semibold text-slate-100">{{ $t('superadmin.companyBotDetail.activityTitle') }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('superadmin.companyBotDetail.activitySubtitle') }}</p>
          </div>
          <button
            type="button"
            class="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
            :disabled="activityLoading"
            @click="loadActivity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="activityLoading ? 'animate-spin' : ''" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {{ $t('common.reload') }}
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MessagesActivityCard
            :data="activity.day!"
            :loading="activityLoading"
            :error="activityError"
            :title="$t('conversations.activity.daily')"
            :subtitle="$t('conversations.activity.dailySubtitle')"
            tone="primary"
            theme="dark"
          />
          <MessagesActivityCard
            :data="activity.week!"
            :loading="activityLoading"
            :error="activityError"
            :title="$t('conversations.activity.weekly')"
            :subtitle="$t('conversations.activity.weeklySubtitle')"
            tone="success"
            theme="dark"
          />
          <MessagesActivityCard
            :data="activity.month!"
            :loading="activityLoading"
            :error="activityError"
            :title="$t('conversations.activity.monthly')"
            :subtitle="$t('conversations.activity.monthlySubtitle')"
            tone="amber"
            theme="dark"
          />
        </div>
      </section>

      <!-- Overview: AI + WhatsApp summary, then system prompt -->
      <section id="overview" class="scroll-mt-24 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5">
          <h2 class="text-sm font-semibold text-slate-100">{{ $t('admin.bot.ai') }}</h2>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-400">{{ $t('admin.bot.aiProvider') }}</dt>
              <dd class="text-slate-100">{{ bot.aiProvider }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-400">{{ $t('admin.bot.aiModel') }}</dt>
              <dd class="text-slate-100 font-mono">{{ bot.aiModel }}</dd>
            </div>
          </dl>
        </div>

        <div class="rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5">
          <h2 class="text-sm font-semibold text-slate-100">{{ $t('superadmin.companyBotDetail.whatsapp') }}</h2>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-slate-400">{{ $t('admin.bot.whatsappPhoneId') }}</dt>
              <dd class="text-slate-100 font-mono text-xs">{{ bot.whatsappPhoneId }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-400">{{ $t('admin.bot.whatsappWabaId') }}</dt>
              <dd class="text-slate-100 font-mono text-xs">{{ bot.whatsappBusinessAccountId ?? '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-slate-400">{{ $t('admin.bot.whatsappAppSecret') }}</dt>
              <dd class="text-slate-100">{{ bot.hasAppSecret ? $t('admin.bot.whatsappAppSecretConfigured') : $t('admin.bot.whatsappAppSecretMissing') }}</dd>
            </div>
          </dl>

          <!-- Webhook info (read-only, copyable) — for pasting in Meta -->
          <div class="mt-4 pt-4 border-t border-slate-800 space-y-3">
            <div>
              <div class="flex items-center justify-between">
                <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('admin.bot.callbackUrl') }}</p>
                <CopyButton :value="callbackUrl" tone="dark" :label="$t('common.copy')" />
              </div>
              <code class="mt-1 block text-[11px] font-mono text-slate-200 break-all select-all bg-slate-950 ring-1 ring-slate-800 rounded-lg px-2 py-1.5">
                {{ callbackUrl }}
              </code>
            </div>
            <div>
              <div class="flex items-center justify-between">
                <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('admin.bot.verifyToken') }}</p>
                <CopyButton :value="bot.webhookVerifyToken" tone="dark" :label="$t('common.copy')" />
              </div>
              <code class="mt-1 block text-[11px] font-mono text-slate-200 break-all select-all bg-slate-950 ring-1 ring-slate-800 rounded-lg px-2 py-1.5">
                {{ bot.webhookVerifyToken }}
              </code>
            </div>
            <p class="text-[11px] text-slate-500">
              {{ $t('admin.bot.pasteInMeta') }}
            </p>
          </div>
        </div>

        <div class="md:col-span-2 rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5">
          <h2 class="text-sm font-semibold text-slate-100">{{ $t('admin.bot.systemPrompt') }}</h2>
          <pre class="mt-3 whitespace-pre-wrap text-sm text-slate-200 font-mono">{{ bot.systemPrompt }}</pre>
        </div>
      </section>

      <!-- Documents (knowledge base) -->
      <section id="documents" class="scroll-mt-24 mt-6">
        <header class="flex items-start gap-3 mb-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-amber-300" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-100">{{ $t('admin.bot.sections.documents') }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.bot.sections.documentsDesc') }}</p>
          </div>
        </header>
        <BotDocumentsCard :bot-id="bot.id" :tenant-id="tenantId" />
      </section>

      <!-- Multimedia (sendable resources) -->
      <section id="media" class="scroll-mt-24 mt-6">
        <header class="flex items-start gap-3 mb-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-indigo-300" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-100">{{ $t('superadmin.bot.sections.multimedia') }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('superadmin.bot.sections.multimediaDesc') }}</p>
          </div>
        </header>
        <BotMediaAssetsCard :bot-id="bot.id" :tenant-id="tenantId" />
      </section>

      <!-- Google Calendar -->
      <section id="calendar" class="scroll-mt-24 mt-6">
        <header class="flex items-start gap-3 mb-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-sky-300" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-100">{{ $t('admin.bot.sections.calendar') }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.bot.sections.calendarDesc') }}</p>
          </div>
        </header>
        <BotCalendarCard :bot-id="bot.id" :tenant-id="tenantId" />
      </section>

      <ConfirmDialog
        :open="confirmingDelete"
        :title="$t('superadmin.companyBotDetail.deleteConfirmTitle', { name: bot.name })"
        :message="$t('superadmin.companyBotDetail.deleteConfirmMessage')"
        :require-typed="bot.name"
        :require-typed-label="$t('superadmin.companyBotDetail.deleteConfirmTyped')"
        :confirm-label="$t('superadmin.companyBotDetail.deleteConfirmAction')"
        @cancel="confirmingDelete = false"
        @confirm="onConfirmDelete"
      />
    </template>
  </div>
</template>
