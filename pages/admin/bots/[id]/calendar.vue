<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const route = useRoute()
const bots = useBots()
const id = route.params.id as string

const bot = ref<Bot | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    bot.value = await bots.get(id)
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
    <NuxtLink :to="`/admin/bots/${id}`" class="inline-flex items-center gap-1 text-sm text-white/80 hover:text-pearl drop-shadow-sm transition">← {{ $t('admin.calendarView.backToBot') }}</NuxtLink>

    <section class="mt-3 rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-6">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-100">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          {{ $t('admin.calendarView.badge') }}
        </span>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">{{ $t('admin.calendarView.title') }}</h1>
        <span v-if="bot" class="text-slate-500 text-base">— {{ bot.name }}</span>
      </div>
      <p class="text-slate-600 text-sm mt-2">{{ $t('admin.calendarView.subtitle') }}</p>
    </section>

    <p v-if="error" class="mt-4 rounded-2xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>

    <div v-if="loading && !bot" class="mt-6"><SpinnerInline /></div>

    <div v-else-if="bot" class="mt-6">
      <CalendarShell :bot-id="id" />
    </div>
  </div>
</template>
