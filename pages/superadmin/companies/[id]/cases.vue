<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { Case, CaseStatus } from '~/types/case'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const tenantId = route.params.id as string
const casesApi = useCases(tenantId)
const botsApi = useBots(tenantId)

const rows = ref<Case[]>([])
const bots = ref<Bot[]>([])
const botMap = computed(() => new Map(bots.value.map((b) => [b.id, b.name])))

const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)
const resolveModal = ref<{ id: string; note: string } | null>(null)

const statusFilter = ref<CaseStatus | 'OPEN' | 'ALL'>('OPEN')
const botFilter = ref<string>('')
const search = ref('')

const counts = computed(() => ({
  pending: rows.value.filter((c) => c.status === 'PENDING').length,
  attended: rows.value.filter((c) => c.status === 'ATTENDED').length,
  resolved: rows.value.filter((c) => c.status === 'RESOLVED').length,
  total: rows.value.length,
}))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter((c) => {
    if (statusFilter.value === 'OPEN') {
      if (c.status === 'RESOLVED') return false
    } else if (statusFilter.value !== 'ALL') {
      if (c.status !== statusFilter.value) return false
    }
    if (botFilter.value && c.botId !== botFilter.value) return false
    if (q) {
      const hit =
        (c.customerName ?? '').toLowerCase().includes(q) ||
        c.customerPhone.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q)
      if (!hit) return false
    }
    return true
  })
})

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [list, botList] = await Promise.all([
      casesApi.list(),
      botsApi.list().catch(() => [] as Bot[]),
    ])
    rows.value = list
    bots.value = botList
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

function upsert(c: Case): void {
  const idx = rows.value.findIndex((x) => x.id === c.id)
  if (idx >= 0) rows.value[idx] = c
  else rows.value.unshift(c)
}

async function markAttended(id: string): Promise<void> {
  busyId.value = id
  try {
    upsert(await casesApi.markAttended(id))
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    busyId.value = null
  }
}

async function confirmResolve(): Promise<void> {
  const ctx = resolveModal.value
  if (!ctx) return
  busyId.value = ctx.id
  try {
    upsert(await casesApi.markResolved(ctx.id, ctx.note.trim() || undefined))
    resolveModal.value = null
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    busyId.value = null
  }
}

function statusPill(status: CaseStatus): string {
  if (status === 'PENDING') return 'bg-amber-950 text-amber-300 border border-amber-800'
  if (status === 'ATTENDED') return 'bg-sky-950 text-sky-300 border border-sky-800'
  return 'bg-success-950 text-success-300 border border-success-800'
}

function priorityPill(priority: Case['priority']): string {
  if (priority === 'HIGH') return 'bg-danger-950 text-danger-300 border border-danger-800'
  if (priority === 'LOW') return 'bg-slate-800 text-slate-400 border border-slate-700'
  return 'bg-amber-950 text-amber-300 border border-amber-800'
}

