<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  TestBenchIntent,
  TestBenchResponse,
  TestBenchTurn,
} from '~/composables/useTestBench'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const tenantId = String(route.params.id)
const botId = String(route.params.botId)
const bench = useTestBench(tenantId)
const mediaAssets = useMediaAssets(tenantId)

// Historial local — solo vive en memoria mientras el super admin está en
// la página. Cada turno se envía completo al backend porque el backend NO
// persiste NADA de esta ruta (por diseño — es un banco en seco).
interface AssistantAttachment {
  type: 'image'
  url: string
  caption?: string
  resourceKey?: string
}
interface RichTurn extends TestBenchTurn {
  attachments?: AssistantAttachment[]
}
const history = ref<RichTurn[]>([])
const draft = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const lastResponse = ref<TestBenchResponse | null>(null)
const showPromptPreview = ref(false)

async function resolveImageAttachments(
  intents: TestBenchIntent[],
): Promise<AssistantAttachment[]> {
  const out: AssistantAttachment[] = []
  for (const i of intents) {
    if (i.type !== 'image') continue
    if (!i.assetId) continue
    try {
      const { url } = await mediaAssets.getDownloadUrl(botId, i.assetId)
      if (url) {
        out.push({
          type: 'image',
          url,
          caption: i.caption,
          resourceKey: i.resourceKey,
        })
      }
    } catch {
      // La imagen no se pudo resolver — no rompe la respuesta; sigue
      // apareciendo como tag en el panel de debug de abajo.
    }
  }
  return out
}

