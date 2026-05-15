<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { BotConfig } from '~/types/bot'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const route = useRoute()
const bots = useBots()
const id = route.params.id as string

const form = reactive({
  description: '' as string,
  tone: '' as string,
  personality: '' as string,
  welcomeMessage: '' as string,
  responseRules: '' as string,
  fallbackMessage: '' as string,
  humanDelayMs: 0,
  aiProvider: 'anthropic',
  aiModel: 'claude-sonnet-4-6',
  isActive: true,
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
  form.aiProvider = cfg.aiProvider
  form.aiModel = cfg.aiModel
  form.isActive = cfg.isActive
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const cfg = await bots.getConfig(id)
    hydrate(cfg)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

// Null-out empty strings so the backend stores SQL NULL instead of "" — keeps
// the optional-vs-empty distinction clean for downstream prompt assembly.
function emptyToNull(v: string): string | null {
  return v.trim() === '' ? null : v
}

async function onSubmit(): Promise<void> {
  saving.value = true
  error.value = null
  success.value = null
  try {
    const updated = await bots.updateConfig(id, {
      description: emptyToNull(form.description),
      tone: emptyToNull(form.tone),
      personality: emptyToNull(form.personality),
      welcomeMessage: emptyToNull(form.welcomeMessage),
      responseRules: emptyToNull(form.responseRules),
      fallbackMessage: emptyToNull(form.fallbackMessage),
      humanDelayMs: form.humanDelayMs,
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
    <NuxtLink :to="`/admin/bots/${id}`" class="text-sm text-slate-500 hover:text-slate-700">← Back to bot</NuxtLink>
    <h1 class="mt-2 text-2xl font-semibold">
      Configuration<span v-if="botName" class="text-slate-500 font-normal"> — {{ botName }}</span>
    </h1>
    <p class="text-slate-500 text-sm mt-1">
      Personality, messages and model. WhatsApp credentials are edited from the bot's main screen.
    </p>

    <p v-if="error" class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </p>
    <p v-if="success" class="mt-4 rounded-md border border-success-200 bg-success-50 p-3 text-sm text-success-700">
      {{ success }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <form v-else class="mt-6 max-w-3xl space-y-6" @submit.prevent="onSubmit">
      <!-- Identity -->
      <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5 space-y-4">
        <h2 class="text-sm font-semibold text-slate-900">Identity</h2>

        <div>
          <label class="block text-sm font-medium text-slate-700">Internal description</label>
          <input
            v-model="form.description"
            type="text"
            maxlength="280"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
          <p class="mt-1 text-xs text-slate-500">Only shown in the panel; not sent to the model.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700">Tone</label>
            <input
              v-model="form.tone"
              type="text"
              maxlength="40"
              placeholder="professional, friendly, formal…"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
          </div>
          <div class="flex items-center gap-2 sm:mt-7">
            <input id="cfgActive" v-model="form.isActive" type="checkbox" class="size-4 rounded border-slate-300">
            <label for="cfgActive" class="text-sm text-slate-700">Bot active</label>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700">Personality</label>
          <textarea
            v-model="form.personality"
            rows="3"
            maxlength="4000"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <!-- Messages -->
      <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5 space-y-4">
        <h2 class="text-sm font-semibold text-slate-900">Messages</h2>

        <div>
          <label class="block text-sm font-medium text-slate-700">Welcome message</label>
          <textarea
            v-model="form.welcomeMessage"
            rows="2"
            maxlength="2000"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700">Response rules</label>
          <textarea
            v-model="form.responseRules"
            rows="4"
            maxlength="4000"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700">Fallback (when it doesn't know how to answer)</label>
          <textarea
            v-model="form.fallbackMessage"
            rows="2"
            maxlength="2000"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <!-- Model & timing -->
      <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5 space-y-4">
        <h2 class="text-sm font-semibold text-slate-900">Model & behavior</h2>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700">Provider</label>
            <input
              v-model="form.aiProvider"
              type="text"
              maxlength="40"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Model</label>
            <input
              v-model="form.aiModel"
              type="text"
              maxlength="80"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Human delay (ms)</label>
            <input
              v-model.number="form.humanDelayMs"
              type="number"
              min="0"
              max="30000"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
            <p class="mt-1 text-xs text-slate-500">0 = no delay.</p>
          </div>
        </div>
      </section>

      <!-- Placeholders para fases futuras -->
      <section class="rounded-2xl border border-dashed border-slate-300/60 bg-white/40 backdrop-blur-xl p-5">
        <h2 class="text-sm font-semibold text-slate-900">Coming soon</h2>
        <ul class="mt-2 text-sm text-slate-500 space-y-1">
          <li>WhatsApp — credentials and templates (edit bot → main tab)</li>
          <li>Google Calendar — Phase F</li>
          <li>Documents / RAG — Phase F</li>
        </ul>
      </section>

      <div class="pt-2">
        <button
          type="submit"
          class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? 'Saving…' : 'Save configuration' }}
        </button>
      </div>
    </form>
  </div>
</template>
