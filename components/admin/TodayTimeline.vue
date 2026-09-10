<script setup lang="ts">
import type { TodayTimelineResponse } from '~/types/dashboard'

defineProps<{
  data: TodayTimelineResponse | null
  loading?: boolean
}>()

const { time, percent } = useDateFormat()

function statusPill(s: 'BOT' | 'HUMAN' | 'CLOSED'): string {
  switch (s) {
    case 'BOT':
      return 'bg-sky-50 text-sky-700 ring-sky-200'
    case 'HUMAN':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'CLOSED':
      return 'bg-slate-100 text-slate-500 ring-slate-200'
  }
}
</script>

<template>
  <section class="rounded-2xl bg-white backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-4">
    <header class="mb-3">
      <h3 class="text-sm font-semibold text-slate-900">{{ $t('admin.dashboard.today.title') }}</h3>
      <p v-if="data" class="text-[11px] text-slate-500 mt-0.5">
        {{ $t('admin.dashboard.today.conversion', {
          converted: data.convertedToLead,
          total: data.totalConversations,
          rate: percent(data.conversionRate, 0),
        }) }}
      </p>
    </header>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-10 rounded-lg bg-slate-100/60 animate-pulse" />
    </div>

    <ol v-else-if="data && data.entries.length > 0" class="space-y-2">
      <li
        v-for="e in data.entries"
        :key="e.conversationId"
        class="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/80 p-2.5 text-sm"
      >
        <span class="text-xs font-mono text-slate-400 w-14 shrink-0">
          {{ time(e.lastMessageAt) }}
        </span>
        <div class="flex-1 min-w-0">
          <NuxtLink
            :to="`/admin/conversations/${e.conversationId}`"
            class="font-medium text-slate-900 hover:underline"
          >
            {{ e.customerName || $t('admin.dashboard.today.noName') }}
          </NuxtLink>
          <div class="text-[11px] text-slate-500 font-mono">{{ e.customerPhone }}</div>
        </div>
        <span
          class="text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 ring-1"
          :class="statusPill(e.status)"
        >
          {{ e.status }}
        </span>
        <span
          v-if="e.isLead"
          class="text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200"
        >
          Lead
        </span>
      </li>
    </ol>

    <div v-else class="text-xs text-slate-400 py-6 text-center">
      {{ $t('admin.dashboard.today.empty') }}
    </div>
  </section>
</template>
