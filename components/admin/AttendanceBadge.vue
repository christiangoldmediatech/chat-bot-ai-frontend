<script setup lang="ts">
import type { AttendanceSummary, SaleAppointmentRef } from '~/types/sale'

/**
 * Badge de asistencia derivado del CalendarEvent vinculado a la venta. La
 * variante gris de "Sin cita vinculada" es intencionalmente diferente a
 * "Cancelada" para que el operador no las confunda visualmente.
 */
const props = defineProps<{
  attendance: AttendanceSummary
  appointment: SaleAppointmentRef | null
  compact?: boolean
}>()

const { t, locale } = useI18n()

function fmt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const label = computed<string>(() => {
  const appt = props.appointment
  switch (props.attendance) {
    case 'ATTENDED':
      return appt
        ? t('admin.sales.attendance.attendedAt', { when: fmt(appt.startTime) })
        : t('admin.sales.attendance.attended')
    case 'SCHEDULED':
      return appt
        ? t('admin.sales.attendance.scheduledAt', { when: fmt(appt.startTime) })
        : t('admin.sales.attendance.scheduled')
    case 'NO_SHOW':
      return t('admin.sales.attendance.noShow')
    case 'CANCELLED':
      return t('admin.sales.attendance.cancelled')
    case 'NO_MEETING':
      return t('admin.sales.attendance.noMeeting')
    default:
      return ''
  }
})

const style = computed<string>(() => {
  switch (props.attendance) {
    case 'ATTENDED':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'SCHEDULED':
      return 'bg-sky-50 text-sky-700 ring-sky-200'
    case 'NO_SHOW':
      return 'bg-danger-50 text-danger-700 ring-danger-200'
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-500 ring-slate-200'
    case 'NO_MEETING':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    default:
      return 'bg-slate-100 text-slate-500 ring-slate-200'
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1 font-medium rounded-full ring-1"
    :class="[style, compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1']"
  >
    {{ label }}
  </span>
</template>
