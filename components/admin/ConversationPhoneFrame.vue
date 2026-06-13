<script setup lang="ts">
import type { ConversationStatus } from '~/types/conversation'

defineProps<{
  /** Customer display name; falls back to phone if empty. */
  customerName?: string | null
  /** E.164 phone number — always shown as secondary line. */
  customerPhone: string
  /** Status badge in the WhatsApp-style header. */
  status: ConversationStatus
}>()

function statusDotClass(s: ConversationStatus): string {
  return {
    BOT: 'bg-sky-300',
    HUMAN: 'bg-amber-300',
    CLOSED: 'bg-slate-400',
  }[s]
}

function statusLabelKey(s: ConversationStatus): string {
  return {
    BOT: 'conversations.phone.statusBot',
    HUMAN: 'conversations.phone.statusHuman',
    CLOSED: 'conversations.phone.statusClosed',
  }[s]
}

function initials(name: string | null | undefined, phone: string): string {
  const source = (name ?? '').trim() || phone
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
</script>

<template>
  <!--
    Phone-shaped wrapper used for conversation detail views. Three slots:
      - default → chat thread (scrollable body)
      - composer → optional bottom area (text input, BOT/CLOSED notice, etc.)
      - status-extra → optional small text under the header (e.g. "typing…")
    The frame is purely cosmetic; clipping happens via overflow-hidden on the
    inner screen so children don't escape the rounded corners.
  -->
  <!--
    On `sm+` (≥640px) we render the full phone illusion (bezel, notch,
    side buttons, home indicator). On mobile we drop all the cosmetics so
    the chat fills the viewport edge-to-edge and is comfortable to read.
  -->
  <div class="mx-auto w-full sm:max-w-sm">
    <!-- Outer phone bezel — only on sm+ -->
    <div
      class="relative rounded-none sm:rounded-[2.75rem] bg-transparent sm:bg-slate-900 p-0 sm:p-2 sm:shadow-[0_30px_60px_-20px_rgba(15,23,42,0.45)] sm:ring-1 sm:ring-slate-800"
    >
      <!-- Side buttons (volume / power) — purely decorative, hidden on mobile -->
      <span aria-hidden="true" class="hidden sm:block absolute -left-[3px] top-24 h-10 w-[3px] rounded-l bg-slate-800" />
      <span aria-hidden="true" class="hidden sm:block absolute -left-[3px] top-40 h-16 w-[3px] rounded-l bg-slate-800" />
      <span aria-hidden="true" class="hidden sm:block absolute -right-[3px] top-32 h-20 w-[3px] rounded-r bg-slate-800" />

      <!-- Inner screen -->
      <div class="relative overflow-hidden rounded-2xl sm:rounded-[2.25rem] bg-white ring-1 ring-slate-200 sm:ring-0">
        <!-- Dynamic island / notch — hidden on mobile (no bezel to live in) -->
        <div class="hidden sm:block absolute left-1/2 top-2 z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-slate-900" aria-hidden="true" />

        <!-- WhatsApp-style header — tighter top padding on mobile (no notch) -->
        <header class="relative z-10 flex items-center gap-3 bg-emerald-700 px-4 pb-3 pt-3 sm:pt-9 text-white">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold ring-1 ring-emerald-500/40"
          >
            {{ initials(customerName, customerPhone) }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">
              {{ customerName || customerPhone }}
            </p>
            <p class="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-100">
              <span
                class="inline-block size-1.5 rounded-full"
                :class="statusDotClass(status)"
                aria-hidden="true"
              />
              <span>{{ $t(statusLabelKey(status)) }}</span>
              <slot name="status-extra" />
            </p>
          </div>
          <!-- Decorative call/menu icons -->
          <div class="flex items-center gap-3 text-emerald-100/70" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
              <path d="M23 7 16 12 23 17 23 7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </div>
        </header>

        <!-- Chat body — WhatsApp-style wallpaper. Taller on mobile since
             the chat is the whole viewport, not a constrained phone screen. -->
        <div
          class="phone-chat-bg relative max-h-[72vh] sm:max-h-[65vh] min-h-[60vh] sm:min-h-[420px] overflow-y-auto px-3 py-4"
        >
          <slot />
        </div>

        <!-- Composer / bottom bar -->
        <div v-if="$slots.composer" class="border-t border-slate-200 bg-slate-50 px-3 py-2">
          <slot name="composer" />
        </div>

        <!-- Home indicator — only inside the phone illusion -->
        <div class="hidden sm:flex justify-center pb-2 pt-1">
          <span class="block h-1 w-24 rounded-full bg-slate-300" aria-hidden="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * WhatsApp-style wallpaper: warm beige base with a subtle dot pattern so the
 * surface feels textured without competing with the message bubbles for
 * attention. Tuned to stay airy on light backgrounds.
 */
.phone-chat-bg {
  background-color: #ece5dd;
  background-image: radial-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px);
  background-size: 16px 16px;
}
</style>
