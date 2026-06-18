<script setup lang="ts">
import type { DeliveryStatus } from '~/types/conversation'

const props = defineProps<{
  status: DeliveryStatus | null
  /** Free-text reason surfaced from Meta when status === 'FAILED'. */
  error?: string | null
}>()

const { t } = useI18n()

interface DeliveryMeta {
  ticks: 1 | 2
  /** Tailwind classes for the pill (background + ring + text colour). */
  pill: string
  label: string
  title: string
  ariaLabel: string
}

const meta = computed<DeliveryMeta | null>(() => {
  switch (props.status) {
    case 'SENT':
      return {
        ticks: 1,
        pill: 'bg-amber-400/15 ring-1 ring-amber-300/40 text-amber-200',
        label: t('admin.chat.delivery.sentTitle'),
        title: t('admin.chat.delivery.sentTitle'),
        ariaLabel: t('admin.chat.delivery.sentAria'),
      }
    case 'DELIVERED':
      return {
        ticks: 2,
        pill: 'bg-emerald-400/15 ring-1 ring-emerald-300/40 text-emerald-200',
        label: t('admin.chat.delivery.deliveredTitle'),
        title: t('admin.chat.delivery.deliveredTitle'),
        ariaLabel: t('admin.chat.delivery.deliveredAria'),
      }
    case 'READ':
      return {
        ticks: 2,
        pill: 'bg-sky-400/20 ring-1 ring-sky-300/50 text-sky-100',
        label: t('admin.chat.delivery.readTitle'),
        title: t('admin.chat.delivery.readTitle'),
        ariaLabel: t('admin.chat.delivery.readAria'),
      }
    default:
      return null
  }
})

const failureReason = computed<string>(() => {
  if (props.status !== 'FAILED') return ''
  const reason = (props.error ?? '').trim()
  return reason
    ? t('admin.chat.delivery.failedReason', { reason })
    : t('admin.chat.delivery.failedNoReason')
})

const failureTitle = computed<string>(() => {
  const reason = failureReason.value
  const base = t('admin.chat.delivery.failedTitle')
  return reason ? `${base} — ${reason}` : base
})
</script>

<template>
  <!-- FAILED: prominent warning pill + tooltip with the Meta error reason -->
  <span
    v-if="status === 'FAILED'"
    class="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-1.5 py-0.5 ring-1 ring-rose-300/50 text-rose-100 text-[9px] font-semibold uppercase tracking-wide"
    role="img"
    :aria-label="$t('admin.chat.delivery.failedAria')"
    :title="failureTitle"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    <span>{{ $t('admin.chat.delivery.failedTitle') }}</span>
  </span>

  <!-- SENT / DELIVERED / READ: coloured pill with ticks + label -->
  <span
    v-else-if="meta"
    class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
    :class="meta.pill"
    role="img"
    :aria-label="meta.ariaLabel"
    :title="meta.title"
  >
    <svg
      v-if="meta.ticks === 1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 11"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-2.5 w-3.5"
      aria-hidden="true"
    >
      <polyline points="2 6 6 10 14 1.5" />
    </svg>
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 11"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-2.5 w-4"
      aria-hidden="true"
    >
      <polyline points="1 6 5 10 13 1.5" />
      <polyline points="7 10 11 6" />
      <polyline points="9 10 17 1.5" />
    </svg>
    <span>{{ meta.label }}</span>
  </span>
</template>
