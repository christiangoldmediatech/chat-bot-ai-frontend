<script setup lang="ts">
import type { Bot } from '~/types/bot'

const activeBot = useActiveBotStore()

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

function toggle(): void {
  open.value = !open.value
}
function close(): void {
  open.value = false
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p.charAt(0).toUpperCase()).join('') || '?'
}

function colorFor(id: string): string {
  const palettes = [
    'from-sky-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-fuchsia-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-violet-400 to-purple-500',
    'from-rose-400 to-red-500',
  ]
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return palettes[hash % palettes.length]
}

function pick(bot: Bot): void {
  if (bot.id === activeBot.botId) {
    close()
    return
  }
  activeBot.setActive(bot.id)
  close()
}

function onDocClick(event: MouseEvent): void {
  if (!open.value) return
  const target = event.target as Node
  if (triggerRef.value?.contains(target)) return
  if (panelRef.value?.contains(target)) return
  close()
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) {
    close()
    triggerRef.value?.focus()
  }
}

onMounted(() => {
  if (!import.meta.client) return
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="relative">
    <!-- Loading state: skeleton that still signals "a bot is being picked" -->
    <div
      v-if="!activeBot.loaded"
      class="flex items-center gap-2.5 rounded-xl bg-brand-gradient px-3 py-1.5 shadow-halo-glow"
      :aria-label="$t('activeBot.loading')"
    >
      <div class="size-8 rounded-lg bg-white/20 animate-pulse" />
      <div class="flex flex-col gap-1">
        <div class="h-2 w-20 rounded bg-white/30 animate-pulse" />
        <div class="h-3 w-28 rounded bg-white/40 animate-pulse" />
      </div>
    </div>

    <!-- Empty state: no bots on the account -->
    <NuxtLink
      v-else-if="!activeBot.hasBots"
      to="/admin/bots/create"
      class="flex items-center gap-2 rounded-xl border border-dashed border-amber-400/60 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-200 hover:bg-amber-500/20 transition"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <span>{{ $t('activeBot.createFirst') }}</span>
    </NuxtLink>

    <!-- Active bot chip: prominent, always shows the name -->
    <button
      v-else
      ref="triggerRef"
      type="button"
      class="flex items-center gap-2.5 rounded-xl bg-brand-gradient px-3 py-1.5 text-ink-tealDeep shadow-halo-glow hover:brightness-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-highlight/60 disabled:cursor-default disabled:hover:brightness-100"
      :aria-haspopup="activeBot.hasMultiple ? 'listbox' : undefined"
      :aria-expanded="activeBot.hasMultiple ? open : undefined"
      :disabled="!activeBot.hasMultiple"
      :title="activeBot.bot ? activeBot.bot.name : ''"
      @click="activeBot.hasMultiple && toggle()"
    >
      <span
        class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-semibold text-white shadow-sm ring-1 ring-white/40"
        :class="colorFor(activeBot.botId || '')"
        aria-hidden="true"
      >
        {{ activeBot.bot ? initials(activeBot.bot.name) : '?' }}
      </span>
      <span class="flex flex-col items-start leading-tight min-w-0">
        <span class="text-[9px] uppercase tracking-wider font-semibold opacity-70">{{ $t('activeBot.workingWith') }}</span>
        <span class="text-sm font-semibold truncate max-w-[120px] sm:max-w-[200px]">
          {{ activeBot.bot?.name }}
        </span>
      </span>
      <svg
        v-if="activeBot.hasMultiple"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-4 transition-transform"
        :class="open && 'rotate-180'"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open && activeBot.hasMultiple"
        ref="panelRef"
        class="absolute left-0 mt-2 w-80 origin-top-left rounded-2xl border border-halo-line/40 bg-ink-deep/95 backdrop-blur-xl shadow-2xl ring-1 ring-halo-line/20 z-50 overflow-hidden"
        role="listbox"
        :aria-label="$t('activeBot.pickerLabel')"
      >
        <div class="px-3 pt-3 pb-2 border-b border-halo-line/30">
          <p class="text-[10px] uppercase tracking-wide text-mist-dim font-semibold">
            {{ $t('activeBot.pickerTitle') }}
          </p>
          <p class="text-[11px] text-mist mt-0.5">{{ $t('activeBot.pickerHint') }}</p>
        </div>
        <ul class="max-h-80 overflow-y-auto py-1">
          <li v-for="bot in activeBot.allBots" :key="bot.id">
            <button
              type="button"
              class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-ink-card/70 transition focus:outline-none focus-visible:bg-ink-card/70"
              :aria-current="bot.id === activeBot.botId ? 'true' : undefined"
              @click="pick(bot)"
            >
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-semibold text-white shadow-sm"
                :class="colorFor(bot.id)"
                aria-hidden="true"
              >
                {{ initials(bot.name) }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-1.5">
                  <span class="text-sm font-medium text-pearl truncate">{{ bot.name }}</span>
                  <span
                    v-if="!bot.isActive"
                    class="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800/60 text-slate-400 uppercase tracking-wide"
                  >
                    {{ $t('activeBot.inactive') }}
                  </span>
                </span>
                <span v-if="bot.phoneNumber" class="block text-[11px] text-mist-dim truncate">
                  {{ bot.phoneNumber }}
                </span>
              </span>
              <svg
                v-if="bot.id === activeBot.botId"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-4 shrink-0 text-brand-highlight"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </li>
        </ul>
        <div class="border-t border-halo-line/30 py-1">
          <NuxtLink
            to="/admin/bots"
            class="flex items-center gap-2 px-3 py-2 text-xs text-mist hover:bg-ink-card/70 hover:text-pearl transition"
            @click="close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            {{ $t('activeBot.manage') }}
          </NuxtLink>
          <NuxtLink
            to="/admin/bots/create"
            class="flex items-center gap-2 px-3 py-2 text-xs text-mist hover:bg-ink-card/70 hover:text-pearl transition"
            @click="close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {{ $t('activeBot.createNew') }}
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>
