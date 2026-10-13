<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { PlatformUsageSummary } from '~/composables/useLlmUsage'

definePageMeta({ layout: 'superadmin', middleware: 'superadmin-auth' })

const api = useLlmUsage()

const hoursOptions = [
  { value: 1, label: '1h' },
  { value: 24, label: '24h' },
  { value: 24 * 7, label: '7d' },
  { value: 24 * 30, label: '30d' },
]
const hours = ref<number>(24)
const tenantId = ref<string>('')
const botId = ref<string>('')
const tenantList = ref<{ id: string, name: string }[]>([])
const botList = ref<{ id: string, name: string, tenantId: string }[]>([])
const data = ref<PlatformUsageSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function loadFilters(): Promise<void> {
  try {
    const companies = await useApi().get<{ id: string, name: string }[]>('/superadmin/companies')
    tenantList.value = companies.map((c) => ({ id: c.id, name: c.name }))
  }
  catch { /* ignore */ }
}

async function loadBotsForTenant(): Promise<void> {
  if (!tenantId.value) {
    botList.value = []
    return
  }
  try {
    const rows = await useBots(tenantId.value).list()
    botList.value = rows.map((b) => ({ id: b.id, name: b.name, tenantId: tenantId.value }))
  }
  catch { botList.value = [] }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await api.platformSummary({
      hours: hours.value,
      tenantId: tenantId.value || undefined,
      botId: botId.value || undefined,
    })
  }
  catch (err) {
    error.value = (err as ApiError).message
  }
  finally {
    loading.value = false
  }
}

watch(tenantId, async () => {
  botId.value = ''
  await loadBotsForTenant()
  await load()
})
watch([hours, botId], () => void load())

await loadFilters()
await load()

