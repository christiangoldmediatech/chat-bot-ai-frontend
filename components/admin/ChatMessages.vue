<script setup lang="ts">
import type { Message } from '~/types/conversation'

defineProps<{
  messages: Message[]
  /** Required for ChatMessageBubble to lazy-fetch outbound asset preview URLs. */
  botId: string
  /** When set, fetches use the superadmin route variant. */
  tenantId?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="flex items-end gap-2"
      :class="msg.role === 'USER' ? 'justify-start' : 'justify-end'"
    >
      <!-- Kaibot avatar before assistant replies (right-aligned bubble) -->
      <KaibotLogo
        v-if="msg.role === 'ASSISTANT'"
        :size="28"
        rounded="rounded-full"
        class="order-2 ml-1 bg-white ring-1 ring-white/70 shadow-sm"
        alt="Kaibot"
      />
      <div
        class="max-w-[70%] rounded-2xl px-4 py-2 text-sm"
        :class="[
          msg.role === 'USER'
            ? 'bg-white border border-slate-200 text-slate-800'
            : msg.role === 'ASSISTANT'
              ? 'bg-slate-900 text-white order-1'
              : 'bg-slate-100 text-slate-600 italic',
        ]"
      >
        <div
          v-if="msg.role === 'ASSISTANT'"
          class="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-success-300"
        >
          Kaibot
        </div>

        <ChatMessageBubble :message="msg" :bot-id="botId" :tenant-id="tenantId" />

        <div class="mt-1 flex items-center justify-end gap-1.5 text-[10px]">
          <span
            :class="
              msg.role === 'ASSISTANT'
                ? 'text-white/70'
                : msg.role === 'USER'
                  ? 'text-slate-500'
                  : 'text-slate-500'
            "
          >{{ new Date(msg.createdAt).toLocaleString() }}</span>
          <ChatDeliveryStatus
            v-if="msg.role === 'ASSISTANT'"
            :status="msg.deliveryStatus"
            :error="msg.deliveryError"
          />
        </div>
      </div>
    </div>
  </div>
</template>
