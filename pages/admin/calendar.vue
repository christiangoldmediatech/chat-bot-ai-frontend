<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const activeBot = useActiveBotStore()
const botId = computed(() => activeBot.botId)
</script>

<template>
  <div class="max-w-[1400px]">
    <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-6">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-100">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {{ $t('admin.calendarView.badge') }}
        </span>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ $t('admin.calendarView.title') }}
        </h1>
        <span v-if="activeBot.bot" class="text-slate-500 text-base">— {{ activeBot.bot.name }}</span>
      </div>
      <p class="text-slate-600 text-sm mt-2">{{ $t('admin.calendarView.subtitle') }}</p>
    </section>

    <EmptyState
      v-if="!activeBot.loading && !botId"
      :title="$t('activeBot.noBots')"
      :description="$t('activeBot.noBotsHint')"
      class="mt-6"
    >
      <NuxtLink
        to="/admin/bots/create"
        class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
      >
        {{ $t('activeBot.noBotsCta') }}
      </NuxtLink>
    </EmptyState>

    <div v-else-if="botId" :key="botId" class="mt-6">
      <CalendarShell :bot-id="botId" />
    </div>

    <div v-else class="mt-6"><SpinnerInline /></div>
  </div>
</template>
