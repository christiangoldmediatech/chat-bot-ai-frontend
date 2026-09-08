<script setup lang="ts">
import type { SaleAuditLogEntry, SaleDetail } from '~/types/sale'

/**
 * Drawer lateral con el detalle completo de una venta + historial de cambios
 * de estado. Se abre al hacer click en la fila. Los links salen a
 * customer/conversation cuando existen; el resto se muestra como texto para
 * mantener honestidad ("Sin conversación vinculada").
 */
const props = defineProps<{
  open: boolean
  detail: SaleDetail | null
  loading?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { locale, t } = useI18n()

function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(locale.value === 'es' ? 'es-EC' : 'en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(locale.value === 'es' ? 'es-EC' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fmtDateTime(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString(locale.value === 'es' ? 'es-EC' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function eventLabel(evt: SaleAuditLogEntry): string {
  switch (evt.eventType) {
    case 'CREATED':
      return t('admin.sales.history.eventCreated')
    case 'MARKED_WON':
      return t('admin.sales.history.eventMarkedWon')
    case 'MARKED_LOST':
      return t('admin.sales.history.eventMarkedLost')
    case 'REVERTED':
      return t('admin.sales.history.eventReverted', {
        from: evt.fromStatus ?? '?',
        to: evt.toStatus ?? '?',
      })
    case 'UPDATED':
      return t('admin.sales.history.eventUpdated')
    case 'DELETED':
      return t('admin.sales.history.eventDeleted')
    default:
      return evt.eventType
  }
}

function actorLabel(evt: SaleAuditLogEntry): string {
  if (evt.actorType === 'BOT') {
    return evt.actorLabel
      ? t('admin.sales.history.actorBotLabel', { label: evt.actorLabel })
      : t('admin.sales.history.actorBot')
  }
  if (evt.actorType === 'SYSTEM') return t('admin.sales.history.actorSystem')
  return evt.actorEmail ?? t('admin.sales.history.actorUnknown')
}
</script>

<template>
  <Transition name="drawer">
    <div
      v-if="open"
      class="fixed inset-0 z-40"
      @keydown.esc="emit('close')"
    >
      <button
        type="button"
        class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="close"
        @click="emit('close')"
      />
      <aside
        class="absolute top-0 right-0 h-full w-full max-w-lg overflow-y-auto bg-white/95 backdrop-blur-xl shadow-xl border-l border-slate-200"
      >
        <div class="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ $t('admin.sales.detail.title') }}</h2>
          <button
            type="button"
            class="rounded-full text-slate-400 hover:text-slate-700 p-1"
            aria-label="close"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>

        <div v-if="loading" class="p-6 text-sm text-slate-500">
          {{ $t('common.loading') }}…
        </div>

        <div v-else-if="detail" class="p-5 space-y-5 text-sm">
          <section>
            <h3 class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              {{ $t('admin.sales.detail.serviceAndAmount') }}
            </h3>
            <div class="rounded-xl bg-slate-50 p-3 space-y-1">
              <div class="font-medium text-slate-900">{{ detail.serviceNameSnapshot }}</div>
              <div class="text-slate-500 text-xs">
                {{ detail.quantity }} × {{ money(detail.unitPriceSnapshotCents, detail.currencySnapshot) }}
                <span v-if="detail.discountCents > 0">
                  − {{ money(detail.discountCents, detail.currencySnapshot) }}
                </span>
              </div>
              <div class="font-mono text-slate-900 font-semibold">
                {{ money(detail.totalAmountCents, detail.currencySnapshot) }}
              </div>
            </div>
          </section>

          <section>
            <h3 class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              {{ $t('admin.sales.detail.customer') }}
            </h3>
            <div v-if="detail.customer" class="rounded-xl bg-slate-50 p-3 space-y-1">
              <div class="font-medium text-slate-900">
                {{ detail.customer.name || $t('admin.sales.confirm.noName') }}
              </div>
              <div class="font-mono text-xs text-slate-500">{{ detail.customer.phone }}</div>
              <div class="flex gap-3 pt-1 text-xs">
                <NuxtLink
                  :to="`/admin/customers/${encodeURIComponent(detail.customer.phone)}`"
                  class="text-primary-600 hover:underline"
                >
                  {{ $t('admin.sales.detail.linkCustomer') }}
                </NuxtLink>
                <NuxtLink
                  v-if="detail.conversationId"
                  :to="`/admin/conversations/${detail.conversationId}`"
                  class="text-primary-600 hover:underline"
                >
                  {{ $t('admin.sales.detail.linkConversation') }}
                </NuxtLink>
                <span v-else class="text-slate-400">
                  {{ $t('admin.sales.confirm.noConversation') }}
                </span>
              </div>
            </div>
            <p v-else class="text-amber-700 text-xs">
              {{ $t('admin.sales.confirm.noCustomer') }}
            </p>
          </section>

          <section>
            <h3 class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              {{ $t('admin.sales.detail.appointment') }}
            </h3>
            <div class="rounded-xl bg-slate-50 p-3 space-y-2">
              <AttendanceBadge :attendance="detail.attendanceSummary" :appointment="detail.appointment" />
              <div v-if="detail.appointment" class="text-xs text-slate-600">
                <div>{{ fmtDateTime(detail.appointment.startTime) }} — {{ fmtDateTime(detail.appointment.endTime) }}</div>
                <div v-if="detail.appointment.confirmedAt" class="text-emerald-600 mt-1">
                  {{ $t('admin.sales.detail.appointmentConfirmed') }} · {{ fmtDate(detail.appointment.confirmedAt) }}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              {{ $t('admin.sales.detail.status') }}
            </h3>
            <div class="rounded-xl bg-slate-50 p-3 space-y-1 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-500">{{ $t('admin.sales.detail.current') }}</span>
                <span class="font-medium">{{ detail.status }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">{{ $t('admin.sales.detail.soldAt') }}</span>
                <span>{{ fmtDate(detail.soldAt) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">{{ $t('admin.sales.detail.serviceDate') }}</span>
                <span>{{ fmtDate(detail.serviceDate) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">{{ $t('admin.sales.detail.lastChangeBy') }}</span>
                <span>{{ detail.statusChangedBy?.email ?? '—' }}</span>
              </div>
              <div v-if="detail.statusChangeReason" class="pt-2 border-t border-slate-200 mt-2">
                <span class="text-slate-500">{{ $t('admin.sales.detail.reason') }}:</span>
                <span class="ml-1">{{ detail.statusChangeReason }}</span>
              </div>
            </div>
          </section>

          <section>
            <h3 class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              {{ $t('admin.sales.detail.history') }}
            </h3>
            <ol class="space-y-2">
              <li
                v-for="evt in detail.history"
                :key="evt.id"
                class="rounded-lg border border-slate-200 bg-white/80 p-3 text-xs"
              >
                <div class="flex justify-between items-start gap-2">
                  <span class="font-medium text-slate-800">{{ eventLabel(evt) }}</span>
                  <span class="text-slate-400 font-mono">{{ fmtDateTime(evt.createdAt) }}</span>
                </div>
                <div class="mt-1 text-slate-500">
                  {{ $t('admin.sales.history.by', { actor: actorLabel(evt) }) }}
                </div>
                <div v-if="evt.reason" class="mt-1 text-slate-600 italic">
                  "{{ evt.reason }}"
                </div>
              </li>
            </ol>
          </section>
        </div>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.15s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
</style>
