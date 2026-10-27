<script setup lang="ts">
import SuperadminBotOpenRouterKeyCard from '~/components/superadmin/BotOpenRouterKeyCard.vue'
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { CompanyDetail, Plan } from '~/types/company'
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
const companies = useCompanies()

const company = ref<CompanyDetail | null>(null)
const companyPlan = computed<Plan>(() => company.value?.plan ?? 'BASIC')

const callbackUrl = computed(() => `${config.public.apiBaseUrl}/webhooks/whatsapp/${botId}`)

const bot = ref<Bot | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const confirmingDelete = ref(false)

type TabId = 'openrouter' | 'metrics' | 'documents' | 'integrations' | 'templates'
const VALID_TABS: readonly TabId[] = ['openrouter', 'metrics', 'documents', 'integrations', 'templates']

const activeTab = computed<TabId>(() => {
  const raw = route.query.tab
  const value = Array.isArray(raw) ? raw[0] : raw
  return VALID_TABS.includes(value as TabId) ? (value as TabId) : 'openrouter'
})

async function setTab(tab: TabId): Promise<void> {
  await router.replace({ query: { ...route.query, tab } })
}

const renameOpen = ref(false)
const renameValue = ref('')
const renameSaving = ref(false)

function openRename(): void {
  renameValue.value = bot.value?.name ?? ''
  renameOpen.value = true
}