function fmtMoney(n: number): string { return `$${n.toFixed(4)}` }
function fmtInt(n: number): string { return n.toLocaleString() }
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
        <h1 class="text-2xl font-semibold tracking-tight text-pearl">Consumo de IA — Plataforma</h1>
        <p class="mt-1 text-sm text-mist-dim">Costo total y breakdown por tenant/bot/modelo. Datos crudos de `llm_usage`.</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <select
          v-model="tenantId"
          class="rounded-lg border border-line-soft bg-ink-card/60 px-3 py-1.5 text-sm text-pearl"
        >
          <option value="">Todos los tenants</option>
          <option v-for="t in tenantList" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <select
          v-model="botId"
          :disabled="!tenantId"
          class="rounded-lg border border-line-soft bg-ink-card/60 px-3 py-1.5 text-sm text-pearl disabled:opacity-50"
        >
          <option value="">Todos los bots</option>
          <option v-for="b in botList" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <select
          v-model="hours"
          class="rounded-lg border border-line-soft bg-ink-card/60 px-3 py-1.5 text-sm text-pearl"
        >
          <option v-for="o in hoursOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
    </header>

    <div v-if="error" class="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
      {{ error }}
    </div>

    <div v-else-if="loading" class="py-10 flex justify-center">
      <SpinnerInline />
    </div>

    <template v-else-if="data">
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <article class="rounded-2xl bg-ink-card/60 ring-1 ring-line-soft p-4">
          <p class="text-[11px] uppercase tracking-wider text-mist-dim font-semibold">Costo total</p>
          <p class="mt-1 text-2xl font-semibold text-pearl tabular-nums">{{ fmtMoney(data.totalCostUsd) }}</p>
          <p class="mt-1 text-[11px] text-mist-dim">últimas {{ data.rangeHours }}h</p>
        </article>
        <article class="rounded-2xl bg-ink-card/60 ring-1 ring-line-soft p-4">
          <p class="text-[11px] uppercase tracking-wider text-mist-dim font-semibold">Costo por mensaje</p>
          <p class="mt-1 text-2xl font-semibold text-pearl tabular-nums">{{ fmtMoney(data.avgCostPerCall) }}</p>
          <p class="mt-1 text-[11px] text-mist-dim">promedio por llamada</p>
        </article>
        <article class="rounded-2xl bg-ink-card/60 ring-1 ring-line-soft p-4">
          <p class="text-[11px] uppercase tracking-wider text-mist-dim font-semibold">Costo por conversación</p>
          <p class="mt-1 text-2xl font-semibold text-pearl tabular-nums">{{ fmtMoney(data.avgCostPerConversation) }}</p>
          <p class="mt-1 text-[11px] text-mist-dim">promedio</p>
        </article>
        <article class="rounded-2xl bg-ink-card/60 ring-1 ring-line-soft p-4">
          <p class="text-[11px] uppercase tracking-wider text-mist-dim font-semibold">Llamadas</p>
          <p class="mt-1 text-2xl font-semibold text-pearl tabular-nums">{{ fmtInt(data.totalCalls) }}</p>
          <p class="mt-1 text-[11px] text-mist-dim">a la API</p>
        </article>
      </section>

      <section class="rounded-2xl bg-ink-card/60 ring-1 ring-line-soft overflow-x-auto">
        <header class="px-4 py-3 border-b border-line-soft">
          <h2 class="text-sm font-semibold text-pearl">Por bot</h2>
        </header>
        <table class="w-full text-sm">
          <thead class="bg-ink-surface/40 text-mist-dim">
            <tr>
              <th class="text-left font-medium px-4 py-3">Tenant</th>
              <th class="text-left font-medium px-4 py-3">Bot</th>
              <th class="text-right font-medium px-4 py-3">Llamadas</th>
              <th class="text-right font-medium px-4 py-3">Costo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in data.byBot" :key="`${r.botId}-${i}`" class="border-t border-line-soft/60">
              <td class="px-4 py-3 text-pearl">{{ r.tenantName ?? r.tenantId ?? '—' }}</td>
              <td class="px-4 py-3 text-pearl">{{ r.botName ?? r.botId ?? '—' }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-pearl">{{ fmtInt(r.calls) }}</td>
              <td class="px-4 py-3 text-right tabular-nums font-semibold text-pearl">{{ fmtMoney(r.costUsd) }}</td>
            </tr>
            <tr v-if="data.byBot.length === 0">
              <td colspan="4" class="px-4 py-6 text-center text-mist-dim">Sin datos en este rango.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="rounded-2xl bg-ink-card/60 ring-1 ring-line-soft overflow-x-auto">
        <header class="px-4 py-3 border-b border-line-soft">
          <h2 class="text-sm font-semibold text-pearl">Por modelo y tipo</h2>
        </header>
        <table class="w-full text-sm">
          <thead class="bg-ink-surface/40 text-mist-dim">
            <tr>
              <th class="text-left font-medium px-4 py-3">Modelo</th>
              <th class="text-left font-medium px-4 py-3">Tipo</th>
              <th class="text-right font-medium px-4 py-3">Llamadas</th>
              <th class="text-right font-medium px-4 py-3">Input</th>
              <th class="text-right font-medium px-4 py-3">Cache R</th>
              <th class="text-right font-medium px-4 py-3">Cache W</th>
              <th class="text-right font-medium px-4 py-3">Output</th>
              <th class="text-right font-medium px-4 py-3">Costo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in data.byModelKind" :key="`${r.model}-${r.kind}-${i}`" class="border-t border-line-soft/60">
              <td class="px-4 py-3 font-mono text-xs text-pearl">{{ r.model }}</td>
              <td class="px-4 py-3 text-pearl">{{ kindLabel(r.kind) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-pearl">{{ fmtInt(r.calls) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-pearl">{{ fmtInt(r.inputTokens) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-emerald-300">{{ fmtInt(r.cacheReadTokens) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-amber-300">{{ fmtInt(r.cacheWriteTokens) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-pearl">{{ fmtInt(r.outputTokens) }}</td>
              <td class="px-4 py-3 text-right tabular-nums font-semibold text-pearl">{{ fmtMoney(r.costUsd) }}</td>
            </tr>
            <tr v-if="data.byModelKind.length === 0">
              <td colspan="8" class="px-4 py-6 text-center text-mist-dim">Sin datos.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>
