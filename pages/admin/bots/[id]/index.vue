<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { Plan, Tenant } from '~/types/company'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const bots = useBots()
const tenants = useTenant()
const config = useRuntimeConfig()
const id = route.params.id as string

const callbackUrl = computed(() => `${config.public.apiBaseUrl}/webhooks/whatsapp/${id}`)

const bot = ref<Bot | null>(null)
const tenant = ref<Tenant | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const confirmingDelete = ref(false)
const promptOpen = ref(false)
const webhookOpen = ref(false)

const tenantPlan = computed<Plan>(() => tenant.value?.plan ?? 'BASIC')
const isPremium = computed(() => tenantPlan.value === 'PREMIUM')

// Plain-text preview of the system prompt for the overview tile (collapsed
// to a single line so the card stays compact regardless of prompt length).
const promptPreview = computed(() => {
  if (!bot.value?.systemPrompt) return ''
  return bot.value.systemPrompt.replace(/\s+/g, ' ').trim().slice(0, 220)
})

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [b, tn] = await Promise.all([bots.get(id), tenants.me()])
    bot.value = b
    tenant.value = tn
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
    <NuxtLink to="/admin/bots" class="text-sm text-slate-500 hover:text-slate-700">{{ $t('admin.bot.backToBots') }}</NuxtLink>

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
            {{ $t('admin.bot.whatsapp') }}
          </NuxtLink>
          <NuxtLink
            :to="`/admin/bots/${bot.id}/config`"
            class="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 shadow-glass transition"
          >
            {{ $t('admin.bot.configureAgent') }}
          </NuxtLink>
          <button
            type="button"
            class="rounded-xl border border-danger-200 bg-danger-50/40 px-3 py-1.5 text-sm font-medium text-danger-700 hover:bg-danger-50 transition"
            @click="confirmingDelete = true"
          >
            {{ $t('admin.bot.deleteBot') }}
          </button>
        </div>
      </div>

      <!-- Quick-jump nav — CRM only when PREMIUM -->
      <nav class="mt-5 flex flex-wrap items-center gap-2 text-sm">
        <a href="#overview" class="rounded-full bg-white/70 ring-1 ring-slate-200/70 px-3 py-1 text-slate-700 hover:bg-white hover:ring-slate-300 transition">{{ $t('admin.bot.sections.overview') }}</a>
        <a href="#documents" class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 ring-1 ring-amber-100 px-3 py-1 text-amber-700 hover:bg-amber-100 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {{ $t('admin.bot.sections.documents') }}
        </a>
        <a href="#media" class="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 ring-1 ring-indigo-100 px-3 py-1 text-indigo-700 hover:bg-indigo-100 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          {{ $t('admin.bot.sections.media') }}
        </a>
        <a href="#calendar" class="inline-flex items-center gap-1.5 rounded-full bg-sky-50 ring-1 ring-sky-100 px-3 py-1 text-sky-700 hover:bg-sky-100 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {{ $t('admin.bot.sections.calendar') }}
        </a>
        <a v-if="isPremium" href="#crm" class="inline-flex items-center gap-1.5 rounded-full bg-violet-50 ring-1 ring-violet-100 px-3 py-1 text-violet-700 hover:bg-violet-100 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          {{ $t('admin.crm.navChip') }}
        </a>
      </nav>

      <!-- Overview: 3-column on lg — AI / WhatsApp / System prompt tile -->
      <section id="overview" class="scroll-mt-24 mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- AI -->
        <div class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
          <div class="flex items-center gap-2">
            <span class="flex size-7 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100 text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
                <path d="M12 2 14 9l7 .5-5.5 4.5L17 21l-5-3-5 3 1.5-7L3 9.5 10 9z" />
              </svg>
            </span>
            <h2 class="text-sm font-semibold text-slate-900">{{ $t('admin.bot.ai') }}</h2>
          </div>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-slate-500">{{ $t('admin.bot.aiProvider') }}</dt>
              <dd class="text-slate-900 truncate">{{ bot.aiProvider }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-slate-500">{{ $t('admin.bot.aiModel') }}</dt>
              <dd class="text-slate-900 font-mono text-xs truncate">{{ bot.aiModel }}</dd>
            </div>
          </dl>
        </div>

        <!-- WhatsApp -->
        <div class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
          <div class="flex items-center gap-2">
            <span class="flex size-7 items-center justify-center rounded-lg bg-success-50 ring-1 ring-success-100 text-success-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-3.5" aria-hidden="true">
                <path d="M20.52 3.48A11.78 11.78 0 0 0 12.06 0C5.49 0 .12 5.37.12 11.94c0 2.1.55 4.16 1.6 5.97L0 24l6.27-1.65a11.86 11.86 0 0 0 5.79 1.48h.01c6.57 0 11.94-5.37 11.94-11.94 0-3.19-1.24-6.19-3.49-8.41Z" />
              </svg>
            </span>
            <h2 class="text-sm font-semibold text-slate-900">{{ $t('admin.bot.whatsapp') }}</h2>
          </div>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-slate-500">{{ $t('admin.bot.whatsappPhoneId') }}</dt>
              <dd class="text-slate-900 font-mono text-xs truncate">{{ bot.whatsappPhoneId }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-slate-500">{{ $t('admin.bot.whatsappWabaId') }}</dt>
              <dd class="text-slate-900 font-mono text-xs truncate">{{ bot.whatsappBusinessAccountId ?? '—' }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-slate-500">{{ $t('admin.bot.whatsappAppSecret') }}</dt>
              <dd
                class="text-xs font-medium"
                :class="bot.hasAppSecret ? 'text-emerald-700' : 'text-slate-500'"
              >
                {{ bot.hasAppSecret ? $t('admin.bot.whatsappAppSecretConfigured') : $t('admin.bot.whatsappAppSecretMissing') }}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            class="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            @click="webhookOpen = true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {{ $t('admin.bot.viewWebhookCredentials') }}
          </button>
        </div>

        <!-- System prompt tile -->
        <div class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5 flex flex-col">
          <div class="flex items-center gap-2">
            <span class="flex size-7 items-center justify-center rounded-lg bg-violet-50 ring-1 ring-violet-100 text-violet-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <h2 class="text-sm font-semibold text-slate-900">{{ $t('admin.bot.systemPrompt') }}</h2>
          </div>
          <p
            v-if="promptPreview"
            class="mt-3 text-xs text-slate-600 line-clamp-3 flex-1"
          >
            {{ promptPreview }}
          </p>
          <p v-else class="mt-3 text-xs text-slate-400 italic flex-1">
            {{ $t('admin.bot.systemPromptEmpty') }}
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              :disabled="!bot.systemPrompt"
              class="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              @click="promptOpen = true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {{ $t('admin.bot.viewSystemPrompt') }}
            </button>
            <NuxtLink
              :to="`/admin/bots/${bot.id}/config`"
              class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              {{ $t('common.edit') }}
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Documents (knowledge base) — all plans -->
      <section id="documents" class="scroll-mt-24 mt-8">
        <header class="mb-3 flex items-center gap-2">
          <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 ring-1 ring-amber-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 text-amber-600" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </div>
          <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.bot.sections.documents') }}</h2>
          <p class="text-xs text-slate-500 truncate">— {{ $t('admin.bot.sections.documentsDesc') }}</p>
        </header>
        <BotDocumentsCard :bot-id="bot.id" />
      </section>

      <!-- Multimedia -->
      <section id="media" class="scroll-mt-24 mt-8">
        <header class="mb-3 flex items-center gap-2">
          <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 text-indigo-600" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.bot.sections.media') }}</h2>
          <p class="text-xs text-slate-500 truncate">— {{ $t('admin.bot.sections.mediaDesc') }}</p>
        </header>
        <BotMediaAssetsCard :bot-id="bot.id" />
      </section>

      <!-- Google Calendar -->
      <section id="calendar" class="scroll-mt-24 mt-8">
        <header class="mb-3 flex items-center gap-2">
          <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 ring-1 ring-sky-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 text-sky-600" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.bot.sections.calendar') }}</h2>
          <p class="text-xs text-slate-500 truncate">— {{ $t('admin.bot.sections.calendarDesc') }}</p>
        </header>
        <BotCalendarCard :bot-id="bot.id" />
      </section>

      <!-- CRM — PREMIUM only -->
      <section v-if="isPremium" id="crm" class="scroll-mt-24 mt-8">
        <header class="mb-3 flex items-center gap-2">
          <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 ring-1 ring-violet-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 text-violet-600" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.bot.sections.crm') }}</h2>
          <p class="text-xs text-slate-500 truncate">— {{ $t('admin.bot.sections.crmDesc') }}</p>
        </header>
        <BotCrmCard :bot-id="bot.id" :plan="tenantPlan" />
      </section>

      <!-- System prompt modal -->
      <Modal
        :open="promptOpen"
        :title="$t('admin.bot.systemPrompt')"
        :subtitle="$t('admin.bot.systemPromptModalSubtitle')"
        size="xl"
        @close="promptOpen = false"
      >
        <pre class="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed">{{ bot.systemPrompt }}</pre>

        <template #footer>
          <div class="flex items-center justify-between gap-2">
            <NuxtLink
              :to="`/admin/bots/${bot.id}/config`"
              class="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
            >
              {{ $t('admin.bot.editSystemPrompt') }}
            </NuxtLink>
            <button
              type="button"
              class="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
              @click="promptOpen = false"
            >
              {{ $t('common.close') }}
            </button>
          </div>
        </template>
      </Modal>

      <!-- Webhook credentials modal -->
      <Modal
        :open="webhookOpen"
        :title="$t('admin.bot.webhookModalTitle')"
        :subtitle="$t('admin.bot.webhookModalSubtitle')"
        size="lg"
        @close="webhookOpen = false"
      >
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between">
              <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('admin.bot.callbackUrl') }}</p>
              <CopyButton :value="callbackUrl" :label="$t('common.copy')" />
            </div>
            <code class="mt-1 block text-xs font-mono text-slate-700 break-all select-all bg-slate-50/80 ring-1 ring-slate-200/70 rounded-lg px-3 py-2">
              {{ callbackUrl }}
            </code>
          </div>
          <div>
            <div class="flex items-center justify-between">
              <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('admin.bot.verifyToken') }}</p>
              <CopyButton :value="bot.webhookVerifyToken" :label="$t('common.copy')" />
            </div>
            <code class="mt-1 block text-xs font-mono text-slate-700 break-all select-all bg-slate-50/80 ring-1 ring-slate-200/70 rounded-lg px-3 py-2">
              {{ bot.webhookVerifyToken }}
            </code>
          </div>
          <p class="text-xs text-slate-500">
            {{ $t('admin.bot.pasteInMeta') }}
          </p>
        </div>

        <template #footer>
          <div class="flex items-center justify-end">
            <button
              type="button"
              class="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
              @click="webhookOpen = false"
            >
              {{ $t('common.close') }}
            </button>
          </div>
        </template>
      </Modal>

      <ConfirmDialog
        :open="confirmingDelete"
        :title="$t('admin.bot.deleteConfirmTitle', { name: bot.name })"
        :message="$t('admin.bot.deleteConfirmMessage')"
        :require-typed="bot.name"
        :require-typed-label="$t('admin.bot.deleteConfirmTyped')"
        :confirm-label="$t('admin.bot.deleteConfirmAction')"
        @cancel="confirmingDelete = false"
        @confirm="onConfirmDelete"
      />
    </template>
  </div>
</template>
