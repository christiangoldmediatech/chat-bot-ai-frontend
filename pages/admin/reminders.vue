<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth' })

const { t } = useI18n()
const activeBot = useActiveBotStore()

const botId = computed<string | null>(() => activeBot.botId)
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 md:p-6 space-y-5">
    <header>
      <h1 class="text-xl font-semibold text-pearl md:text-slate-900">{{ t('admin.reminders.pageTitle') }}</h1>
      <p class="mt-1 text-sm text-mist md:text-slate-600 max-w-prose">{{ t('admin.reminders.pageSubtitle') }}</p>
    </header>

    <div v-if="!botId" class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6 text-center">
      <p class="text-sm font-medium text-slate-800">{{ t('admin.reminders.noBotTitle') }}</p>
      <p class="mt-1 text-xs text-slate-500">{{ t('admin.reminders.noBotHint') }}</p>
    </div>

    <AppointmentRemindersCard
      v-else
      :key="botId"
      :bot-id="botId"
    />
  </div>
</template>
