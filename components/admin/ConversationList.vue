<script setup lang="ts">
import type { Conversation, ConversationStatus } from '~/types/conversation'

defineProps<{
  conversations: Conversation[]
  emptyLabel?: string
}>()

const statusStyles: Record<ConversationStatus, { chip: string, dot: string }> = {
  BOT: {
    chip: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    dot: 'bg-indigo-500',
  },
  HUMAN: {
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    dot: 'bg-emerald-500',
  },
  CLOSED: {
    chip: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
  },
}
</script>

<template>
  <ul class="divide-y divide-slate-100/80 overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass">
    <li
      v-if="conversations.length === 0"
      class="flex flex-col items-center gap-2 px-4 py-10 text-center"
    >
      <div class="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <p class="text-sm text-slate-500">{{ emptyLabel ?? 'No conversations' }}</p>
    </li>
    <li
      v-for="c in conversations"
      v-else
      :key="c.id"
      class="group transition hover:bg-white/80"
    >
      <NuxtLink
        :to="`/admin/conversations/${c.id}`"
        class="flex items-center gap-3 px-4 py-3"
      >
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white text-sm font-semibold ring-1 ring-white/60 shadow-sm">
          {{ (c.customerName || c.customerPhone || '?').charAt(0).toUpperCase() }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="font-medium text-slate-900 truncate">
            {{ c.customerName || c.customerPhone }}
          </div>
          <div class="text-xs text-slate-500 truncate font-mono">{{ c.customerPhone }}</div>
        </div>
        <span
          class="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset"
          :class="statusStyles[c.status].chip"
        >
          <span class="size-1.5 rounded-full" :class="statusStyles[c.status].dot" />
          {{ c.status }}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 group-hover:text-slate-500"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </NuxtLink>
    </li>
  </ul>
</template>
