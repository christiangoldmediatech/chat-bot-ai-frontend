<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { ConversationDetail, ConversationStatus } from '~/types/conversation'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const tenantId = route.params.id as string
const conversationId = route.params.conversationId as string
const conversationsApi = useConversations(tenantId)

const data = ref<ConversationDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await conversationsApi.get(conversationId)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
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
      :to="`/superadmin/companies/${tenantId}/conversations`"
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
        <ConversationPhoneFrame
          :customer-name="data.customerName"
          :customer-phone="data.customerPhone"
          :status="data.status"
        >
          <ChatMessages
            :messages="data.messages"
            :bot-id="data.botId"
            :tenant-id="tenantId"
          />
          <p
            v-if="data.messages.length === 0"
            class="text-sm text-slate-400 text-center py-6"
          >
            {{ $t('conversations.detail.noMessages') }}
          </p>

          <template #composer>
            <p class="text-center text-xs text-slate-500 italic py-1.5">
              {{ $t('superadmin.companyConversations.readOnlyNote') }}
            </p>
          </template>
        </ConversationPhoneFrame>

        <aside class="space-y-4">
          <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-4">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h2 class="text-sm font-semibold text-slate-900 truncate">
                  {{ data.customerName || data.customerPhone }}
                </h2>
                <p class="mt-1 text-xs font-mono text-slate-500">{{ data.customerPhone }}</p>
              </div>
              <span
                class="shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ring-1 bg-slate-100 text-slate-600 ring-slate-200"
              >
                {{ $t('superadmin.companyConversations.readOnlyBadge') }}
              </span>
            </div>
            <span
              class="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1"
              :class="statusBadgeClass(data.status)"
            >
              {{ data.status }}
            </span>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>
