<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { BotConfig } from '~/types/bot'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

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

const TONE_PRESETS = ['Professional', 'Friendly', 'Formal', 'Casual', 'Playful', 'Empathetic']
const DELAY_PRESETS: { label: string, value: number }[] = [
  { label: 'Off', value: 0 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
]
const FOLLOWUP_HOUR_PRESETS: { label: string, value: number }[] = [
  { label: '12 h', value: 12 },
  { label: '24 h', value: 24 },
  { label: '48 h', value: 48 },
  { label: '72 h', value: 72 },
]
const FOLLOWUP_ATTEMPT_PRESETS: number[] = [1, 2, 3, 5]
const followupSummary = computed(() => {
  if (!form.followupInactivityEnabled) {
    return 'Desactivado: si el cliente deja de responder, el bot no insiste.'
  }
  const h = form.followupInactivityHours
  const n = form.followupInactivityMaxCount
  const total = h * n
  const totalLabel = total >= 24 ? `${Math.round((total / 24) * 10) / 10} días` : `${total} h`
  return `Tras ${h} h sin respuesta, el bot retoma con contexto. Hasta ${n} intento${n === 1 ? '' : 's'} (~${totalLabel} en total).`
})
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
    success.value = 'Configuration saved'
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
    <NuxtLink :to="`/superadmin/companies/${tenantId}/bots/${botId}`" class="text-sm text-slate-400 hover:text-slate-200">← Back to bot</NuxtLink>
    <div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
          <path d="M12 2a3 3 0 0 1 3 3v1.5a4.5 4.5 0 0 1 4.5 4.5V13a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4v-2a4.5 4.5 0 0 1 4.5-4.5V5a3 3 0 0 1 3-3z" />
          <line x1="9" y1="13" x2="9" y2="13" />
          <line x1="15" y1="13" x2="15" y2="13" />
        </svg>
        Agent
      </span>
      <h1 class="text-2xl font-semibold text-slate-100 tracking-tight">Agent configuration</h1>
      <span v-if="botName" class="text-slate-400 text-base">— {{ botName }}</span>
    </div>
    <p class="text-slate-400 text-sm mt-2 max-w-3xl">
      Define how the AI agent <strong class="font-medium text-slate-200">thinks and speaks</strong>: tone, personality, response rules, welcome and fallback messages, and the underlying model.
    </p>

    <!-- Scope helper: clarify what this page is vs. the WhatsApp integration. -->
    <div class="mt-4 max-w-3xl rounded-2xl bg-indigo-500/5 ring-1 ring-indigo-500/20 px-4 py-3 text-sm text-slate-300 flex items-start gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 mt-0.5 shrink-0 text-indigo-300" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <p class="leading-relaxed">
        This page is <strong class="font-semibold text-slate-100">only</strong> the agent's brain — what it says and how it sounds.
        For WhatsApp Business credentials (phone ID, access token, webhook), use
        <NuxtLink :to="`/superadmin/companies/${tenantId}/bots/${botId}/edit`" class="font-semibold text-indigo-300 underline-offset-2 hover:underline">Edit bot →</NuxtLink>.
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
            <h2 class="text-base font-semibold text-slate-100">AI behavior</h2>
            <p class="text-xs text-slate-500 mt-0.5">Sent to the model on every conversation — shapes how it speaks.</p>
          </div>
        </header>

        <div>
          <label class="block text-sm font-medium text-slate-300">Tone</label>
          <input
            v-model="form.tone"
            type="text"
            maxlength="40"
            list="tone-presets"
            placeholder="e.g. Professional, Friendly"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
          <datalist id="tone-presets">
            <option v-for="t in TONE_PRESETS" :key="t" :value="t" />
          </datalist>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <button
              v-for="t in TONE_PRESETS"
              :key="t"
              type="button"
              class="rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition"
              :class="form.tone === t
                ? 'bg-indigo-500 text-white ring-indigo-500'
                : 'bg-slate-900 text-slate-300 ring-slate-700 hover:ring-slate-600'"
              @click="form.tone = t"
            >
              {{ t }}
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300">Personality</label>
          <textarea
            v-model="form.personality"
            rows="3"
            maxlength="4000"
            placeholder="Describe traits: empathetic, concise, uses emojis sparingly…"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">{{ form.personality.length }}/4000</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300">Response rules</label>
          <textarea
            v-model="form.responseRules"
            rows="4"
            maxlength="4000"
            placeholder="Always greet by name. Never quote prices without confirming. Escalate to a human if customer is upset…"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">Explicit do's and don'ts. {{ form.responseRules.length }}/4000</p>
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
            <h2 class="text-base font-semibold text-slate-100">Conversation messages</h2>
            <p class="text-xs text-slate-500 mt-0.5">Fixed copy used at key moments of the chat.</p>
          </div>
        </header>

        <div>
          <label class="block text-sm font-medium text-slate-300">Welcome message</label>
          <textarea
            v-model="form.welcomeMessage"
            rows="2"
            maxlength="2000"
            placeholder="Hi! I'm Kaibot, your assistant. How can I help today?"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">Sent on the first message of a new conversation.</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300">Fallback message</label>
          <textarea
            v-model="form.fallbackMessage"
            rows="2"
            maxlength="2000"
            placeholder="I'm not sure I can help with that. Want me to connect you with a person?"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">Sent when the bot doesn't know how to answer.</p>
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
            <h2 class="text-base font-semibold text-slate-100">Model &amp; timing</h2>
            <p class="text-xs text-slate-500 mt-0.5">Which AI generates the replies and how fast they're sent.</p>
          </div>
        </header>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-300">Provider</label>
            <select
              v-model="form.aiProvider"
              class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option v-for="p in PROVIDERS" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300">Model</label>
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
            <p class="mt-1 text-xs text-slate-500">Pick a suggestion or type a custom model ID.</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300">Human delay</label>
          <p class="mt-0.5 text-xs text-slate-500">Pauses before each reply to feel more human. Pick a preset or set a custom value.</p>
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
              <span class="text-xs text-slate-500">ms</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           SECTION 4 — Follow-up por inactividad
      ───────────────────────────────────────────────────────────────── -->
      <section class="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6 space-y-5">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-amber-300" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-100">Follow-up por inactividad</h2>
            <p class="text-xs text-slate-500 mt-0.5">Cuando el cliente deja de responder, el bot retoma la conversación con contexto del último tema.</p>
          </div>
        </header>

        <!-- Toggle principal -->
        <label class="flex items-center justify-between rounded-xl bg-slate-950 ring-1 ring-slate-800 px-4 py-3 cursor-pointer">
          <div>
            <p class="text-sm font-medium text-slate-100">Activar seguimiento automático</p>
            <p class="text-xs text-slate-500">El bot genera mensajes contextuales con LLM. Nunca envía saludos vacíos tipo "¿en qué te puedo ayudar?".</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="form.followupInactivityEnabled"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition"
            :class="form.followupInactivityEnabled ? 'bg-indigo-500' : 'bg-slate-700'"
            @click="form.followupInactivityEnabled = !form.followupInactivityEnabled"
          >
            <span
              class="inline-block size-4 transform rounded-full bg-white shadow transition"
              :class="form.followupInactivityEnabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </label>

        <!-- Resumen en vivo -->
        <div
          class="rounded-xl px-4 py-3 text-xs"
          :class="form.followupInactivityEnabled
            ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30 text-indigo-100'
            : 'bg-slate-800/70 ring-1 ring-slate-700 text-slate-400'"
        >
          {{ followupSummary }}
        </div>

        <!-- Inputs (deshabilitados si toggle off) -->
        <fieldset :disabled="!form.followupInactivityEnabled" class="space-y-5" :class="{ 'opacity-50 pointer-events-none': !form.followupInactivityEnabled }">
          <div>
            <label class="block text-sm font-medium text-slate-300">Horas de espera entre intentos</label>
            <p class="mt-0.5 text-xs text-slate-500">Cuánto tiempo de silencio del cliente debe pasar antes de cada intento.</p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <button
                v-for="preset in FOLLOWUP_HOUR_PRESETS"
                :key="preset.value"
                type="button"
                class="rounded-full px-3 py-1 text-xs font-medium ring-1 transition"
                :class="form.followupInactivityHours === preset.value
                  ? 'bg-indigo-500 text-white ring-indigo-500'
                  : 'bg-slate-900 text-slate-300 ring-slate-700 hover:ring-slate-600'"
                @click="form.followupInactivityHours = preset.value"
              >
                {{ preset.label }}
              </button>
              <div class="ml-2 flex items-center gap-2">
                <input
                  v-model.number="form.followupInactivityHours"
                  type="number"
                  min="1"
                  max="168"
                  step="1"
                  class="w-24 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                <span class="text-xs text-slate-500">horas (1–168)</span>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300">Máximo de intentos</label>
            <p class="mt-0.5 text-xs text-slate-500">Cuando se alcanza el límite sin respuesta, el bot deja de insistir. El contador se resetea cuando el cliente vuelve a escribir.</p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <button
                v-for="n in FOLLOWUP_ATTEMPT_PRESETS"
                :key="n"
                type="button"
                class="rounded-full px-3 py-1 text-xs font-medium ring-1 transition"
                :class="form.followupInactivityMaxCount === n
                  ? 'bg-indigo-500 text-white ring-indigo-500'
                  : 'bg-slate-900 text-slate-300 ring-slate-700 hover:ring-slate-600'"
                @click="form.followupInactivityMaxCount = n"
              >
                {{ n }}
              </button>
              <div class="ml-2 flex items-center gap-2">
                <input
                  v-model.number="form.followupInactivityMaxCount"
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  class="w-24 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                <span class="text-xs text-slate-500">intentos (1–10)</span>
              </div>
            </div>
          </div>
        </fieldset>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           SECTION 5 — Internal metadata + status
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
            <h2 class="text-base font-semibold text-slate-100">Internal</h2>
            <p class="text-xs text-slate-500 mt-0.5">Notes for your team and runtime status. Not sent to the model.</p>
          </div>
        </header>

        <div>
          <label class="block text-sm font-medium text-slate-300">Description</label>
          <input
            v-model="form.description"
            type="text"
            maxlength="280"
            placeholder="What this bot is for, who owns it…"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
        </div>

        <label class="flex items-center justify-between rounded-xl bg-slate-950 ring-1 ring-slate-800 px-4 py-3">
          <div>
            <p class="text-sm font-medium text-slate-100">Bot active</p>
            <p class="text-xs text-slate-500">When off, the bot doesn't reply to incoming WhatsApp messages.</p>
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
            Cancel
          </NuxtLink>
          <button
            type="submit"
            class="rounded-xl bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition"
            :disabled="saving"
          >
            {{ saving ? 'Saving…' : 'Save configuration' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
