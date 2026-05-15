<script setup lang="ts">
import type { Message } from '~/types/conversation'

defineProps<{
  messages: Message[]
}>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="flex"
      :class="msg.role === 'USER' ? 'justify-start' : 'justify-end'"
    >
      <div
        class="max-w-[70%] rounded-2xl px-4 py-2 text-sm"
        :class="
          msg.role === 'USER'
            ? 'bg-white border border-slate-200 text-slate-800'
            : 'bg-slate-900 text-white'
        "
      >
        <div class="whitespace-pre-wrap">{{ msg.content }}</div>
        <div
          class="mt-1 text-[10px] opacity-70"
        >
          {{ new Date(msg.createdAt).toLocaleString() }}
        </div>
      </div>
    </div>
  </div>
</template>