await load()
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${tenantId}`" class="text-sm text-slate-400 hover:text-slate-200">
      ← Back to company
    </NuxtLink>

    <header class="mt-2 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-100">Casos</h1>
        <p class="text-sm text-slate-400 mt-1">Escalados a asesor humano para esta empresa.</p>
      </div>
    </header>

    <div class="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <button
        type="button"
        class="text-left rounded-xl px-4 py-3 border transition"
        :class="statusFilter === 'OPEN' ? 'bg-white text-slate-900 border-white' : 'bg-slate-900/70 text-slate-100 border-slate-700 hover:bg-slate-800'"
        @click="statusFilter = 'OPEN'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">Abiertos</div>
        <div class="text-2xl font-bold mt-1">{{ counts.pending + counts.attended }}</div>
      </button>
      <button
        type="button"
        class="text-left rounded-xl px-4 py-3 border transition"
        :class="statusFilter === 'PENDING' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900/70 text-slate-100 border-slate-700 hover:bg-slate-800'"
        @click="statusFilter = 'PENDING'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">Pendientes</div>
        <div class="text-2xl font-bold mt-1">{{ counts.pending }}</div>
      </button>
      <button
        type="button"
        class="text-left rounded-xl px-4 py-3 border transition"
        :class="statusFilter === 'ATTENDED' ? 'bg-sky-500 text-slate-950 border-sky-500' : 'bg-slate-900/70 text-slate-100 border-slate-700 hover:bg-slate-800'"
        @click="statusFilter = 'ATTENDED'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">Atendidos</div>
        <div class="text-2xl font-bold mt-1">{{ counts.attended }}</div>
      </button>
      <button
        type="button"
        class="text-left rounded-xl px-4 py-3 border transition"
        :class="statusFilter === 'RESOLVED' ? 'bg-success-500 text-slate-950 border-success-500' : 'bg-slate-900/70 text-slate-100 border-slate-700 hover:bg-slate-800'"
        @click="statusFilter = 'RESOLVED'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">Resueltos</div>
        <div class="text-2xl font-bold mt-1">{{ counts.resolved }}</div>
      </button>
    </div>

    <div class="mt-4 flex flex-wrap gap-2 items-center">
      <select
        v-model="botFilter"
        class="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100"
      >
        <option value="">Todos los bots</option>
        <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
      <input
        v-model="search"
        type="search"
        placeholder="Buscar por cliente, teléfono o resumen…"
        class="flex-1 min-w-[16rem] rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500"
      >
      <button
        type="button"
        class="text-xs text-slate-400 hover:text-slate-200"
        :disabled="loading"
        @click="load"
      >
        {{ loading ? 'Cargando…' : 'Recargar' }}
      </button>
    </div>

    <p v-if="error" class="mt-4 rounded-md border border-danger-800 bg-danger-950 p-3 text-sm text-danger-300">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <div
      v-else-if="filtered.length === 0"
      class="mt-6 rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-10 text-center text-slate-400"
    >
      {{ rows.length === 0 ? 'Aún no hay casos escalados.' : 'No hay casos que coincidan con los filtros.' }}
    </div>

    <div v-else class="mt-4 space-y-3">
      <article
        v-for="c in filtered"
        :key="c.id"
        class="rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-4 flex flex-wrap gap-4 items-start"
      >
        <div class="flex-1 min-w-[20rem]">
          <div class="flex items-center gap-2 flex-wrap">
            <NuxtLink
              :to="`/superadmin/companies/${tenantId}/customers/${encodeURIComponent(c.customerPhone)}`"
              class="text-sm font-semibold text-slate-100 hover:underline"
            >
              {{ c.customerName || c.customerPhone }}
            </NuxtLink>
            <span class="text-xs text-slate-500 font-mono">{{ c.customerPhone }}</span>
            <span class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" :class="statusPill(c.status)">
              {{ c.status }}
            </span>
            <span class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" :class="priorityPill(c.priority)">
              {{ c.priority }}
            </span>
            <span
              v-if="c.followupCount > 0"
              class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
            >
              follow-up
            </span>
          </div>
          <p class="mt-2 text-sm text-slate-300 leading-relaxed">{{ c.summary }}</p>
          <div
            v-if="c.resolution && c.status === 'RESOLVED'"
            class="mt-2 rounded-md bg-slate-800/60 px-3 py-2 text-xs text-slate-400"
          >
            <strong class="font-semibold">Resolución:</strong> {{ c.resolution }}
          </div>
          <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span>Bot: {{ botMap.get(c.botId) ?? c.botId.slice(0, 8) }}</span>
            <span>Creado: {{ new Date(c.createdAt).toLocaleString() }}</span>
            <span v-if="c.resolvedAt">Resuelto: {{ new Date(c.resolvedAt).toLocaleString() }}</span>
            <span class="font-mono">→ {{ c.advisorEmail }}</span>
          </div>
        </div>

        <div v-if="c.status !== 'RESOLVED'" class="flex flex-col gap-1 shrink-0">
          <button
            v-if="c.status === 'PENDING'"
            type="button"
            :disabled="busyId === c.id"
            class="text-xs px-2.5 py-1.5 rounded-md font-medium bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 disabled:opacity-50"
            @click="markAttended(c.id)"
          >
            Atender
          </button>
          <button
            type="button"
            :disabled="busyId === c.id"
            class="text-xs px-2.5 py-1.5 rounded-md font-medium bg-success-500/20 text-success-300 hover:bg-success-500/30 disabled:opacity-50"
            @click="resolveModal = { id: c.id, note: '' }"
          >
            Resolver
          </button>
        </div>
      </article>
    </div>

    <div
      v-if="resolveModal"
      class="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      @click.self="resolveModal = null"
    >
      <div class="w-full max-w-md rounded-2xl bg-slate-900 ring-1 ring-slate-700 p-6 shadow-2xl">
        <h3 class="text-base font-semibold text-slate-100">Marcar caso como resuelto</h3>
        <p class="mt-1 text-sm text-slate-400">
          Quedará registrado como <strong>resuelto por el asesor</strong>.
        </p>
        <textarea
          v-model="resolveModal.note"
          rows="3"
          maxlength="2000"
          placeholder="Ej. Se ajustó la facturación."
          class="mt-3 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
        />
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
            @click="resolveModal = null"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="busyId !== null"
            class="rounded-md bg-success-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-success-400"
            @click="confirmResolve"
          >
            {{ busyId ? 'Guardando…' : 'Marcar resuelto' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
