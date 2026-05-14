<script setup lang="ts">
import type { Conversation } from '~/types/conversation'

defineProps<{
  conversations: Conversation[]
}>()
</script>

<template>
  <ul class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
    <li v-if="conversations.length === 0" class="px-4 py-6 text-center text-slate-400 text-sm">
      Sin conversaciones
    </li>
    <li
      v-for="c in conversations"
      :key="c.id"
      class="px-4 py-3"
    >
      <NuxtLink
        :to="`/admin/conversations/${c.id}`"
        class="flex items-center justify-between gap-4"
      >
        <div class="min-w-0">
          <div class="font-medium text-slate-900 truncate">
            {{ c.customerName || c.customerPhone }}
          </div>
          <div class="text-xs text-slate-500 truncate">{{ c.customerPhone }}</div>
        </div>
        <div class="text-xs text-slate-400 shrink-0">{{ c.status }}</div>
      </NuxtLink>
    </li>
  </ul>
</template>
