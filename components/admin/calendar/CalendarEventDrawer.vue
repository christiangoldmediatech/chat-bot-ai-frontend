<script setup lang="ts">
import type { CalendarAppointment } from '~/types/calendar'

const props = defineProps<{
  appointment: CalendarAppointment | null
  timezone: string
  tenantId?: string
  locale: string
}>()

const emit = defineEmits<{ close: [] }>()

const isOpen = computed(() => props.appointment !== null)

function fmtDateTime(iso: string): string {
  return new Intl.DateTimeFormat(props.locale, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: props.timezone,
  }).format(new Date(iso))
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat(props.locale, {
    timeStyle: 'short',
    timeZone: props.timezone,
  }).format(new Date(iso))
}

const conversationLink = computed(() => {
  const a = props.appointment
  if (!a) return ''
  return props.tenantId
    ? `/superadmin/companies/${props.tenantId}/conversations/${a.conversationId}`
    : `/admin/conversations/${a.conversationId}`
})

const customerLink = computed(() => {
  const a = props.appointment
  if (!a) return ''
  return props.tenantId
    ? `/superadmin/companies/${props.tenantId}/customers/${encodeURIComponent(a.customer.phone)}`
    : `/admin/customers/${encodeURIComponent(a.customer.phone)}`
})

const statusToneClass = computed(() => {
  const s = props.appointment?.status
  if (!s) return 'bg-slate-100 text-slate-700 ring-slate-200'
  if (s === 'CANCELLED') return 'bg-slate-100 text-slate-600 ring-slate-200'
  if (s === 'COMPLETED') return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
  if (s === 'NO_SHOW') return 'bg-amber-50 text-amber-800 ring-amber-200'
  if (props.appointment?.confirmedAt) return 'bg-primary-50 text-primary-800 ring-primary-200'
  return 'bg-sky-50 text-sky-800 ring-sky-200'
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-[95] bg-slate-900/40 backdrop-blur-sm" @click="emit('close')" />
    </Transition>
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="isOpen && appointment"
        class="fixed right-0 top-0 z-[96] h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <header class="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wider text-slate-500">{{ $t('admin.calendarView.drawer.appointment') }}</p>
            <h3 class="mt-0.5 text-lg font-semibold text-slate-900 leading-snug">{{ appointment.customer.name ?? appointment.customer.phone }}</h3>
          </div>
          <button type="button" class="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition" @click="emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </header>

        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1" :class="statusToneClass">
              {{ $t(`admin.calendarView.status.${appointment.status.toLowerCase()}`) }}
            </span>
            <span v-if="appointment.confirmedAt" class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
              ✓ {{ $t('admin.calendarView.drawer.confirmed') }}
            </span>
          </div>

          <div class="rounded-xl bg-slate-50 ring-1 ring-slate-200/60 px-4 py-3">
            <p class="text-xs font-medium text-slate-500">{{ $t('admin.calendarView.drawer.when') }}</p>
            <p class="mt-1 text-sm font-medium text-slate-900">{{ fmtDateTime(appointment.startsAt) }}</p>
            <p class="mt-0.5 text-xs text-slate-500">{{ $t('admin.calendarView.drawer.until') }} {{ fmtTime(appointment.endsAt) }}</p>
          </div>

          <div class="rounded-xl bg-slate-50 ring-1 ring-slate-200/60 px-4 py-3 space-y-2">
            <p class="text-xs font-medium text-slate-500">{{ $t('admin.calendarView.drawer.customer') }}</p>
            <div>
              <p class="text-sm font-medium text-slate-900">{{ appointment.customer.name ?? '—' }}</p>
              <p class="text-xs text-slate-600 font-mono">{{ appointment.customer.phone }}</p>
              <p v-if="appointment.customer.email" class="text-xs text-slate-600">{{ appointment.customer.email }}</p>
            </div>
          </div>

          <div v-if="appointment.service || appointment.topic" class="rounded-xl bg-slate-50 ring-1 ring-slate-200/60 px-4 py-3">
            <p class="text-xs font-medium text-slate-500">{{ $t('admin.calendarView.drawer.service') }}</p>
            <p v-if="appointment.service" class="mt-1 text-sm font-medium text-slate-900">{{ appointment.service.name }}</p>
            <p v-if="appointment.topic && appointment.topic !== appointment.service?.name" class="mt-0.5 text-xs text-slate-600">{{ appointment.topic }}</p>
          </div>

          <a v-if="appointment.meetLink" :href="appointment.meetLink" target="_blank" rel="noopener" class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
            {{ $t('admin.calendarView.drawer.openMeet') }}
          </a>

          <div class="pt-2 border-t border-slate-200 space-y-2">
            <NuxtLink :to="conversationLink" class="flex items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-slate-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              {{ $t('admin.calendarView.drawer.viewConversation') }}
            </NuxtLink>
            <NuxtLink :to="customerLink" class="flex items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-slate-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              {{ $t('admin.calendarView.drawer.viewCustomer') }}
            </NuxtLink>
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
