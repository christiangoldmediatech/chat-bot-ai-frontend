<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  TestBenchResponse,
  TestBenchTurn,
} from '~/composables/useTestBench'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const route = useRoute()
const bench = useTestBench()
const botId = route.params.id as string

// Historial local — solo vive en memoria mientras el admin está en la
// página. Cada turno se envía completo al backend porque el backend NO
// persiste NADA de esta ruta (por diseño — es un banco en seco).
const history = ref<TestBenchTurn[]>([])
const draft = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const lastResponse = ref<TestBenchResponse | null>(null)
const showPromptPreview = ref(false)

async function send(): Promise<void> {
  const text = draft.value.trim()
  if (!text || loading.value) return
  loading.value = true
  error.value = null
  try {
    const priorHistory = [...history.value]
    history.value.push({ role: 'USER', content: text })
    draft.value = ''
    const res = await bench.run(botId, text, priorHistory)
    lastResponse.value = res
    // Concatenar las intents de tipo text como una sola respuesta del
    // assistant en el historial local (para mantener el flujo).
    const assistantReply = res.intents
      .filter((i) => i.type === 'text' && i.message)
      .map((i) => i.message)
      .join('\n')
    if (assistantReply) {
      history.value.push({ role: 'ASSISTANT', content: assistantReply })
    }
  } catch (err) {
    error.value = (err as ApiError).message
    // Revertir el turno de usuario si el request falló para que pueda
    // reintentar sin dejar historial huérfano.
    if (history.value[history.value.length - 1]?.role === 'USER') {
      history.value.pop()
    }
  } finally {
    loading.value = false
  }
}

function reset(): void {
  history.value = []
  lastResponse.value = null
  error.value = null
  draft.value = ''
}

function onKey(ev: KeyboardEvent): void {
  if (ev.key === 'Enter' && !ev.shiftKey) {
    ev.preventDefault()
    void send()
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-6">
    <header class="mb-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-lg font-semibold text-slate-900">
            Banco de pruebas en seco
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Conversa con este bot usando su configuración real (prompt,
            catálogo, documentos, tools). No se envía nada por WhatsApp, no se
            crean citas ni ventas — es una simulación.
          </p>
        </div>
        <button
          type="button"
          class="text-xs text-slate-500 hover:text-slate-700"
          @click="reset"
        >
          Reiniciar
        </button>
      </div>
      <div class="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 border border-amber-200">
        Modo prueba — los efectos de las tools están simulados con datos
        ficticios. Este historial se pierde al salir de la página.
      </div>
    </header>

    <!-- Historial de mensajes -->
    <section class="mb-4 space-y-3 min-h-[240px]">
      <div
        v-for="(turn, i) in history"
        :key="i"
        class="flex"
        :class="turn.role === 'USER' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
          :class="turn.role === 'USER' ? 'bg-slate-900 text-slate-50' : 'bg-slate-100 text-slate-900'"
        >
          {{ turn.content }}
        </div>
      </div>
      <div v-if="loading" class="text-xs text-slate-500 italic">
        El bot está procesando…
      </div>
      <div v-if="error" class="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ error }}
      </div>
    </section>

    <!-- Input -->
    <section class="mb-6">
      <div class="flex gap-2">
        <textarea
          v-model="draft"
          rows="2"
          placeholder="Escribe como si fueras un paciente…"
          class="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          @keydown="onKey"
        />
        <button
          type="button"
          class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          :disabled="loading || !draft.trim()"
          @click="send"
        >
          Enviar
        </button>
      </div>
      <p class="mt-1 text-xs text-slate-500">
        Enter para enviar, Shift+Enter para nueva línea.
      </p>
    </section>

    <!-- Debug de la última respuesta -->
    <section v-if="lastResponse" class="space-y-4">
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          Intents enviados ({{ lastResponse.intents.length }})
        </h3>
        <ul class="space-y-1 text-sm text-slate-700">
          <li
            v-for="(intent, i) in lastResponse.intents"
            :key="i"
            class="flex items-start gap-2"
          >
            <span class="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600 flex-shrink-0">
              {{ intent.type }}
            </span>
            <span class="whitespace-pre-wrap flex-1">{{
              intent.message ?? intent.caption ?? intent.resourceKey ?? '(sin cuerpo)'
            }}</span>
          </li>
        </ul>
      </div>

      <div
        v-if="lastResponse.toolCalls.length > 0"
        class="rounded-lg border border-slate-200 bg-white p-4"
      >
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          Tools invocadas ({{ lastResponse.toolCalls.length }})
        </h3>
        <ul class="space-y-2 text-sm text-slate-700">
          <li
            v-for="(call, i) in lastResponse.toolCalls"
            :key="i"
            class="border-l-2 border-slate-200 pl-3"
          >
            <div class="font-mono text-xs text-slate-900">{{ call.name }}</div>
            <details class="text-xs text-slate-500 mt-1">
              <summary class="cursor-pointer hover:text-slate-700">detalle</summary>
              <pre class="mt-1 whitespace-pre-wrap break-all bg-slate-50 p-2 rounded text-[11px]">input: {{ JSON.stringify(call.input, null, 2) }}
result: {{ JSON.stringify(call.result, null, 2) }}</pre>
            </details>
          </li>
        </ul>
      </div>

      <div
        v-if="lastResponse.ragChunks.length > 0"
        class="rounded-lg border border-slate-200 bg-white p-4"
      >
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          Documentos consultados ({{ lastResponse.ragChunks.length }})
        </h3>
        <ul class="space-y-1 text-sm text-slate-700">
          <li
            v-for="c in lastResponse.ragChunks"
            :key="c.documentId"
            class="flex items-center gap-2"
          >
            <span class="text-xs text-slate-500">{{ c.distance.toFixed(3) }}</span>
            <span>{{ c.label }}</span>
          </li>
        </ul>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <button
          type="button"
          class="text-xs text-slate-500 hover:text-slate-700"
          @click="showPromptPreview = !showPromptPreview"
        >
          {{ showPromptPreview ? 'Ocultar' : 'Ver' }} preview del system prompt (primeros 4000 caracteres)
        </button>
        <pre
          v-if="showPromptPreview"
          class="mt-2 whitespace-pre-wrap break-words bg-slate-50 p-3 rounded text-[11px] text-slate-700 max-h-[400px] overflow-y-auto"
        >{{ lastResponse.systemPromptPreview }}</pre>
      </div>
    </section>
  </div>
</template>
