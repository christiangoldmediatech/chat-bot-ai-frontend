<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'
import type { Case } from '~/types/case'

const props = defineProps<{
  phone: string
  /** Pass for superadmin context; omit for the tenant owner context. */
  tenantId?: string
  /** Visual tone: `light` for tenant admin, `dark` for superadmin. */
  tone?: 'light' | 'dark'
}>()

const tone = computed(() => props.tone ?? 'light')
const casesApi = useCases(props.tenantId)
const botsApi = useBots(props.tenantId)

const cases = ref<Case[]>([])
const bots = ref<Bot[]>([])
const botMap = computed(() => new Map(bots.value.map((b) => [b.id, b.name])))

const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)
const resolveModal = ref<{ id: string; note: string } | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [list, botList] = await Promise.all([
      casesApi.byCustomer(props.phone),
      bots.value.length > 0 ? Promise.resolve(bots.value) : botsApi.list().catch(() => [] as Bot[]),
    ])
    cases.value = list
    bots.value = botList
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function markAttended(id: string): Promise<void> {
  busyId.value = id
  error.value = null
  try {
    const updated = await casesApi.markAttended(id)
    upsert(updated)
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
  error.value = null
  try {
    const updated = await casesApi.markResolved(ctx.id, ctx.note.trim() || undefined)
    upsert(updated)
    resolveModal.value = null
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    busyId.value = null
  }
}

function upsert(c: Case): void {
  const idx = cases.value.findIndex((x) => x.id === c.id)
  if (idx >= 0) cases.value[idx] = c
  else cases.value.unshift(c)
}

const groups = computed(() => {
  const pending: Case[] = []
  const attended: Case[] = []
  const resolved: Case[] = []
  for (const c of cases.value) {
    if (c.status === 'PENDING') pending.push(c)
    else if (c.status === 'ATTENDED') attended.push(c)
    else resolved.push(c)
  }
  return { pending, attended, resolved }
})

const totalCount = computed(() => cases.value.length)
const openCount = computed(() => groups.value.pending.length + groups.value.attended.length)

function fmtDateLong(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const priorityStyles = (priority: Case['priority']) => {
  if (tone.value === 'dark') {
    return priority === 'HIGH'
      ? 'bg-danger-950 text-danger-300 border border-danger-800'
      : priority === 'LOW'
        ? 'bg-slate-800 text-slate-400 border border-slate-700'
        : 'bg-amber-950 text-amber-300 border border-amber-800'
  }
  return priority === 'HIGH'
    ? 'bg-danger-50 text-danger-700 border border-danger-200'
    : priority === 'LOW'
      ? 'bg-slate-50 text-slate-600 border border-slate-200'
      : 'bg-amber-50 text-amber-700 border border-amber-200'
}

const resolvedByLabel = (rb: Case['resolvedBy']) => {
  if (rb === 'BOT') return 'por el bot'
  if (rb === 'CUSTOMER') return 'por el cliente'
  if (rb === 'AGENT') return 'por el asesor'
  return ''
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section
    class="rounded-2xl ring-1 shadow-glass overflow-hidden"
    :class="
      tone === 'dark'
        ? 'bg-slate-900/70 ring-slate-700/50 shadow-glass-lg'
        : 'bg-white/70 backdrop-blur-xl ring-white/50'
    "
  >
    <header
      class="flex items-center justify-between px-5 py-4 border-b"
      :class="tone === 'dark' ? 'border-slate-800' : 'border-slate-100'"
    >
      <div class="flex items-center gap-3">
        <div
          class="grid place-items-center size-10 rounded-xl"
          :class="
            tone === 'dark'
              ? 'bg-violet-500/10 text-violet-400'
              : 'bg-violet-50 text-violet-600'
          "
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
            <line x1="7" y1="22" x2="7" y2="11" />
          </svg>
        </div>
        <div>
          <h2
            class="text-sm font-semibold"
            :class="tone === 'dark' ? 'text-slate-100' : 'text-slate-900'"
          >
            Casos del cliente
          </h2>
          <p
            class="text-xs mt-0.5"
            :class="tone === 'dark' ? 'text-slate-500' : 'text-slate-500'"
          >
            Escalados a asesor humano
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="!loading && openCount > 0"
          class="text-xs px-2.5 py-1 rounded-full font-medium"
          :class="
            tone === 'dark'
              ? 'bg-amber-950 text-amber-300'
              : 'bg-amber-100 text-amber-700'
          "
        >
          {{ openCount }} abierto{{ openCount === 1 ? '' : 's' }}
        </span>
        <span
          v-if="!loading"
          class="text-xs px-2.5 py-1 rounded-full font-medium"
          :class="
            tone === 'dark'
              ? 'bg-slate-800 text-slate-300'
              : 'bg-slate-100 text-slate-600'
          "
        >
          {{ totalCount }} total
        </span>
        <button
          type="button"
          class="text-xs"
          :class="
            tone === 'dark'
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-500 hover:text-slate-700'
          "
          :disabled="loading"
          @click="load"
        >
          {{ loading ? 'Cargando…' : 'Recargar' }}
        </button>
      </div>
    </header>

    <p
      v-if="error"
      class="mx-5 my-3 rounded-md px-3 py-2 text-xs"
      :class="
        tone === 'dark'
          ? 'border border-danger-800 bg-danger-950 text-danger-300'
          : 'border border-danger-200 bg-danger-50 text-danger-700'
      "
    >
      {{ error }}
    </p>

    <div v-if="loading" class="p-5">
      <SpinnerInline :tone="tone === 'dark' ? 'dark' : undefined" />
    </div>

    <div
      v-else-if="totalCount === 0"
      class="px-5 py-10 text-center"
    >
      <div
        class="mx-auto grid place-items-center size-14 rounded-full mb-3"
        :class="
          tone === 'dark' ? 'bg-slate-800/60 text-slate-500' : 'bg-slate-100 text-slate-400'
        "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-6">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
        </svg>
      </div>
      <p
        class="text-sm font-medium"
        :class="tone === 'dark' ? 'text-slate-300' : 'text-slate-700'"
      >
        Sin casos escalados
      </p>
      <p
        class="text-xs mt-1"
        :class="tone === 'dark' ? 'text-slate-500' : 'text-slate-500'"
      >
        Cuando el bot escale una conversación a un asesor, aparecerá aquí.
      </p>
    </div>

    <div v-else class="divide-y" :class="tone === 'dark' ? 'divide-slate-800' : 'divide-slate-100'">
      <template v-for="(list, group) in groups" :key="group">
        <template v-if="list.length > 0">
          <div
            class="px-5 py-2 text-[11px] uppercase tracking-wider font-semibold flex items-center gap-2"
            :class="
              group === 'pending'
                ? (tone === 'dark' ? 'bg-amber-950/40 text-amber-300' : 'bg-amber-50 text-amber-700')
                : group === 'attended'
                  ? (tone === 'dark' ? 'bg-sky-950/40 text-sky-300' : 'bg-sky-50 text-sky-700')
                  : (tone === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-slate-50 text-slate-500')
            "
          >
            <span v-if="group === 'pending'">⏳ Pendientes ({{ list.length }})</span>
            <span v-else-if="group === 'attended'">👋 Atendidas ({{ list.length }})</span>
            <span v-else>✓ Resueltas ({{ list.length }})</span>
          </div>

          <article
            v-for="c in list"
            :key="c.id"
            class="px-5 py-4 transition"
            :class="tone === 'dark' ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'"
          >
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3
                    class="text-sm font-semibold"
                    :class="
                      group === 'resolved'
                        ? (tone === 'dark' ? 'text-slate-400' : 'text-slate-500')
                        : (tone === 'dark' ? 'text-slate-100' : 'text-slate-900')
                    "
                  >
                    Caso · {{ c.id.slice(0, 8) }}
                  </h3>
                  <span
                    class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    :class="priorityStyles(c.priority)"
                  >
                    {{ c.priority }}
                  </span>
                  <span
                    v-if="c.followupCount > 0"
                    class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    :class="tone === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'"
                    title="El bot mandó un follow-up al cliente"
                  >
                    follow-up
                  </span>
                </div>

                <p
                  class="mt-1.5 text-sm leading-relaxed"
                  :class="tone === 'dark' ? 'text-slate-300' : 'text-slate-700'"
                >
                  {{ c.summary }}
                </p>

                <div
                  v-if="c.resolution && group === 'resolved'"
                  class="mt-2 rounded-md px-3 py-2 text-xs"
                  :class="tone === 'dark' ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-50 text-slate-600'"
                >
                  <strong class="font-semibold">Resolución{{ c.resolvedBy ? ` ${resolvedByLabel(c.resolvedBy)}` : '' }}:</strong>
                  {{ c.resolution }}
                </div>

                <div
                  class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
                  :class="tone === 'dark' ? 'text-slate-500' : 'text-slate-500'"
                >
                  <span class="inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3"><path d="M9 7V5a3 3 0 0 1 6 0v2" /><path d="M3 7h18v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" /></svg>
                    {{ botMap.get(c.botId) ?? c.botId.slice(0, 8) }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    Creado {{ fmtDateLong(c.createdAt) }}
                  </span>
                  <span v-if="c.attendedAt" class="inline-flex items-center gap-1">
                    Atendido {{ fmtDateLong(c.attendedAt) }}
                  </span>
                  <span v-if="c.resolvedAt" class="inline-flex items-center gap-1">
                    Resuelto {{ fmtDateLong(c.resolvedAt) }}
                  </span>
                  <span class="inline-flex items-center gap-1 font-mono">
                    → {{ c.advisorEmail }}
                  </span>
                </div>
              </div>

              <div v-if="group !== 'resolved'" class="flex flex-col gap-1 shrink-0">
                <button
                  v-if="group === 'pending'"
                  type="button"
                  :disabled="busyId === c.id"
                  class="text-xs px-2.5 py-1.5 rounded-md font-medium transition disabled:opacity-50"
                  :class="
                    tone === 'dark'
                      ? 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                      : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                  "
                  @click="markAttended(c.id)"
                >
                  {{ busyId === c.id ? '…' : 'Atender' }}
                </button>
                <button
                  type="button"
                  :disabled="busyId === c.id"
                  class="text-xs px-2.5 py-1.5 rounded-md font-medium transition disabled:opacity-50"
                  :class="
                    tone === 'dark'
                      ? 'bg-success-500/15 text-success-300 hover:bg-success-500/25'
                      : 'bg-success-100 text-success-700 hover:bg-success-200'
                  "
                  @click="resolveModal = { id: c.id, note: '' }"
                >
                  Resolver
                </button>
              </div>
            </div>
          </article>
        </template>
      </template>
    </div>

    <!-- Resolve modal -->
    <div
      v-if="resolveModal"
      class="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4"
      @click.self="resolveModal = null"
    >
      <div
        class="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        :class="tone === 'dark' ? 'bg-slate-900 ring-1 ring-slate-700' : 'bg-white ring-1 ring-slate-200'"
      >
        <h3
          class="text-base font-semibold"
          :class="tone === 'dark' ? 'text-slate-100' : 'text-slate-900'"
        >
          Marcar caso como resuelto
        </h3>
        <p
          class="mt-1 text-sm"
          :class="tone === 'dark' ? 'text-slate-400' : 'text-slate-600'"
        >
          Agrega una nota breve sobre cómo se resolvió (opcional). El caso quedará registrado como <strong>resuelto por el asesor</strong>.
        </p>
        <textarea
          v-model="resolveModal.note"
          rows="3"
          maxlength="2000"
          placeholder="Ej. Se ajustó el cargo en la facturación de mayo."
          class="mt-3 w-full rounded-md px-3 py-2 text-sm"
          :class="
            tone === 'dark'
              ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500'
              : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400'
          "
        />
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium"
            :class="
              tone === 'dark'
                ? 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
            "
            @click="resolveModal = null"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="busyId !== null"
            class="rounded-md px-3 py-1.5 text-sm font-medium"
            :class="
              tone === 'dark'
                ? 'bg-success-500 text-white hover:bg-success-400'
                : 'bg-success-600 text-white hover:bg-success-700'
            "
            @click="confirmResolve"
          >
            {{ busyId ? 'Guardando…' : 'Marcar resuelto' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
