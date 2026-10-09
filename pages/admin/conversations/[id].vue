<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  ConversationDetail,
  ConversationStatus,
  Message,
} from '~/types/conversation'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const route = useRoute()
const conversationsApi = useConversations()
const id = route.params.id as string

const data = ref<ConversationDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const statusError = ref<string | null>(null)
const sending = ref(false)
const sendError = ref<string | null>(null)
const newMessage = ref('')
const handBackConfirmOpen = ref(false)
const templateModalOpen = ref(false)
const mediaModalOpen = ref(false)
const casesRefreshSignal = ref(0)

const WINDOW_MS = 24 * 60 * 60 * 1000
const nowTick = ref<number>(Date.now())
let nowInterval: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (!import.meta.client) return
  nowInterval = setInterval(() => { nowTick.value = Date.now() }, 60_000)
})
onBeforeUnmount(() => {
  if (nowInterval) {
    clearInterval(nowInterval)
    nowInterval = null
  }
})

const withinServiceWindow = computed<boolean>(() => {
  if (!data.value) return false
  const lastInbound = [...data.value.messages]
    .reverse()
    .find(m => m.role === 'USER')
  if (!lastInbound) return false
  const ts = new Date(lastInbound.createdAt).getTime()
  if (Number.isNaN(ts)) return false
  return nowTick.value - ts < WINDOW_MS
})

const freeFormDisabled = computed<boolean>(() => !withinServiceWindow.value)

function onOutboundMessage(msg: Message): void {
  if (!data.value) return
  data.value.messages.push(msg)
  data.value.lastMessageAt = msg.createdAt
}

function onTemplateSent(msg: Message): void {
  onOutboundMessage(msg)
}

