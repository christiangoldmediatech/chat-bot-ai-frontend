<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { Case, CaseStatus } from '~/types/case'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const casesApi = useCases()
const botsApi = useBots()

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

const counts = computed(() => {
  const pending = rows.value.filter((c) => c.status === 'PENDING').length
  const attended = rows.value.filter((c) => c.status === 'ATTENDED').length
  const resolved = rows.value.filter((c) => c.status === 'RESOLVED').length
  return { pending, attended, resolved, total: rows.value.length }
})

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
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border border-amber-200'
  if (status === 'ATTENDED') return 'bg-sky-50 text-sky-700 border border-sky-200'
  return 'bg-success-50 text-success-700 border border-success-200'
}

function priorityPill(priority: Case['priority']): string {
  if (priority === 'HIGH') return 'bg-danger-50 text-danger-700 border border-danger-200'
  if (priority === 'LOW') return 'bg-slate-50 text-slate-600 border border-slate-200'
  return 'bg-amber-50 text-amber-700 border border-amber-200'
}

await load()
</script>

<template>
  <div>
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Casos</h1>
        <p class="text-sm text-slate-500 mt-1">
          Escalados a asesor humano. Resuelve cada uno desde aquí o desde la página del cliente.
        </p>
      </div>
    </header>

    <!-- Stat strip -->
    <div class="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <button
        type="button"
        class="text-left rounded-xl px-4 py-3 border transition"
        :class="statusFilter === 'OPEN' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white/70 border-white/60 hover:bg-white'"
        @click="statusFilter = 'OPEN'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">Abiertos</div>
        <div class="text-2xl font-bold mt-1">{{ counts.pending + counts.attended }}</div>
      </button>
      <button
        type="button"
        class="text-left rounded-xl px-4 py-3 border transition"
        :class="statusFilter === 'PENDING' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white/70 border-white/60 hover:bg-white'"
        @click="statusFilter = 'PENDING'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">Pendientes</div>
        <div class="text-2xl font-bold mt-1">{{ counts.pending }}</div>
      </button>
      <button
        type="button"
        class="text-left rounded-xl px-4 py-3 border transition"
        :class="statusFilter === 'ATTENDED' ? 'bg-sky-500 text-white border-sky-500' : 'bg-white/70 border-white/60 hover:bg-white'"
        @click="statusFilter = 'ATTENDED'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">Atendidos</div>
        <div class="text-2xl font-bold mt-1">{{ counts.attended }}</div>
      </button>
      <button
        type="button"
        class="text-left rounded-xl px-4 py-3 border transition"
        :class="statusFilter === 'RESOLVED' ? 'bg-success-600 text-white border-success-600' : 'bg-white/70 border-white/60 hover:bg-white'"
        @click="statusFilter = 'RESOLVED'"
      >
        <div class="text-xs uppercase tracking-wider opacity-70">Resueltos</div>
        <div class="text-2xl font-bold mt-1">{{ counts.resolved }}</div>
      </button>
    </div>

    <!-- Filters -->
    <div class="mt-4 flex flex-wrap gap-2 items-center">
      <select
        v-model="botFilter"
        class="rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
      >
        <option value="">Todos los bots</option>
        <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
      <input
        v-model="search"
        type="search"
        placeholder="Buscar por cliente, teléfono o resumen…"
        class="flex-1 min-w-[16rem] rounded-md border border-slate-300 px-3 py-1.5 text-sm"
      >
      <button
        type="button"
        class="text-xs text-slate-500 hover:text-slate-700"
        :disabled="loading"
        @click="load"
      >
        {{ loading ? 'Cargando…' : 'Recargar' }}
      </button>
    </div>

    <p v-if="error" class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <div
      v-else-if="filtered.length === 0"
      class="mt-6 rounded-2xl bg-white/70 ring-1 ring-white/50 p-10 text-center text-slate-500"
    >
      {{ rows.length === 0 ? 'Aún no hay casos escalados.' : 'No hay casos que coincidan con los filtros.' }}
    </div>

    <div v-else class="mt-4 space-y-3">
      <article
        v-for="c in filtered"
        :key="c.id"
        class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-4 flex flex-wrap gap-4 items-start"
      >
        <div class="flex-1 min-w-[20rem]">
          <div class="flex items-center gap-2 flex-wrap">
            <NuxtLink
              :to="`/admin/customers/${encodeURIComponent(c.customerPhone)}`"
              class="text-sm font-semibold text-slate-900 hover:underline"
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
              class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500"
            >
              follow-up
            </span>
          </div>
          <p class="mt-2 text-sm text-slate-700 leading-relaxed">{{ c.summary }}</p>
          <div
            v-if="c.resolution && c.status === 'RESOLVED'"
            class="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600"
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
            class="text-xs px-2.5 py-1.5 rounded-md font-medium bg-sky-100 text-sky-700 hover:bg-sky-200 disabled:opacity-50"
            @click="markAttended(c.id)"
          >
            Atender
          </button>
          <button
            type="button"
            :disabled="busyId === c.id"
            class="text-xs px-2.5 py-1.5 rounded-md font-medium bg-success-100 text-success-700 hover:bg-success-200 disabled:opacity-50"
            @click="resolveModal = { id: c.id, note: '' }"
          >
            Resolver
          </button>
        </div>
      </article>
    </div>

    <!-- Resolve modal -->
    <div
      v-if="resolveModal"
      class="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="resolveModal = null"
    >
      <div class="w-full max-w-md rounded-2xl bg-white ring-1 ring-slate-200 p-6 shadow-2xl">
        <h3 class="text-base font-semibold text-slate-900">Marcar caso como resuelto</h3>
        <p class="mt-1 text-sm text-slate-600">
          Agrega una nota opcional. Quedará registrado como <strong>resuelto por el asesor</strong>.
        </p>
        <textarea
          v-model="resolveModal.note"
          rows="3"
          maxlength="2000"
          placeholder="Ej. Se ajustó la facturación."
          class="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            @click="resolveModal = null"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="busyId !== null"
            class="rounded-md bg-success-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-success-700"
            @click="confirmResolve"
          >
            {{ busyId ? 'Guardando…' : 'Marcar resuelto' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
