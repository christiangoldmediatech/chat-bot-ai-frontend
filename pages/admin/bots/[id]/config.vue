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
    success.value = 'Configuración guardada'
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
    <NuxtLink :to="`/admin/bots/${id}`" class="text-sm text-slate-500 hover:text-slate-700">← Volver al bot</NuxtLink>
    <h1 class="mt-2 text-2xl font-semibold">
      Configuración<span v-if="botName" class="text-slate-500 font-normal"> — {{ botName }}</span>
    </h1>
    <p class="text-slate-500 text-sm mt-1">
      Personalidad, mensajes y modelo. Las credenciales de WhatsApp se editan en la pantalla principal del bot.
    </p>

    <p v-if="error" class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </p>
    <p v-if="success" class="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
      {{ success }}
    </p>

    <div v-if="loading" class="mt-6 text-sm text-slate-500">Cargando…</div>

    <form v-else class="mt-6 max-w-3xl space-y-6" @submit.prevent="onSubmit">
      <!-- Identidad -->
      <section class="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 class="text-sm font-semibold text-slate-900">Identidad</h2>

        <div>
          <label class="block text-sm font-medium text-slate-700">Descripción interna</label>
          <input
            v-model="form.description"
            type="text"
            maxlength="280"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
          <p class="mt-1 text-xs text-slate-500">Sólo se ve en el panel; no se envía al modelo.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700">Tono</label>
            <input
              v-model="form.tone"
              type="text"
              maxlength="40"
              placeholder="profesional, cercano, formal…"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
          </div>
          <div class="flex items-center gap-2 sm:mt-7">
            <input id="cfgActive" v-model="form.isActive" type="checkbox" class="size-4 rounded border-slate-300">
            <label for="cfgActive" class="text-sm text-slate-700">Bot activo</label>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700">Personalidad</label>
          <textarea
            v-model="form.personality"
            rows="3"
            maxlength="4000"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <!-- Mensajes -->
      <section class="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 class="text-sm font-semibold text-slate-900">Mensajes</h2>

        <div>
          <label class="block text-sm font-medium text-slate-700">Mensaje de bienvenida</label>
          <textarea
            v-model="form.welcomeMessage"
            rows="2"
            maxlength="2000"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700">Reglas de respuesta</label>
          <textarea
            v-model="form.responseRules"
            rows="4"
            maxlength="4000"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700">Fallback (cuando no sabe responder)</label>
          <textarea
            v-model="form.fallbackMessage"
            rows="2"
            maxlength="2000"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <!-- Modelo & timing -->
      <section class="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 class="text-sm font-semibold text-slate-900">Modelo & comportamiento</h2>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700">Proveedor</label>
            <input
              v-model="form.aiProvider"
              type="text"
              maxlength="40"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Modelo</label>
            <input
              v-model="form.aiModel"
              type="text"
              maxlength="80"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Delay humano (ms)</label>
            <input
              v-model.number="form.humanDelayMs"
              type="number"
              min="0"
              max="30000"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
            <p class="mt-1 text-xs text-slate-500">0 = sin delay.</p>
          </div>
        </div>
      </section>

      <!-- Placeholders para fases futuras -->
      <section class="rounded-xl border border-dashed border-slate-300 bg-white p-5">
        <h2 class="text-sm font-semibold text-slate-900">Próximamente</h2>
        <ul class="mt-2 text-sm text-slate-500 space-y-1">
          <li>WhatsApp — credenciales y plantillas (editar bot → pestaña principal)</li>
          <li>Google Calendar — Fase F</li>
          <li>Documentos / RAG — Fase F</li>
        </ul>
      </section>

      <div class="pt-2">
        <button
          type="submit"
          class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? 'Guardando…' : 'Guardar configuración' }}
        </button>
      </div>
    </form>
  </div>
</template>
