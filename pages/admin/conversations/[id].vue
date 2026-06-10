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

function statusClass(s: ConversationStatus): string {
  return {
    BOT: 'bg-blue-50 text-blue-700 border-blue-200',
    HUMAN: 'bg-amber-50 text-amber-700 border-amber-200',
    CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  }[s]
}
</script>

<template>
  <div>
    <NuxtLink to="/admin/conversations" class="text-sm text-slate-500 hover:text-slate-700">{{ $t('conversations.detail.back') }}</NuxtLink>

    <p v-if="error" class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <template v-else-if="data">
      <header class="mt-2 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-semibold flex items-center gap-3">
            {{ data.customerName || data.customerPhone }}
            <span
              class="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
              :class="statusClass(data.status)"
            >
              {{ data.status }}
            </span>
          </h1>
          <div class="mt-1 text-sm text-slate-500 font-mono">{{ data.customerPhone }}</div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            :disabled="data.status === 'HUMAN'"
            class="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="changeStatus('HUMAN')"
          >
            {{ $t('conversations.detail.takeOver') }}
          </button>
          <button
            type="button"
            :disabled="data.status === 'BOT'"
            class="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-800 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="changeStatus('BOT')"
          >
            {{ $t('conversations.detail.handBack') }}
          </button>
          <button
            type="button"
            :disabled="data.status === 'CLOSED'"
            class="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="changeStatus('CLOSED')"
          >
            {{ $t('conversations.detail.close') }}
          </button>
        </div>
      </header>

      <p v-if="statusError" class="mt-3 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
        {{ statusError }}
      </p>

      <section class="mt-6 rounded-2xl bg-white/60 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-4 max-h-[60vh] overflow-y-auto">
        <ChatMessages :messages="data.messages" :bot-id="data.botId" />
        <p v-if="data.messages.length === 0" class="text-sm text-slate-400 text-center py-6">
          {{ $t('conversations.detail.noMessages') }}
        </p>
      </section>

      <!-- Agent input: only when HUMAN. Backend rejects sends in BOT/CLOSED. -->
      <section
        v-if="data.status === 'HUMAN'"
        class="mt-4 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-4"
      >
        <label class="block text-sm font-medium text-slate-700">{{ $t('conversations.detail.sendAsAgent') }}</label>
        <form class="mt-2 flex gap-2" @submit.prevent="onSend">
          <textarea
            v-model="newMessage"
            rows="2"
            required
            :placeholder="$t('conversations.detail.composerPlaceholder')"
            class="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
          />
          <button
            type="submit"
            class="self-end rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            :disabled="sending || !newMessage.trim()"
          >
            {{ sending ? $t('conversations.detail.sending') : $t('conversations.detail.send') }}
          </button>
        </form>
        <p v-if="sendError" class="mt-2 text-sm text-danger-700">{{ sendError }}</p>
        <p class="mt-2 text-xs text-slate-500">
          {{ $t('conversations.detail.composerNote') }}
        </p>
      </section>

      <p
        v-else-if="data.status === 'CLOSED'"
        class="mt-4 text-sm text-slate-500 italic"
      >
        {{ $t('conversations.detail.closedNote') }}
      </p>
      <p
        v-else
        class="mt-4 text-sm text-slate-500 italic"
      >
        {{ $t('conversations.detail.botActiveNote') }}
      </p>
    </template>
  </div>
</template>
