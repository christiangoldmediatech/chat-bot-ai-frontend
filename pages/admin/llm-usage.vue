<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { UsageSummary } from '~/composables/useLlmUsage'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const api = useLlmUsage()
const activeBot = useActiveBotStore()

const hoursOptions = [
  { value: 1, label: '1h' },
  { value: 24, label: '24h' },
  { value: 24 * 7, label: '7d' },
  { value: 24 * 30, label: '30d' },
]
const hours = ref<number>(24)
const selectedBotId = ref<string>('')
const data = ref<UsageSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const botOptions = computed(() => activeBot.allBots.map((b) => ({ id: b.id, name: b.name })))

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await api.summary({
      hours: hours.value,
      botId: selectedBotId.value || undefined,
    })
  }
  catch (err) {
    error.value = (err as ApiError).message
  }
  finally {
    loading.value = false
  }
}

watch([hours, selectedBotId], () => void load())
void load()

function fmtMoney(n: number): string {
  return `$${n.toFixed(4)}`
}
function fmtInt(n: number): string {
  return n.toLocaleString()
}
function kindLabel(k: string): string {
  const map: Record<string, string> = {
    MAIN_REPLY: 'Respuesta principal',
    TOOL_ITERATION: 'Iteración de tool',
    SECURITY_CLASSIFIER: 'Clasificador seguridad',
    CUSTOMER_PROFILE_EXTRACT: 'Perfil cliente',
    REPHRASE: 'Rephrase anti-repetición',
    CONVERSATION_FOLLOWUP: 'Seguimiento conversación',
    OTHER: 'Otro',
  }
  return map[k] ?? k
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Consumo de IA</h1>
        <p class="mt-1 text-sm text-slate-500">Tokens, llamadas y costo por modelo y tipo. Datos de la tabla llm_usage.</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <select
          v-model="selectedBotId"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
        >
          <option value="">Todos los bots</option>
          <option v-for="b in botOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <select
          v-model="hours"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
        >
          <option v-for="o in hoursOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
    </header>

    <div v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ error }}
    </div>

    <div v-else-if="loading" class="py-10 flex justify-center">
      <SpinnerInline />
    </div>

    <template v-else-if="data">
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <article class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4">
          <p class="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Costo total</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{{ fmtMoney(data.totalCostUsd) }}</p>
          <p class="mt-1 text-[11px] text-slate-500">últimas {{ data.rangeHours }}h</p>
        </article>
        <article class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4">
          <p class="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Costo por mensaje</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{{ fmtMoney(data.avgCostPerCall) }}</p>
          <p class="mt-1 text-[11px] text-slate-500">promedio por llamada</p>
        </article>
        <article class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4">
          <p class="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Costo por conversación</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{{ fmtMoney(data.avgCostPerConversation) }}</p>
          <p class="mt-1 text-[11px] text-slate-500">promedio</p>
        </article>
        <article class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4">
          <p class="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Llamadas</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{{ fmtInt(data.totalCalls) }}</p>
          <p class="mt-1 text-[11px] text-slate-500">a la API de Claude</p>
        </article>
      </section>

      <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="text-left font-medium px-4 py-3">Modelo</th>
              <th class="text-left font-medium px-4 py-3">Tipo</th>
              <th class="text-right font-medium px-4 py-3">Llamadas</th>
              <th class="text-right font-medium px-4 py-3">Input</th>
              <th class="text-right font-medium px-4 py-3">Cache read</th>
              <th class="text-right font-medium px-4 py-3">Cache write</th>
              <th class="text-right font-medium px-4 py-3">Output</th>
              <th class="text-right font-medium px-4 py-3">Costo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in data.byModelKind" :key="`${r.model}-${r.kind}-${i}`" class="border-t border-slate-100">
              <td class="px-4 py-3 font-mono text-xs text-slate-700">{{ r.model }}</td>
              <td class="px-4 py-3 text-slate-700">{{ kindLabel(r.kind) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ fmtInt(r.calls) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ fmtInt(r.inputTokens) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-emerald-700">{{ fmtInt(r.cacheReadTokens) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-amber-700">{{ fmtInt(r.cacheWriteTokens) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ fmtInt(r.outputTokens) }}</td>
              <td class="px-4 py-3 text-right tabular-nums font-semibold">{{ fmtMoney(r.costUsd) }}</td>
            </tr>
            <tr v-if="data.byModelKind.length === 0">
              <td colspan="8" class="px-4 py-6 text-center text-slate-500">Sin datos en este rango.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>
