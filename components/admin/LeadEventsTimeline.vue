<script setup lang="ts">
import type { LeadEvent, LeadEventType } from '~/types/lead'

interface Props {
  events: LeadEvent[]
}

defineProps<Props>()

/**
 * Visual tone per event-type group. Detection signals are sky, status
 * transitions are slate, CRM events are violet, and the manual note + the
 * CREATED anchor are amber/neutral.
 */
const tone: Record<LeadEventType, { dot: string; ring: string; bg: string; label: string }> = {
  CREATED: { dot: 'bg-amber-500', ring: 'ring-amber-200', bg: 'bg-amber-50', label: 'text-amber-700' },
  SIGNAL_PRICE_ASKED: { dot: 'bg-sky-500', ring: 'ring-sky-200', bg: 'bg-sky-50', label: 'text-sky-700' },
  SIGNAL_DEMO_REQUESTED: { dot: 'bg-sky-500', ring: 'ring-sky-200', bg: 'bg-sky-50', label: 'text-sky-700' },
  SIGNAL_MEETING_REQUESTED: { dot: 'bg-sky-500', ring: 'ring-sky-200', bg: 'bg-sky-50', label: 'text-sky-700' },
  SIGNAL_QUOTE_REQUESTED: { dot: 'bg-sky-500', ring: 'ring-sky-200', bg: 'bg-sky-50', label: 'text-sky-700' },
  SIGNAL_EMAIL_CAPTURED: { dot: 'bg-sky-500', ring: 'ring-sky-200', bg: 'bg-sky-50', label: 'text-sky-700' },
  SIGNAL_PHONE_CAPTURED: { dot: 'bg-sky-500', ring: 'ring-sky-200', bg: 'bg-sky-50', label: 'text-sky-700' },
  SIGNAL_HUMAN_REQUESTED: { dot: 'bg-sky-500', ring: 'ring-sky-200', bg: 'bg-sky-50', label: 'text-sky-700' },
  SIGNAL_BOT_KEYWORD: { dot: 'bg-sky-500', ring: 'ring-sky-200', bg: 'bg-sky-50', label: 'text-sky-700' },
  STATUS_CHANGED: { dot: 'bg-slate-500', ring: 'ring-slate-200', bg: 'bg-slate-50', label: 'text-slate-700' },
  CRM_SYNC_OK: { dot: 'bg-emerald-500', ring: 'ring-emerald-200', bg: 'bg-emerald-50', label: 'text-emerald-700' },
  CRM_SYNC_FAIL: { dot: 'bg-rose-500', ring: 'ring-rose-200', bg: 'bg-rose-50', label: 'text-rose-700' },
  MANUAL_NOTE: { dot: 'bg-indigo-500', ring: 'ring-indigo-200', bg: 'bg-indigo-50', label: 'text-indigo-700' },
}

function descriptionFor(ev: LeadEvent): string {
  if (ev.type === 'STATUS_CHANGED' && ev.fromStatus && ev.toStatus) {
    return `${ev.fromStatus} → ${ev.toStatus}`
  }
  if (ev.type === 'MANUAL_NOTE' && typeof ev.payload?.note === 'string') {
    return ev.payload.note as string
  }
  if (ev.type === 'CRM_SYNC_FAIL' && typeof ev.payload?.error === 'string') {
    return ev.payload.error as string
  }
  if (ev.type === 'SIGNAL_EMAIL_CAPTURED' && typeof ev.payload?.email === 'string') {
    return ev.payload.email as string
  }
  if (ev.type === 'SIGNAL_PHONE_CAPTURED' && typeof ev.payload?.phone === 'string') {
    return ev.payload.phone as string
  }
  return ''
}
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-5">
    <header>
      <h3 class="text-sm font-semibold text-slate-900">{{ $t('leads.detail.timelineTitle') }}</h3>
      <p class="text-xs text-slate-500 mt-0.5">{{ $t('leads.detail.timelineSubtitle') }}</p>
    </header>

    <ol v-if="events.length > 0" class="mt-5 relative space-y-4 pl-5">
      <!-- Continuous track -->
      <span class="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200" aria-hidden="true" />
      <li
        v-for="ev in events"
        :key="ev.id"
        class="relative"
      >
        <span
          class="absolute -left-[15px] top-1 size-3 rounded-full ring-2 ring-white"
          :class="tone[ev.type].dot"
          aria-hidden="true"
        />
        <div class="flex items-start gap-3 flex-wrap">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ring-1 ring-inset text-[10px] uppercase tracking-wider font-semibold"
            :class="[tone[ev.type].bg, tone[ev.type].ring, tone[ev.type].label]"
          >
            {{ $t(`leads.eventType.${ev.type}`) }}
          </span>
          <span
            v-if="ev.scoreDelta !== 0"
            class="text-[10px] uppercase tracking-wider font-semibold text-emerald-700"
          >
            +{{ ev.scoreDelta }}
          </span>
          <time class="text-[11px] text-slate-500 tabular-nums">
            {{ new Date(ev.createdAt).toLocaleString() }}
          </time>
        </div>
        <p v-if="descriptionFor(ev)" class="mt-1 text-sm text-slate-700 leading-relaxed">
          {{ descriptionFor(ev) }}
        </p>
      </li>
    </ol>

    <p v-else class="mt-4 text-sm text-slate-500">{{ $t('leads.detail.timelineEmpty') }}</p>
  </section>
</template>
