<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const activeBot = useActiveBotStore()
const botId = computed(() => activeBot.botId)
const integration = useCalendarIntegration()
const timezone = ref<string | undefined>(undefined)

async function loadTimezone(id: string): Promise<void> {
  try {
    const data = await integration.get(id)
    timezone.value = data?.timezone ?? undefined
  } catch {
    timezone.value = undefined
  }
}

watch(botId, (id) => {
  if (id) loadTimezone(id)
  else timezone.value = undefined
}, { immediate: true })
</script>

<template>
  <div class="max-w-5xl">
    <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-6">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ $t('nav.schedule') }}
        </h1>
        <span v-if="activeBot.bot" class="text-slate-500 text-base">— {{ activeBot.bot.name }}</span>
      </div>
      <p class="text-slate-600 text-sm mt-2">
        {{ $t('admin.businessHours.subtitle') }}
      </p>
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

    <div v-else-if="botId" :key="botId" class="mt-6 space-y-6">
      <BotBusinessHoursCard :bot-id="botId" />
      <BotScheduleBlocksCard :bot-id="botId" :timezone="timezone" />
    </div>

    <div v-else class="mt-6"><SpinnerInline /></div>
  </div>
</template>