async function send(): Promise<void> {
  const text = draft.value.trim()
  if (!text || loading.value) return
  loading.value = true
  error.value = null
  try {
    const priorHistory = history.value.map((t) => ({ role: t.role, content: t.content }))
    history.value.push({ role: 'USER', content: text })
    draft.value = ''
    const res = await bench.run(botId, text, priorHistory)
    lastResponse.value = res
    const assistantReply = res.intents
      .filter((i) => i.type === 'text' && i.message)
      .map((i) => i.message)
      .join('\n')
    const attachments = await resolveImageAttachments(res.intents)
    if (assistantReply || attachments.length > 0) {
      history.value.push({
        role: 'ASSISTANT',
        content: assistantReply,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
    }
  } catch (err) {
    error.value = (err as ApiError).message
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
  <div class="max-w-[1400px]">
    <SuperadminBackLink :to="`/superadmin/companies/${tenantId}/bots/${botId}`" :label="$t('superadmin.testBench.back')" />

    <div class="mt-4 flex items-start justify-between gap-4 flex-wrap">
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-display font-semibold text-pearl tracking-tight">
          {{ $t('superadmin.testBench.title') }}
        </h1>
        <p class="text-sm text-mist mt-1 max-w-2xl leading-relaxed">
          {{ $t('superadmin.testBench.subtitle') }}
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ink-card/60 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-pearl hover:bg-ink-cardHi/60 hover:border-halo-line transition disabled:opacity-60"
        :disabled="history.length === 0 && !lastResponse"
        @click="reset"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        {{ $t('superadmin.testBench.reset') }}
      </button>
    </div>

    <div class="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 backdrop-blur-sm px-4 py-3 text-xs text-amber-200">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 shrink-0 mt-0.5" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span class="leading-relaxed">{{ $t('superadmin.testBench.warning') }}</span>
    </div>

    <div class="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] gap-6 items-start">
      <div class="lg:sticky lg:top-20">
        <ConversationPhoneFrame
          :customer-name="$t('superadmin.testBench.phoneHeaderName')"
          :customer-phone="$t('superadmin.testBench.phoneHeaderPhone')"
          status="BOT"
          :messages-count="history.length"
        >
          <template #status-extra>
            <span v-if="loading" class="italic text-emerald-100/90">· {{ $t('superadmin.testBench.processing') }}</span>
          </template>

          <div v-if="history.length === 0 && !error" class="flex h-full min-h-[300px] items-center justify-center px-6 text-center">
            <p class="text-sm text-slate-600 leading-relaxed">
              {{ $t('superadmin.testBench.emptyState') }}
            </p>
          </div>

          <div v-else class="flex flex-col gap-2">
            <div
              v-for="(turn, i) in history"
              :key="i"
              class="flex"
              :class="turn.role === 'USER' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[82%] space-y-2"
                :class="turn.role === 'USER' ? 'items-end' : 'items-start'"
              >
                <div
                  v-if="turn.content"
                  class="relative px-3 py-2 text-sm whitespace-pre-wrap shadow-sm"
                  :class="turn.role === 'USER'
                    ? 'bg-[#dcf8c6] text-slate-900 rounded-2xl rounded-br-sm'
                    : 'bg-white text-slate-900 rounded-2xl rounded-bl-sm ring-1 ring-slate-200/70'"
                >
                  {{ turn.content }}
                </div>
                <div
                  v-for="(att, k) in (turn.attachments ?? [])"
                  :key="k"
                  class="rounded-2xl overflow-hidden bg-white ring-1 ring-slate-200/70 shadow-sm max-w-full"
                >
                  <img
                    :src="att.url"
                    :alt="att.resourceKey ?? 'imagen'"
                    class="block max-w-full h-auto"
                  >
                  <div v-if="att.caption" class="px-3 py-1.5 text-xs text-slate-700">
                    {{ att.caption }}
                  </div>
                </div>
              </div>
            </div>
            <div v-if="loading" class="flex justify-start">
              <div class="rounded-2xl rounded-bl-sm bg-white px-4 py-3 ring-1 ring-slate-200/70 shadow-sm inline-flex items-center gap-1">
                <span class="size-1.5 rounded-full bg-slate-400 animate-bounce" style="animation-delay: 0ms" />
                <span class="size-1.5 rounded-full bg-slate-400 animate-bounce" style="animation-delay: 150ms" />
                <span class="size-1.5 rounded-full bg-slate-400 animate-bounce" style="animation-delay: 300ms" />
              </div>
            </div>
            <div v-if="error" class="mt-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {{ error }}
            </div>
          </div>

          <template #composer>
            <div class="flex items-end gap-2">
              <textarea
                v-model="draft"
                rows="1"
                :placeholder="$t('superadmin.testBench.placeholder')"
                class="flex-1 resize-none rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-h-32"
                @keydown="onKey"
              />
              <button
                type="button"
                class="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                :disabled="loading || !draft.trim()"
                :aria-label="$t('superadmin.testBench.send')"
                @click="send"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4 translate-x-[1px]" aria-hidden="true">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
            <p class="mt-1 text-[10px] text-slate-500 text-center">
              {{ $t('superadmin.testBench.keyHint') }}
            </p>
          </template>
        </ConversationPhoneFrame>
      </div>

      <aside class="space-y-4 min-w-0">
        <header class="rounded-3xl bg-ink-surface/70 backdrop-blur-xl ring-1 ring-line shadow-halo-glow p-5">
          <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-halo-wash ring-1 ring-halo-line">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-halo" aria-hidden="true">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-pearl">{{ $t('superadmin.testBench.debugTitle') }}</h2>
              <p class="text-xs text-mist mt-0.5 leading-relaxed">{{ $t('superadmin.testBench.debugSubtitle') }}</p>
            </div>
          </div>
        </header>

        <div v-if="!lastResponse" class="rounded-3xl bg-ink-surface/40 ring-1 ring-line/60 backdrop-blur-xl p-8 text-center">
          <p class="text-sm text-mist">—</p>
        </div>

        <template v-else>
          <section class="rounded-3xl bg-ink-surface/70 backdrop-blur-xl ring-1 ring-line shadow-halo-glow p-5">
            <h3 class="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist mb-3">
              {{ $t('superadmin.testBench.intentsSent', { n: lastResponse.intents.length }) }}
            </h3>
            <ul class="space-y-2">
              <li
                v-for="(intent, i) in lastResponse.intents"
                :key="i"
                class="flex items-start gap-2 rounded-xl bg-ink-card/60 ring-1 ring-line p-2.5"
              >
                <span class="inline-flex items-center rounded-md bg-halo-wash px-1.5 py-0.5 text-[10px] font-mono font-semibold text-halo ring-1 ring-halo-line shrink-0">
                  {{ intent.type }}
                </span>
                <span class="text-sm text-pearl whitespace-pre-wrap flex-1 break-words">{{
                  intent.message ?? intent.caption ?? intent.resourceKey ?? $t('superadmin.testBench.noBody')
                }}</span>
              </li>
            </ul>
          </section>

          <section
            v-if="lastResponse.toolCalls.length > 0"
            class="rounded-3xl bg-ink-surface/70 backdrop-blur-xl ring-1 ring-line shadow-halo-glow p-5"
          >
            <h3 class="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist mb-3">
              {{ $t('superadmin.testBench.toolsInvoked', { n: lastResponse.toolCalls.length }) }}
            </h3>
            <ul class="space-y-3">
              <li
                v-for="(call, i) in lastResponse.toolCalls"
                :key="i"
                class="border-l-2 border-halo-line pl-3"
              >
                <div class="font-mono text-xs text-pearl">{{ call.name }}</div>
                <details class="text-xs text-mist mt-1 group">
                  <summary class="cursor-pointer hover:text-pearl transition select-none">{{ $t('superadmin.testBench.detail') }}</summary>
                  <pre class="mt-2 whitespace-pre-wrap break-all bg-ink-card/60 ring-1 ring-line p-3 rounded-xl text-[11px] text-pearl font-mono">input: {{ JSON.stringify(call.input, null, 2) }}
result: {{ JSON.stringify(call.result, null, 2) }}</pre>
                </details>
              </li>
            </ul>
          </section>

          <section
            v-if="lastResponse.ragChunks.length > 0"
            class="rounded-3xl bg-ink-surface/70 backdrop-blur-xl ring-1 ring-line shadow-halo-glow p-5"
          >
            <h3 class="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist mb-3">
              {{ $t('superadmin.testBench.docsConsulted', { n: lastResponse.ragChunks.length }) }}
            </h3>
            <ul class="space-y-1.5">
              <li
                v-for="c in lastResponse.ragChunks"
                :key="c.documentId"
                class="flex items-center gap-2 rounded-lg bg-ink-card/60 ring-1 ring-line px-2.5 py-1.5"
              >
                <span class="text-[10px] font-mono text-halo bg-halo-wash px-1.5 py-0.5 rounded ring-1 ring-halo-line/50 shrink-0">{{ c.distance.toFixed(3) }}</span>
                <span class="text-sm text-pearl truncate">{{ c.label }}</span>
              </li>
            </ul>
          </section>

          <section class="rounded-3xl bg-ink-surface/70 backdrop-blur-xl ring-1 ring-line shadow-halo-glow p-5">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-halo hover:text-halo-dim transition"
              @click="showPromptPreview = !showPromptPreview"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 transition-transform" :class="showPromptPreview ? 'rotate-90' : ''" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {{ showPromptPreview ? $t('superadmin.testBench.hidePrompt') : $t('superadmin.testBench.showPrompt') }}
            </button>
            <pre
              v-if="showPromptPreview"
              class="mt-3 whitespace-pre-wrap break-words bg-ink-card/60 ring-1 ring-line p-4 rounded-xl text-[11px] text-pearl font-mono max-h-[400px] overflow-y-auto"
            >{{ lastResponse.systemPromptPreview }}</pre>
          </section>
        </template>
      </aside>
    </div>
  </div>
</template>