async function onRenameSubmit(): Promise<void> {
  if (!bot.value) return
  const trimmed = renameValue.value.trim()
  if (trimmed.length < 2 || trimmed.length > 80) return
  if (trimmed === bot.value.name) {
    renameOpen.value = false
    return
  }
  renameSaving.value = true
  try {
    const updated = await bots.update(bot.value.id, { name: trimmed })
    bot.value = { ...bot.value, name: updated.name }
    renameOpen.value = false
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    renameSaving.value = false
  }
}

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
    const [b, c] = await Promise.all([bots.get(botId), companies.get(tenantId)])
    bot.value = b
    company.value = c
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
    <SuperadminBackLink :to="`/superadmin/companies/${tenantId}`" :label="$t('superadmin.companyBotDetail.back')" />

    <p v-if="error" class="mt-4 rounded-2xl border border-danger-800 bg-danger-950/80 p-3 text-sm text-danger-300">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <template v-else-if="bot">
      <!-- Hero header card: identity + action toolbar unified -->
      <article class="mt-4 overflow-hidden rounded-3xl bg-ink-surface/70 ring-1 ring-line backdrop-blur-xl shadow-halo-glow">
        <div class="relative p-6 sm:p-7">
          <div class="absolute inset-x-0 top-0 h-32 bg-home-mesh-glow opacity-40 pointer-events-none" aria-hidden="true" />
          <div class="relative flex items-start gap-5 min-w-0">
            <div class="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-ink-tealDeep font-display font-bold text-2xl ring-1 ring-halo-line shadow-halo-glow-lg">
              {{ bot.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] uppercase tracking-[0.18em] font-semibold text-halo mb-1">{{ $t('superadmin.companyBotDetail.kicker') }}</p>
              <h1 class="text-3xl font-display font-semibold text-pearl tracking-tight flex items-center gap-2.5 flex-wrap">
                <span class="truncate">{{ bot.name }}</span>
                <button
                  type="button"
                  class="inline-flex size-7 items-center justify-center rounded-lg text-mist hover:text-pearl hover:bg-ink-card/60 transition"
                  :title="$t('admin.bot.renameTitle')"
                  :aria-label="$t('admin.bot.renameTitle')"
                  @click="openRename"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
                <BotStatusBadge :is-active="bot.isActive" />
              </h1>
              <p v-if="bot.description" class="text-mist mt-2 text-sm leading-relaxed max-w-2xl">{{ bot.description }}</p>
            </div>
            <button
              type="button"
              class="shrink-0 inline-flex size-9 items-center justify-center rounded-xl border border-danger-500/30 bg-danger-500/5 text-danger-300 hover:bg-danger-500/15 hover:border-danger-500/60 hover:text-danger-100 transition"
              :title="$t('superadmin.companyBotDetail.deleteBot')"
              :aria-label="$t('superadmin.companyBotDetail.deleteBot')"
              @click="confirmingDelete = true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        <div
          role="toolbar"
          :aria-label="$t('superadmin.companyBotDetail.actionsLabel')"
          class="flex flex-wrap items-center gap-1.5 px-5 sm:px-6 py-3 border-t border-line bg-ink-card/40"
        >
          <span class="inline-flex items-center gap-1.5 pr-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-mist">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            {{ $t('superadmin.companyBotDetail.actionsLabel') }}
          </span>
          <span class="h-6 w-px bg-line" aria-hidden="true" />

          <NuxtLink
            :to="`/superadmin/companies/${tenantId}/bots/${bot.id}/services`"
            class="inline-flex items-center gap-1.5 h-9 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 text-sm font-medium text-sky-200 hover:bg-sky-500/20 hover:border-sky-500/50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
              <path d="M20 7h-7" />
              <path d="M14 17H5" />
              <circle cx="17" cy="17" r="3" />
              <circle cx="7" cy="7" r="3" />
            </svg>
            {{ $t('admin.bot.servicesLink') }}
          </NuxtLink>
          <NuxtLink
            :to="`/superadmin/companies/${tenantId}/bots/${bot.id}/calendar`"
            class="inline-flex items-center gap-1.5 h-9 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 text-sm font-medium text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {{ $t('admin.calendarView.title') }}
          </NuxtLink>
          <NuxtLink
            :to="`/superadmin/companies/${tenantId}/bots/${bot.id}/test`"
            class="inline-flex items-center gap-1.5 h-9 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-3.5" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {{ $t('superadmin.testBench.title') }}
          </NuxtLink>
          <NuxtLink
            :to="`/superadmin/companies/${tenantId}/bots/${bot.id}/edit`"
            class="inline-flex items-center gap-1.5 h-9 rounded-xl border border-success-500/40 bg-success-500/10 px-3 text-sm font-medium text-success-200 hover:bg-success-500/20 hover:border-success-500/60 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-3.5" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {{ $t('superadmin.companyBotDetail.metaConfig') }}
          </NuxtLink>

          <span class="h-6 w-px bg-line" aria-hidden="true" />

          <NuxtLink
            :to="`/superadmin/companies/${tenantId}/bots/${bot.id}/config`"
            class="inline-flex items-center gap-1.5 h-9 rounded-xl bg-brand-gradient text-ink-tealDeep px-4 text-sm font-semibold shadow-halo-glow hover:brightness-110 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            {{ $t('superadmin.companyBotDetail.configureAgent') }}
          </NuxtLink>
        </div>
      </article>

      <!-- Tab bar -->
      <nav class="mt-6 sticky top-16 z-20 overflow-x-auto">
        <div class="inline-flex min-w-full gap-1 p-1.5 rounded-2xl bg-ink-surface/80 ring-1 ring-line backdrop-blur-xl shadow-halo-glow">
          <button
            type="button"
            class="group relative flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
            :class="activeTab === 'openrouter' ? 'bg-brand-gradient text-ink-tealDeep shadow-halo-glow-lg' : 'text-mist hover:text-pearl hover:bg-ink-card/50'"
            @click="setTab('openrouter')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M15 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L10 7m0 0l3 3L16 7l-3-3M8 10l5-5" />
              <circle cx="17" cy="7" r="1" fill="currentColor" />
            </svg>
            {{ $t('superadmin.companyBotDetail.tabs.openrouter') }}
          </button>
          <button
            type="button"
            class="group relative flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
            :class="activeTab === 'metrics' ? 'bg-brand-gradient text-ink-tealDeep shadow-halo-glow-lg' : 'text-mist hover:text-pearl hover:bg-ink-card/50'"
            @click="setTab('metrics')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            {{ $t('superadmin.companyBotDetail.tabs.metrics') }}
          </button>
          <button
            type="button"
            class="group relative flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
            :class="activeTab === 'documents' ? 'bg-brand-gradient text-ink-tealDeep shadow-halo-glow-lg' : 'text-mist hover:text-pearl hover:bg-ink-card/50'"
            @click="setTab('documents')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {{ $t('superadmin.companyBotDetail.tabs.documents') }}
          </button>
          <button
            type="button"
            class="group relative flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
            :class="activeTab === 'integrations' ? 'bg-brand-gradient text-ink-tealDeep shadow-halo-glow-lg' : 'text-mist hover:text-pearl hover:bg-ink-card/50'"
            @click="setTab('integrations')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {{ $t('superadmin.companyBotDetail.tabs.integrations') }}
          </button>
          <button
            type="button"
            class="group relative flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
            :class="activeTab === 'templates' ? 'bg-brand-gradient text-ink-tealDeep shadow-halo-glow-lg' : 'text-mist hover:text-pearl hover:bg-ink-card/50'"
            @click="setTab('templates')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <rect x="4" y="3" width="14" height="16" rx="2" />
              <path d="M20 7v12a2 2 0 0 1-2 2H8" />
              <line x1="8" y1="8" x2="14" y2="8" />
              <line x1="8" y1="12" x2="14" y2="12" />
              <line x1="8" y1="16" x2="11" y2="16" />
            </svg>
            {{ $t('superadmin.companyBotDetail.tabs.templates') }}
          </button>
        </div>
      </nav>

      <Transition
        mode="out-in"
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div :key="activeTab">
      <!-- Activity dashboard: day / week / month, always visible together. -->
      <section v-if="activeTab === 'metrics'" id="activity" class="mt-6">
        <div class="flex items-end justify-between gap-3 flex-wrap mb-3">
          <div>
            <h2 class="text-base font-semibold text-pearl">{{ $t('superadmin.companyBotDetail.activityTitle') }}</h2>
            <p class="text-xs text-mist mt-0.5">{{ $t('superadmin.companyBotDetail.activitySubtitle') }}</p>
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

      <!-- Overview: WhatsApp summary -->
      <section v-if="activeTab === 'integrations'" id="overview" class="mt-6">
        <article class="rounded-3xl bg-ink-surface/70 backdrop-blur-xl ring-1 ring-line shadow-halo-glow p-6">
          <header class="flex items-start gap-3 mb-4">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-500/15 ring-1 ring-success-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-success-300" aria-hidden="true">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-pearl">{{ $t('superadmin.companyBotDetail.whatsapp') }}</h2>
              <p class="text-xs text-mist mt-0.5">Meta Cloud API</p>
            </div>
          </header>
          <dl class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="rounded-2xl bg-ink-card/70 ring-1 ring-line p-3">
              <dt class="text-[10px] uppercase tracking-wider font-semibold text-mist mb-1">{{ $t('admin.bot.whatsappPhoneId') }}</dt>
              <dd class="text-pearl font-mono text-xs break-all">{{ bot.whatsappPhoneId }}</dd>
            </div>
            <div class="rounded-2xl bg-ink-card/70 ring-1 ring-line p-3">
              <dt class="text-[10px] uppercase tracking-wider font-semibold text-mist mb-1">{{ $t('admin.bot.whatsappWabaId') }}</dt>
              <dd class="text-pearl font-mono text-xs break-all">{{ bot.whatsappBusinessAccountId ?? '—' }}</dd>
            </div>
            <div class="rounded-2xl bg-ink-card/70 ring-1 ring-line p-3">
              <dt class="text-[10px] uppercase tracking-wider font-semibold text-mist mb-1">{{ $t('admin.bot.whatsappAppSecret') }}</dt>
              <dd class="text-pearl text-sm inline-flex items-center gap-1.5">
                <span class="inline-block size-1.5 rounded-full" :class="bot.hasAppSecret ? 'bg-success-400 shadow-halo-glow' : 'bg-danger-400'" />
                {{ bot.hasAppSecret ? $t('admin.bot.whatsappAppSecretConfigured') : $t('admin.bot.whatsappAppSecretMissing') }}
              </dd>
            </div>
          </dl>

          <div class="mt-5 pt-5 border-t border-line space-y-3">
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <p class="text-[10px] uppercase tracking-wider font-semibold text-mist">{{ $t('admin.bot.callbackUrl') }}</p>
                <CopyButton :value="callbackUrl" tone="dark" :label="$t('common.copy')" />
              </div>
              <code class="block text-[11px] font-mono text-pearl break-all select-all bg-ink-card/80 ring-1 ring-line rounded-xl px-3 py-2">
                {{ callbackUrl }}
              </code>
            </div>
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <p class="text-[10px] uppercase tracking-wider font-semibold text-mist">{{ $t('admin.bot.verifyToken') }}</p>
                <CopyButton :value="bot.webhookVerifyToken" tone="dark" :label="$t('common.copy')" />
              </div>
              <code class="block text-[11px] font-mono text-pearl break-all select-all bg-ink-card/80 ring-1 ring-line rounded-xl px-3 py-2">
                {{ bot.webhookVerifyToken }}
              </code>
            </div>
            <p class="text-[11px] text-mist leading-relaxed">
              {{ $t('admin.bot.pasteInMeta') }}
            </p>
          </div>
        </article>
      </section>

      <!-- Documents (knowledge base) -->
      <section v-if="activeTab === 'documents'" id="documents" class="mt-6">
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
            <h2 class="text-base font-semibold text-pearl">{{ $t('admin.bot.sections.documents') }}</h2>
            <p class="text-xs text-mist mt-0.5">{{ $t('admin.bot.sections.documentsDesc') }}</p>
          </div>
        </header>
        <BotDocumentsCoverageCard :bot-id="bot.id" :tenant-id="tenantId" class="mb-4" />
        <BotDocumentsCard :bot-id="bot.id" :tenant-id="tenantId" />
      </section>

      <!-- Multimedia (sendable resources) -->
      <section v-if="activeTab === 'documents'" id="media" class="mt-6">
        <header class="flex items-start gap-3 mb-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-indigo-300" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-pearl">{{ $t('superadmin.bot.sections.multimedia') }}</h2>
            <p class="text-xs text-mist mt-0.5">{{ $t('superadmin.bot.sections.multimediaDesc') }}</p>
          </div>
        </header>
        <BotMediaAssetsCard :bot-id="bot.id" :tenant-id="tenantId" />
      </section>

      <!-- Google Calendar -->
      <section v-if="activeTab === 'integrations'" id="calendar" class="mt-6">
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
            <h2 class="text-base font-semibold text-pearl">{{ $t('admin.bot.sections.calendar') }}</h2>
            <p class="text-xs text-mist mt-0.5">{{ $t('admin.bot.sections.calendarDesc') }}</p>
          </div>
        </header>
        <BotCalendarCard :bot-id="bot.id" :tenant-id="tenantId" />
      </section>

      <!-- CRM (lead push on escalation) -->
      <section v-if="activeTab === 'integrations'" id="crm" class="mt-6">
        <header class="flex items-start gap-3 mb-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-violet-300" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-pearl">{{ $t('admin.bot.sections.crm') }}</h2>
            <p class="text-xs text-mist mt-0.5">{{ $t('admin.bot.sections.crmDesc') }}</p>
          </div>
        </header>
        <BotCrmCard :bot-id="bot.id" :plan="companyPlan" :tenant-id="tenantId" />
      </section>

      <!-- OpenRouter Sub-Key (super-admin only) — hero panel -->
      <section v-if="activeTab === 'openrouter'" id="openrouter-key" class="mt-6">
        <article class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-surface/90 via-ink-card/60 to-halo-wash ring-1 ring-halo-line backdrop-blur-xl p-6 sm:p-8 shadow-halo-glow-lg">
          <div class="absolute inset-0 bg-home-mesh-glow opacity-40 pointer-events-none" aria-hidden="true" />
          <header class="relative flex items-start gap-4 mb-6">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-ink-tealDeep ring-1 ring-halo-line shadow-halo-glow">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="size-6" aria-hidden="true">
                <circle cx="7" cy="15" r="4" />
                <path d="M10.5 12.5l10-10" />
                <path d="M18 5l3 3" />
                <path d="M15 8l3 3" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] uppercase tracking-[0.18em] font-semibold text-halo mb-1">{{ $t('superadmin.companyBotDetail.tabs.openrouter') }}</p>
              <h2 class="text-2xl font-display font-semibold text-pearl tracking-tight">{{ $t('superadmin.openrouterKey.cardTitle') }}</h2>
              <p class="text-sm text-mist mt-1.5 leading-relaxed">{{ $t('superadmin.openrouterKey.cardDescription') }}</p>
            </div>
          </header>
          <div class="relative">
            <SuperadminBotOpenRouterKeyCard :bot-id="bot.id" :tenant-id="tenantId" />
          </div>
        </article>
      </section>

      <!-- WhatsApp Templates -->
      <section v-if="activeTab === 'templates'" id="templates" class="mt-6">
        <header class="flex items-start gap-3 mb-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-emerald-300" aria-hidden="true">
              <rect x="4" y="3" width="14" height="16" rx="2" />
              <path d="M20 7v12a2 2 0 0 1-2 2H8" />
              <line x1="8" y1="8" x2="14" y2="8" />
              <line x1="8" y1="12" x2="14" y2="12" />
              <line x1="8" y1="16" x2="11" y2="16" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-pearl">{{ $t('superadmin.bot.sections.templates') }}</h2>
            <p class="text-xs text-mist mt-0.5">{{ $t('superadmin.bot.sections.templatesDesc') }}</p>
          </div>
        </header>
        <BotTemplatesCard :bot-id="bot.id" :tenant-id="tenantId" />
      </section>
        </div>
      </Transition>

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

      <Modal
        :open="renameOpen"
        :title="$t('admin.bot.renameTitle')"
        size="sm"
        @close="renameOpen = false"
      >
        <form class="space-y-4" @submit.prevent="onRenameSubmit">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {{ $t('admin.botCreate.section.nameLabel') }}
            </label>
            <input
              v-model="renameValue"
              type="text"
              minlength="2"
              maxlength="80"
              autofocus
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              class="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              @click="renameOpen = false"
            >
              {{ $t('common.cancel') }}
            </button>
            <button
              type="submit"
              class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              :disabled="renameSaving || renameValue.trim().length < 2"
            >
              {{ renameSaving ? $t('common.saving') : $t('common.save') }}
            </button>
          </div>
        </form>
      </Modal>
    </template>
  </div>
</template>
