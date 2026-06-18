<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { BotConfig } from '~/types/bot'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
const route = useRoute()
const tenantId = route.params.id as string
const botId = route.params.botId as string
const bots = useBots(tenantId)

const form = reactive({
  description: '' as string,
  tone: '' as string,
  personality: '' as string,
  welcomeMessage: '' as string,
  responseRules: '' as string,
  fallbackMessage: '' as string,
  humanDelayMs: 0,
  followupInactivityEnabled: true,
  followupInactivityHours: 24,
  followupInactivityMaxCount: 3,
  aiProvider: 'anthropic',
  aiModel: 'claude-sonnet-4-6',
  isActive: true,
})

const TONE_PRESETS = computed(() => [
  t('admin.botConfig.tonePresets.professional'),
  t('admin.botConfig.tonePresets.friendly'),
  t('admin.botConfig.tonePresets.formal'),
  t('admin.botConfig.tonePresets.casual'),
  t('admin.botConfig.tonePresets.playful'),
  t('admin.botConfig.tonePresets.empathetic'),
])
const DELAY_PRESETS = computed<{ label: string, value: number }[]>(() => [
  { label: t('admin.botConfig.modelTiming.delayOff'), value: 0 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
])
const PROVIDERS: { value: string, label: string, models: string[] }[] = [
  {
    value: 'anthropic',
    label: 'Anthropic',
    models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  },
  {
    value: 'openai',
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
]
const availableModels = computed(() => {
  const provider = PROVIDERS.find(p => p.value === form.aiProvider)
  return provider?.models ?? []
})

const botName = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

function hydrate(cfg: BotConfig): void {
  botName.value = cfg.name
  form.description = cfg.description ?? ''
  form.tone = cfg.tone ?? ''
  form.personality = cfg.personality ?? ''
  form.welcomeMessage = cfg.welcomeMessage ?? ''
  form.responseRules = cfg.responseRules ?? ''
  form.fallbackMessage = cfg.fallbackMessage ?? ''
  form.humanDelayMs = cfg.humanDelayMs
  form.followupInactivityEnabled = cfg.followupInactivityEnabled
  form.followupInactivityHours = cfg.followupInactivityHours
  form.followupInactivityMaxCount = cfg.followupInactivityMaxCount
  form.aiProvider = cfg.aiProvider
  form.aiModel = cfg.aiModel
  form.isActive = cfg.isActive
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const cfg = await bots.getConfig(botId)
    hydrate(cfg)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

function emptyToNull(v: string): string | null {
  return v.trim() === '' ? null : v
}

async function onSubmit(): Promise<void> {
  saving.value = true
  error.value = null
  success.value = null
  try {
    const updated = await bots.updateConfig(botId, {
      description: emptyToNull(form.description),
      tone: emptyToNull(form.tone),
      personality: emptyToNull(form.personality),
      welcomeMessage: emptyToNull(form.welcomeMessage),
      responseRules: emptyToNull(form.responseRules),
      fallbackMessage: emptyToNull(form.fallbackMessage),
      humanDelayMs: form.humanDelayMs,
      followupInactivityEnabled: form.followupInactivityEnabled,
      followupInactivityHours: form.followupInactivityHours,
      followupInactivityMaxCount: form.followupInactivityMaxCount,
      aiProvider: form.aiProvider,
      aiModel: form.aiModel,
      isActive: form.isActive,
    })
    success.value = t('admin.botConfig.successMessage')
    hydrate(updated)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

await load()
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${tenantId}/bots/${botId}`" class="text-sm text-slate-400 hover:text-slate-200">{{ $t('admin.botConfig.back') }}</NuxtLink>
    <div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
          <path d="M12 2a3 3 0 0 1 3 3v1.5a4.5 4.5 0 0 1 4.5 4.5V13a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4v-2a4.5 4.5 0 0 1 4.5-4.5V5a3 3 0 0 1 3-3z" />
          <line x1="9" y1="13" x2="9" y2="13" />
          <line x1="15" y1="13" x2="15" y2="13" />
        </svg>
        {{ $t('admin.botConfig.agentBadge') }}
      </span>
      <h1 class="text-2xl font-semibold text-slate-100 tracking-tight">{{ $t('admin.botConfig.title') }}</h1>
      <span v-if="botName" class="text-slate-400 text-base">— {{ botName }}</span>
    </div>
    <p class="text-slate-400 text-sm mt-2 max-w-3xl">
      {{ $t('admin.botConfig.subtitleBefore') }}<strong class="font-medium text-slate-200">{{ $t('admin.botConfig.subtitleEmph') }}</strong>{{ $t('admin.botConfig.subtitleAfter') }}
    </p>

    <!-- Scope helper: clarify what this page is vs. the WhatsApp integration. -->
    <div class="mt-4 max-w-3xl rounded-2xl bg-indigo-500/5 ring-1 ring-indigo-500/20 px-4 py-3 text-sm text-slate-300 flex items-start gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 mt-0.5 shrink-0 text-indigo-300" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <p class="leading-relaxed">
        {{ $t('admin.botConfig.scopeNoteBefore') }}<strong class="font-semibold text-slate-100">{{ $t('admin.botConfig.scopeNoteEmph') }}</strong>{{ $t('admin.botConfig.scopeNoteMiddle') }}
        <NuxtLink :to="`/superadmin/companies/${tenantId}/bots/${botId}/edit`" class="font-semibold text-indigo-300 underline-offset-2 hover:underline">{{ $t('admin.botConfig.scopeNoteLink') }}</NuxtLink>{{ $t('admin.botConfig.scopeNoteAfter') }}
      </p>
    </div>

    <p v-if="error" class="mt-4 max-w-3xl rounded-2xl border border-danger-800 bg-danger-950/80 p-3 text-sm text-danger-300">
      {{ error }}
    </p>
    <p v-if="success" class="mt-4 max-w-3xl rounded-2xl border border-emerald-800 bg-emerald-950/80 p-3 text-sm text-emerald-300">
      {{ success }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <form v-else class="mt-6 max-w-3xl space-y-6" @submit.prevent="onSubmit">
      <!-- ────────────────────────────────────────────────────────────────
           SECTION 1 — AI behavior (what's sent to the model)
      ───────────────────────────────────────────────────────────────── -->
      <section class="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6 space-y-5">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-indigo-300" aria-hidden="true">
              <path d="M12 2a3 3 0 0 1 3 3v1.5a4.5 4.5 0 0 1 4.5 4.5V13a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4v-2a4.5 4.5 0 0 1 4.5-4.5V5a3 3 0 0 1 3-3z" />
              <line x1="9" y1="13" x2="9" y2="13" />
              <line x1="15" y1="13" x2="15" y2="13" />
              <path d="M9 21v-4M15 21v-4" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-100">{{ $t('admin.botConfig.aiBehavior.title') }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.botConfig.aiBehavior.subtitle') }}</p>
          </div>
        </header>

        <div>
          <label class="block text-sm font-medium text-slate-300">{{ $t('admin.botConfig.aiBehavior.tone') }}</label>
          <input
            v-model="form.tone"
            type="text"
            maxlength="40"
            list="tone-presets"
            :placeholder="$t('admin.botConfig.aiBehavior.tonePlaceholder')"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
          <datalist id="tone-presets">
            <option v-for="tone in TONE_PRESETS" :key="tone" :value="tone" />
          </datalist>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <button
              v-for="tone in TONE_PRESETS"
              :key="tone"
              type="button"
              class="rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition"
              :class="form.tone === tone
                ? 'bg-indigo-500 text-white ring-indigo-500'
                : 'bg-slate-900 text-slate-300 ring-slate-700 hover:ring-slate-600'"
              @click="form.tone = tone"
            >
              {{ tone }}
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300">{{ $t('admin.botConfig.aiBehavior.personality') }}</label>
          <textarea
            v-model="form.personality"
            rows="3"
            maxlength="4000"
            :placeholder="$t('admin.botConfig.aiBehavior.personalityPlaceholder')"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">{{ form.personality.length }}/4000</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300">{{ $t('admin.botConfig.aiBehavior.responseRules') }}</label>
          <textarea
            v-model="form.responseRules"
            rows="4"
            maxlength="4000"
            :placeholder="$t('admin.botConfig.aiBehavior.responseRulesPlaceholder')"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">{{ $t('admin.botConfig.aiBehavior.responseRulesHelp') }} {{ form.responseRules.length }}/4000</p>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           SECTION 2 — Conversation messages
      ───────────────────────────────────────────────────────────────── -->
      <section class="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6 space-y-5">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-emerald-400" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-100">{{ $t('admin.botConfig.messages.title') }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.botConfig.messages.subtitle') }}</p>
          </div>
        </header>

        <div>
          <label class="block text-sm font-medium text-slate-300">{{ $t('admin.botConfig.messages.welcome') }}</label>
          <textarea
            v-model="form.welcomeMessage"
            rows="2"
            maxlength="2000"
            :placeholder="$t('admin.botConfig.messages.welcomePlaceholder')"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">{{ $t('admin.botConfig.messages.welcomeHelp') }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300">{{ $t('admin.botConfig.messages.fallback') }}</label>
          <textarea
            v-model="form.fallbackMessage"
            rows="2"
            maxlength="2000"
            :placeholder="$t('admin.botConfig.messages.fallbackPlaceholder')"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">{{ $t('admin.botConfig.messages.fallbackHelp') }}</p>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           SECTION 3 — Model & timing
      ───────────────────────────────────────────────────────────────── -->
      <section class="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6 space-y-5">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-amber-300" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-100">{{ $t('admin.botConfig.modelTiming.title') }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.botConfig.modelTiming.subtitle') }}</p>
          </div>
        </header>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-300">{{ $t('admin.botConfig.modelTiming.provider') }}</label>
            <select
              v-model="form.aiProvider"
              class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option v-for="p in PROVIDERS" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300">{{ $t('admin.botConfig.modelTiming.model') }}</label>
            <input
              v-model="form.aiModel"
              type="text"
              maxlength="80"
              list="model-presets"
              class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
            <datalist id="model-presets">
              <option v-for="m in availableModels" :key="m" :value="m" />
            </datalist>
            <p class="mt-1 text-xs text-slate-500">{{ $t('admin.botConfig.modelTiming.modelHelp') }}</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300">{{ $t('admin.botConfig.modelTiming.humanDelay') }}</label>
          <p class="mt-0.5 text-xs text-slate-500">{{ $t('admin.botConfig.modelTiming.humanDelayHelp') }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <button
              v-for="preset in DELAY_PRESETS"
              :key="preset.value"
              type="button"
              class="rounded-full px-3 py-1 text-xs font-medium ring-1 transition"
              :class="form.humanDelayMs === preset.value
                ? 'bg-indigo-500 text-white ring-indigo-500'
                : 'bg-slate-900 text-slate-300 ring-slate-700 hover:ring-slate-600'"
              @click="form.humanDelayMs = preset.value"
            >
              {{ preset.label }}
            </button>
            <div class="ml-2 flex items-center gap-2">
              <input
                v-model.number="form.humanDelayMs"
                type="number"
                min="0"
                max="30000"
                step="100"
                class="w-28 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
              <span class="text-xs text-slate-500">{{ $t('admin.botConfig.modelTiming.ms') }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           SECTION 4 — Internal metadata + status
      ───────────────────────────────────────────────────────────────── -->
      <section class="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6 space-y-5">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 ring-1 ring-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-slate-400" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-100">{{ $t('admin.botConfig.internal.title') }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.botConfig.internal.subtitle') }}</p>
          </div>
        </header>

        <div>
          <label class="block text-sm font-medium text-slate-300">{{ $t('admin.botConfig.internal.description') }}</label>
          <input
            v-model="form.description"
            type="text"
            maxlength="280"
            :placeholder="$t('admin.botConfig.internal.descriptionPlaceholder')"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
        </div>

        <label class="flex items-center justify-between rounded-xl bg-slate-950 ring-1 ring-slate-800 px-4 py-3">
          <div>
            <p class="text-sm font-medium text-slate-100">{{ $t('admin.botConfig.internal.botActive') }}</p>
            <p class="text-xs text-slate-500">{{ $t('admin.botConfig.internal.botActiveHelp') }}</p>
          </div>
          <input v-model="form.isActive" type="checkbox" class="size-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500">
        </label>
      </section>

      <!-- Knowledge: documents the bot uses as RAG context. -->
      <BotDocumentsCard :bot-id="botId" :tenant-id="tenantId" />

      <!-- Google Calendar integration. -->
      <BotCalendarCard :bot-id="botId" :tenant-id="tenantId" />

      <!-- Sticky-feel action bar -->
      <div class="sticky bottom-0 -mx-1 pb-1 pt-3 bg-gradient-to-t from-slate-950/90 to-slate-950/0">
        <div class="flex items-center justify-end gap-2">
          <NuxtLink
            :to="`/superadmin/companies/${tenantId}/bots/${botId}`"
            class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
          >
            {{ $t('common.cancel') }}
          </NuxtLink>
          <button
            type="submit"
            class="rounded-xl bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition"
            :disabled="saving"
          >
            {{ saving ? $t('common.saving') : $t('admin.botConfig.saveConfig') }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
