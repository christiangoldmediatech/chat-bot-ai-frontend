<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const tenantId = route.params.id as string
const botId = route.params.botId as string
const bots = useBots(tenantId)

const bot = ref<Bot | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    bot.value = await bots.get(botId)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

await load()
</script>

<template>
  <div class="max-w-[1400px]">
    <NuxtLink :to="`/superadmin/companies/${tenantId}/bots/${botId}`" class="text-sm text-slate-400 hover:text-slate-200">← {{ $t('admin.calendarView.backToBot') }}</NuxtLink>

    <section class="mt-3 rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-800 shadow-glass-lg p-6">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          {{ $t('admin.calendarView.badge') }}
        </span>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-100">{{ $t('admin.calendarView.title') }}</h1>
        <span v-if="bot" class="text-slate-400 text-base">— {{ bot.name }}</span>
      </div>
      <p class="text-slate-400 text-sm mt-2">{{ $t('admin.calendarView.subtitle') }}</p>
    </section>

    <p v-if="error" class="mt-4 rounded-2xl border border-danger-800 bg-danger-950/80 p-3 text-sm text-danger-300">{{ error }}</p>

    <div v-if="loading && !bot" class="mt-6"><SpinnerInline tone="dark" /></div>

    <div v-else-if="bot" class="mt-6">
      <CalendarShell :bot-id="botId" :tenant-id="tenantId" />
    </div>
  </div>
</template>