function onMediaSent(msg: Message): void {
  onOutboundMessage(msg)
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await conversationsApi.get(id)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function changeStatus(status: ConversationStatus): Promise<void> {
  statusError.value = null
  try {
    const updated = await conversationsApi.updateStatus(id, status)
    if (data.value) {
      data.value.status = updated.status
    }
  } catch (err) {
    statusError.value = (err as ApiError).message
  }
}

function onClickHandBack(): void {
  if (!data.value || data.value.status !== 'HUMAN') return
  handBackConfirmOpen.value = true
}

async function confirmHandBack(): Promise<void> {
  handBackConfirmOpen.value = false
  await changeStatus('BOT')
}

async function onSend(): Promise<void> {
  if (!newMessage.value.trim() || !data.value) return
  sending.value = true
  sendError.value = null
  try {
    const msg = await conversationsApi.sendAgentMessage(id, newMessage.value)
    data.value.messages.push(msg)
    data.value.lastMessageAt = msg.createdAt
    newMessage.value = ''
  } catch (err) {
    sendError.value = (err as ApiError).message
  } finally {
    sending.value = false
  }
}

await load()

// Live sync so the panel behaves like a real chat: new customer messages and
// delivery-status updates arrive without a page refresh.
// - Poll every 5s using `?after=<lastCreatedAt>` so only fresh rows travel.
// - Merge by id — replace existing rows to pick up deliveryStatus/READ updates
//   without duplicating, and append genuinely new ones.
// - Pause when the tab is hidden (matches the LandingHeroCanvas pattern) to
//   avoid burning API calls in a background tab.
// - Also re-sync `status`/`lastMessageAt` so a takeover from another operator
//   is reflected here.
const POLL_INTERVAL_MS = 5000
let pollHandle: ReturnType<typeof setInterval> | null = null

function mergeMessages(incoming: Message[]): void {
  if (!data.value || incoming.length === 0) return
  const byId = new Map<string, Message>()
  for (const m of data.value.messages) byId.set(m.id, m)
  for (const m of incoming) byId.set(m.id, m)
  const merged = Array.from(byId.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
  data.value.messages = merged
  const last = merged[merged.length - 1]
  if (last) data.value.lastMessageAt = last.createdAt
}

async function pollTick(): Promise<void> {
  if (!data.value) return
  if (typeof document !== 'undefined' && document.hidden) return
  try {
    const last = data.value.messages[data.value.messages.length - 1]
    const after = last ? last.createdAt : undefined
    const incoming = await conversationsApi.getMessagesAfter(id, after)
    mergeMessages(incoming)
    if (incoming.length > 0) casesRefreshSignal.value += 1
    // Refresh conversation status too — another user may have handed back to
    // the bot or closed the conversation while this panel was open.
    if (incoming.length > 0 || Math.random() < 0.2) {
      const fresh = await conversationsApi.get(id)
      if (data.value) {
        data.value.status = fresh.status
      }
      casesRefreshSignal.value += 1
    }
  } catch {
    // Silent — the next tick will retry. Explicit errors surface on user
    // actions (send / status change), not on background polling.
  }
}

onMounted(() => {
  pollHandle = setInterval(() => {
    void pollTick()
  }, POLL_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (pollHandle) {
    clearInterval(pollHandle)
    pollHandle = null
  }
})

function statusBadgeClass(s: ConversationStatus): string {
  return {
    BOT: 'bg-sky-50 text-sky-700 ring-sky-200',
    HUMAN: 'bg-amber-50 text-amber-700 ring-amber-200',
    CLOSED: 'bg-slate-100 text-slate-600 ring-slate-200',
  }[s]
}
</script>

<template>
  <div>
    <NuxtLink
      to="/admin/conversations"
      class="text-sm text-slate-500 hover:text-slate-700"
    >
      {{ $t('conversations.detail.back') }}
    </NuxtLink>

    <p
      v-if="error"
      class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700"
    >
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <template v-else-if="data">
      <div class="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-start gap-6">
        <!-- Phone frame with chat thread + composer -->
        <ConversationPhoneFrame
          :customer-name="data.customerName"
          :customer-phone="data.customerPhone"
          :status="data.status"
          :messages-count="data.messages.length"
        >
          <ChatMessages :messages="data.messages" :bot-id="data.botId" />
          <p
            v-if="data.messages.length === 0"
            class="text-sm text-slate-400 text-center py-6"
          >
            {{ $t('conversations.detail.noMessages') }}
          </p>

          <template #composer>
            <!-- HUMAN: WhatsApp-style composer -->
            <div v-if="data.status === 'HUMAN'" class="space-y-2">
              <div
                v-if="freeFormDisabled"
                class="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                role="status"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 size-4 shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div class="min-w-0 flex-1">
                  <p class="font-semibold">{{ $t('admin.templates.windowClosed.title') }}</p>
                  <p class="mt-0.5 leading-snug">{{ $t('admin.templates.windowClosed.hint') }}</p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 transition"
                  @click="templateModalOpen = true"
                >
                  {{ $t('admin.templates.windowClosed.cta') }}
                </button>
              </div>

              <form class="flex items-end gap-2" @submit.prevent="onSend">
                <textarea
                  v-model="newMessage"
                  rows="1"
                  required
                  :disabled="freeFormDisabled"
                  :placeholder="freeFormDisabled ? $t('admin.templates.windowClosed.title') : $t('conversations.detail.composerPlaceholder')"
                  class="min-h-[2.5rem] max-h-32 flex-1 resize-none rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:placeholder:text-slate-400"
                  @keydown.enter.exact.prevent="onSend"
                />
                <button
                  type="button"
                  :disabled="freeFormDisabled"
                  :aria-label="$t('admin.templates.convMedia.openButton')"
                  :title="freeFormDisabled ? $t('admin.templates.windowClosed.title') : $t('admin.templates.convMedia.openButton')"
                  class="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-slate-100 disabled:hover:text-slate-600"
                  @click="mediaModalOpen = true"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <button
                  type="button"
                  :aria-label="$t('admin.templates.convSend.openButton')"
                  :title="$t('admin.templates.convSend.openButton')"
                  class="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-200 hover:text-slate-800"
                  @click="templateModalOpen = true"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
                    <rect x="4" y="3" width="14" height="16" rx="2" />
                    <path d="M20 7v12a2 2 0 0 1-2 2H8" />
                    <line x1="8" y1="8" x2="14" y2="8" />
                    <line x1="8" y1="12" x2="14" y2="12" />
                  </svg>
                </button>
                <button
                  type="submit"
                  :disabled="sending || !newMessage.trim() || freeFormDisabled"
                  :aria-label="$t('conversations.detail.send')"
                  class="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
                >
                  <svg
                    v-if="!sending"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="size-5"
                    aria-hidden="true"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <SpinnerInline v-else />
                </button>
              </form>
            </div>

            <p
              v-else-if="data.status === 'CLOSED'"
              class="text-center text-xs text-slate-500 italic py-1.5"
            >
              {{ $t('conversations.detail.closedNote') }}
            </p>
            <p
              v-else
              class="text-center text-xs text-slate-500 italic py-1.5"
            >
              {{ $t('conversations.detail.botActiveNote') }}
            </p>
          </template>
        </ConversationPhoneFrame>

        <!-- Side controls panel -->
        <aside class="space-y-4">
          <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-4">
            <h2 class="text-sm font-semibold text-slate-900">
              {{ data.customerName || data.customerPhone }}
            </h2>
            <p class="mt-1 text-xs font-mono text-slate-500">{{ data.customerPhone }}</p>
            <span
              class="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1"
              :class="statusBadgeClass(data.status)"
            >
              {{ data.status }}
            </span>
          </section>

          <ConversationCasesCard
            :conversation-id="data.id"
            :bot-id="data.botId"
            :customer-phone="data.customerPhone"
            :conversation-status="data.status"
            :refresh-signal="casesRefreshSignal"
          />

          <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-4">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {{ $t('conversations.detail.actionsTitle') }}
            </h3>
            <div class="mt-3 flex flex-col gap-2">
              <button
                type="button"
                :disabled="data.status === 'HUMAN'"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="changeStatus('HUMAN')"
              >
                {{ $t('conversations.detail.takeOver') }}
              </button>
              <button
                type="button"
                :disabled="data.status === 'BOT'"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="onClickHandBack"
              >
                {{ $t('conversations.detail.handBack') }}
              </button>
              <button
                type="button"
                :disabled="data.status === 'CLOSED'"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="changeStatus('CLOSED')"
              >
                {{ $t('conversations.detail.close') }}
              </button>
            </div>

            <p
              v-if="statusError"
              class="mt-3 rounded-md border border-danger-200 bg-danger-50 p-2 text-xs text-danger-700"
            >
              {{ statusError }}
            </p>
            <p
              v-if="sendError"
              class="mt-3 rounded-md border border-danger-200 bg-danger-50 p-2 text-xs text-danger-700"
            >
              {{ sendError }}
            </p>

            <p class="mt-3 text-[11px] text-slate-500">
              {{ $t('conversations.detail.composerNote') }}
            </p>
          </section>

          <ConversationSecurityCard
            :conversation-id="data.id"
            mode="tenant"
          />
        </aside>
      </div>
    </template>

    <ConfirmDialog
      :open="handBackConfirmOpen"
      tone="warning"
      :title="$t('conversations.detail.handBackConfirmTitle')"
      :message="$t('conversations.detail.handBackConfirmMessage')"
      :confirm-label="$t('conversations.detail.handBack')"
      @confirm="confirmHandBack"
      @cancel="handBackConfirmOpen = false"
    />

    <SendTemplateModal
      v-if="data"
      :open="templateModalOpen"
      :conversation-id="data.id"
      :bot-id="data.botId"
      @close="templateModalOpen = false"
      @sent="onTemplateSent"
    />

    <SendMediaModal
      v-if="data"
      :open="mediaModalOpen"
      :conversation-id="data.id"
      @close="mediaModalOpen = false"
      @sent="onMediaSent"
    />
  </div>
</template>
