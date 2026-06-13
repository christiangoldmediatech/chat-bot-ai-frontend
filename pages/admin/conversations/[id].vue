<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  ConversationDetail,
  ConversationStatus,
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
            <form
              v-if="data.status === 'HUMAN'"
              class="flex items-end gap-2"
              @submit.prevent="onSend"
            >
              <textarea
                v-model="newMessage"
                rows="1"
                required
                :placeholder="$t('conversations.detail.composerPlaceholder')"
                class="min-h-[2.5rem] max-h-32 flex-1 resize-none rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <button
                type="submit"
                :disabled="sending || !newMessage.trim()"
                :aria-label="$t('conversations.detail.send')"
                class="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
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
          <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-4">
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

          <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-4">
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
                @click="changeStatus('BOT')"
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
        </aside>
      </div>
    </template>
  </div>
</template>
