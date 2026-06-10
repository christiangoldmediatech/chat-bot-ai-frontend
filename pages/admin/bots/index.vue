<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const bots = useBots()

const items = ref<Bot[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const toggling = ref<string | null>(null)

const confirmingDelete = ref<Bot | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    items.value = await bots.list()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onToggleActive(bot: Bot): Promise<void> {
  toggling.value = bot.id
  try {
    const updated = await bots.updateConfig(bot.id, { isActive: !bot.isActive })
    bot.isActive = updated.isActive
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    toggling.value = null
  }
}

async function onConfirmDelete(): Promise<void> {
  const target = confirmingDelete.value
  if (!target) return
  try {
    await bots.remove(target.id)
    items.value = items.value.filter((b) => b.id !== target.id)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    confirmingDelete.value = null
  }
}

await load()
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ $t('admin.botsList.title') }}</h1>
        <p class="text-slate-500 text-sm mt-1 max-w-2xl">
          {{ $t('admin.botsList.subtitleStart') }}
          <span class="font-medium text-success-700">{{ $t('admin.botsList.subtitleWhatsapp') }}</span>,
          <span class="font-medium text-primary-700">{{ $t('admin.botsList.subtitleAgent') }}</span>,
          <span class="font-medium text-amber-700">{{ $t('admin.botsList.subtitleDocuments') }}</span>, or
          <span class="font-medium text-sky-700">{{ $t('admin.botsList.subtitleCalendar') }}</span>.
        </p>
      </div>
      <NuxtLink
        to="/admin/bots/create"
        class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 shadow-glass transition"
      >
        {{ $t('admin.botsList.createButton') }}
      </NuxtLink>
    </div>

    <p v-if="error" class="mt-4 rounded-2xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <EmptyState
      v-else-if="items.length === 0"
      :title="$t('admin.botsList.empty.title')"
      :description="$t('admin.botsList.empty.description')"
      class="mt-6"
    >
      <NuxtLink
        to="/admin/bots/create"
        class="inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 shadow-glass transition"
      >
        {{ $t('admin.botsList.createButton') }}
      </NuxtLink>
    </EmptyState>

    <!-- Cards grid: each bot exposes two clearly-labeled config entry points. -->
    <div v-else class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <article
        v-for="bot in items"
        :key="bot.id"
        class="group relative flex flex-col rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5 hover:ring-slate-200 transition"
      >
        <!-- Header: avatar + name/description + status -->
        <header class="flex items-start gap-3">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-semibold text-base ring-1 ring-white/40 shadow-inner">
            {{ bot.name.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <NuxtLink :to="`/admin/bots/${bot.id}`" class="block font-semibold text-slate-900 hover:underline truncate">
              {{ bot.name }}
            </NuxtLink>
            <p v-if="bot.description" class="text-xs text-slate-500 mt-0.5 line-clamp-2">
              {{ bot.description }}
            </p>
          </div>
          <button
            type="button"
            class="shrink-0"
            :disabled="toggling === bot.id"
            :title="bot.isActive ? $t('admin.botsList.clickToDeactivate') : $t('admin.botsList.clickToActivate')"
            @click="onToggleActive(bot)"
          >
            <BotStatusBadge :is-active="bot.isActive" />
          </button>
        </header>

        <!-- Four config panels: deep-link straight into each setting bucket. -->
        <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- WhatsApp connection card -->
          <NuxtLink
            :to="`/admin/bots/${bot.id}/edit`"
            class="group/card flex items-start gap-3 rounded-xl bg-success-50/60 ring-1 ring-success-100 p-3 hover:bg-success-50 hover:ring-success-200 transition"
          >
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-success-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4 text-success-600" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[11px] uppercase tracking-wider font-semibold text-success-700">{{ $t('admin.botsList.card.whatsappTitle') }}</p>
              <p class="mt-0.5 text-xs text-slate-700 font-mono truncate">{{ bot.whatsappPhoneId }}</p>
              <p class="mt-0.5 text-[11px] text-slate-500">{{ $t('admin.botsList.card.whatsappSubtitle') }}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-success-600 opacity-0 group-hover/card:opacity-100 self-center transition" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </NuxtLink>

          <!-- Agent behavior card -->
          <NuxtLink
            :to="`/admin/bots/${bot.id}/config`"
            class="group/card flex items-start gap-3 rounded-xl bg-primary-50/60 ring-1 ring-primary-100 p-3 hover:bg-primary-50 hover:ring-primary-200 transition"
          >
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-primary-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-primary-600" aria-hidden="true">
                <path d="M12 2a3 3 0 0 1 3 3v1.5a4.5 4.5 0 0 1 4.5 4.5V13a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4v-2a4.5 4.5 0 0 1 4.5-4.5V5a3 3 0 0 1 3-3z" />
                <line x1="9" y1="13" x2="9" y2="13" />
                <line x1="15" y1="13" x2="15" y2="13" />
                <path d="M9 21v-4M15 21v-4" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[11px] uppercase tracking-wider font-semibold text-primary-700">{{ $t('admin.botsList.card.agentTitle') }}</p>
              <p class="mt-0.5 text-xs text-slate-700 font-mono truncate">{{ bot.aiModel }}</p>
              <p class="mt-0.5 text-[11px] text-slate-500">{{ $t('admin.botsList.card.agentSubtitle', { provider: bot.aiProvider }) }}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-primary-600 opacity-0 group-hover/card:opacity-100 self-center transition" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </NuxtLink>

          <!-- Documents (RAG) card -->
          <NuxtLink
            :to="`/admin/bots/${bot.id}#documents`"
            class="group/card flex items-start gap-3 rounded-xl bg-amber-50/60 ring-1 ring-amber-100 p-3 hover:bg-amber-50 hover:ring-amber-200 transition"
          >
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-amber-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-amber-600" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="13" y2="17" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[11px] uppercase tracking-wider font-semibold text-amber-700">{{ $t('admin.botsList.card.documentsTitle') }}</p>
              <p class="mt-0.5 text-xs text-slate-700">{{ $t('admin.botsList.card.documentsBody') }}</p>
              <p class="mt-0.5 text-[11px] text-slate-500">{{ $t('admin.botsList.card.documentsSubtitle') }}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-amber-600 opacity-0 group-hover/card:opacity-100 self-center transition" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </NuxtLink>

          <!-- Google Calendar card -->
          <NuxtLink
            :to="`/admin/bots/${bot.id}#calendar`"
            class="group/card flex items-start gap-3 rounded-xl bg-sky-50/60 ring-1 ring-sky-100 p-3 hover:bg-sky-50 hover:ring-sky-200 transition"
          >
            <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-sky-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-sky-600" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[11px] uppercase tracking-wider font-semibold text-sky-700">{{ $t('admin.botsList.card.calendarTitle') }}</p>
              <p class="mt-0.5 text-xs text-slate-700">{{ $t('admin.botsList.card.calendarBody') }}</p>
              <p class="mt-0.5 text-[11px] text-slate-500">{{ $t('admin.botsList.card.calendarSubtitle') }}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-sky-600 opacity-0 group-hover/card:opacity-100 self-center transition" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </NuxtLink>
        </div>

        <!-- Footer actions -->
        <footer class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
          <NuxtLink
            :to="`/admin/bots/${bot.id}`"
            class="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:text-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {{ $t('admin.botsList.card.openDashboard') }}
          </NuxtLink>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-danger-600 hover:text-danger-700"
            @click="confirmingDelete = bot"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {{ $t('common.delete') }}
          </button>
        </footer>
      </article>
    </div>

    <ConfirmDialog
      :open="!!confirmingDelete"
      :title="$t('admin.bot.deleteConfirmTitle', { name: confirmingDelete?.name ?? '' })"
      :message="$t('admin.bot.deleteConfirmMessage')"
      :require-typed="confirmingDelete?.name"
      :require-typed-label="$t('admin.bot.deleteConfirmTyped')"
      :confirm-label="$t('admin.bot.deleteConfirmAction')"
      @cancel="confirmingDelete = null"
      @confirm="onConfirmDelete"
    />
  </div>
</template>
