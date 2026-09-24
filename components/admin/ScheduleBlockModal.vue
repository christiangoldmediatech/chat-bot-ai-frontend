<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  AffectedMeeting,
  CreateScheduleBlockPayload,
  ScheduleBlock,
} from '~/types/schedule'
import {
  addDaysToDayKey,
  getBrowserTimezone,
  toWallDayKey,
} from '~/utils/calendar-layout'

interface Prefill {
  /** YYYY-MM-DD for FULL_DAY / DATE_RANGE start. */
  date?: string
  /** ISO for HOURS start. */
  startsAt?: string
  /** ISO for HOURS end. */
  endsAt?: string
  /** Forces initial type when the caller knows what to open with. */
  type?: 'FULL_DAY' | 'DATE_RANGE' | 'HOURS'
}

const props = defineProps<{
  open: boolean
  botId: string
  tenantId?: string
  timezone?: string
  mode: 'create' | 'edit'
  /** Block being edited (mode='edit'). */
  initial?: ScheduleBlock | null
  /** Optional prefill for create mode (day/hour clicked on the calendar). */
  prefill?: Prefill | null
}>()

const emit = defineEmits<{
  close: []
  saved: [ScheduleBlock]
  /** Fires after the user confirms deletion; parent should drop this id from its list. */
  deleted: [string]
}>()

const { t, locale } = useI18n()
const blocks = useScheduleBlocks(props.tenantId)

const businessTz = computed(() => props.timezone ?? getBrowserTimezone())

type BlockType = 'FULL_DAY' | 'DATE_RANGE' | 'HOURS'

const form = reactive({
  type: 'FULL_DAY' as BlockType,
  singleDate: '',
  startDate: '',
  endDate: '',
  startDateTime: '',
  endDateTime: '',
  reason: '',
  publicMessage: '',
})
const affectedPreview = ref<AffectedMeeting[]>([])
const modalError = ref<string | null>(null)
const modalSaving = ref(false)
const confirmingDelete = ref(false)
const deleting = ref(false)

const canDelete = computed(() => props.mode === 'edit' && props.initial !== null && props.initial !== undefined)

type PresetKey = 'holiday' | 'vacation' | 'maintenance'
const PRESET_KEYS: PresetKey[] = ['holiday', 'vacation', 'maintenance']

function applyPreset(key: PresetKey): void {
  form.reason = t(`admin.scheduleBlocks.presets.${key}Reason`)
  form.publicMessage = t(`admin.scheduleBlocks.presets.${key}Message`)
}

function resetForm(): void {
  form.type = 'FULL_DAY'
  form.singleDate = ''
  form.startDate = ''
  form.endDate = ''
  form.startDateTime = ''
  form.endDateTime = ''
  form.reason = ''
  form.publicMessage = ''
  affectedPreview.value = []
  modalError.value = null
}

function toLocalInput(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function hydrateFromInitial(block: ScheduleBlock): void {
  form.reason = block.reason
  form.publicMessage = block.publicMessage ?? ''
  const start = new Date(block.startsAt)
  const end = new Date(block.endsAt)
  if (block.allDay) {
    const startDay = toWallDayKey(block.startsAt, businessTz.value)
    const endDayExclusive = toWallDayKey(block.endsAt, businessTz.value)
    const endDay = addDaysToDayKey(endDayExclusive, -1)
    if (startDay === endDay) {
      form.type = 'FULL_DAY'
      form.singleDate = startDay
    } else {
      form.type = 'DATE_RANGE'
      form.startDate = startDay
      form.endDate = endDay
    }
  } else {
    form.type = 'HOURS'
    form.startDateTime = toLocalInput(start)
    form.endDateTime = toLocalInput(end)
  }
  affectedPreview.value = block.affectedMeetings ?? []
}

function hydrateFromPrefill(p: Prefill): void {
  if (p.type) form.type = p.type
  if (p.startsAt && p.endsAt) {
    form.type = p.type ?? 'HOURS'
    form.startDateTime = toLocalInput(new Date(p.startsAt))
    form.endDateTime = toLocalInput(new Date(p.endsAt))
  } else if (p.date) {
    // Default to FULL_DAY when only a date is passed.
    form.type = p.type ?? 'FULL_DAY'
    if (form.type === 'FULL_DAY') form.singleDate = p.date
    else if (form.type === 'DATE_RANGE') {
      form.startDate = p.date
      form.endDate = p.date
    }
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    resetForm()
    if (props.mode === 'edit' && props.initial) {
      hydrateFromInitial(props.initial)
    } else if (props.mode === 'create' && props.prefill) {
      hydrateFromPrefill(props.prefill)
    }
  },
)

function formatDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)
}

function formatMeetingWhen(m: AffectedMeeting): string {
  const start = new Date(m.startTime)
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(start)
}

const allDayPreview = computed<{ count: number, label: string } | null>(() => {
  if (form.type === 'FULL_DAY') {
    if (!form.singleDate) return null
    return { count: 1, label: formatDayKey(form.singleDate) }
  }
  if (form.type === 'DATE_RANGE') {
    if (!form.startDate || !form.endDate) return null
    if (form.endDate < form.startDate) return null
    const days: string[] = []
    let cursor = form.startDate
    while (cursor <= form.endDate && days.length < 62) {
      days.push(cursor)
      cursor = addDaysToDayKey(cursor, 1)
    }
    return { count: days.length, label: days.map(formatDayKey).join(', ') }
  }
  return null
})

function buildPayload(): { payload: CreateScheduleBlockPayload, valid: boolean, errorMsg?: string } {
  const reason = form.reason.trim()
  if (reason.length === 0) {
    return { payload: {} as CreateScheduleBlockPayload, valid: false, errorMsg: t('admin.scheduleBlocks.errors.reasonRequired') }
  }
  const publicMessage = form.publicMessage.trim() === '' ? null : form.publicMessage.trim()
  let startsAt = ''
  let endsAt = ''
  let allDay = false
  if (form.type === 'FULL_DAY') {
    if (!form.singleDate) return { payload: {} as CreateScheduleBlockPayload, valid: false, errorMsg: t('admin.scheduleBlocks.errors.dateRequired') }
    const s = new Date(`${form.singleDate}T00:00:00`)
    const e = new Date(`${form.singleDate}T00:00:00`)
    e.setDate(e.getDate() + 1)
    startsAt = s.toISOString()
    endsAt = e.toISOString()
    allDay = true
  } else if (form.type === 'DATE_RANGE') {
    if (!form.startDate || !form.endDate) return { payload: {} as CreateScheduleBlockPayload, valid: false, errorMsg: t('admin.scheduleBlocks.errors.rangeRequired') }
    const s = new Date(`${form.startDate}T00:00:00`)
    const e = new Date(`${form.endDate}T00:00:00`)
    e.setDate(e.getDate() + 1)
    if (e <= s) return { payload: {} as CreateScheduleBlockPayload, valid: false, errorMsg: t('admin.scheduleBlocks.errors.endBeforeStart') }
    startsAt = s.toISOString()
    endsAt = e.toISOString()
    allDay = true
  } else {
    if (!form.startDateTime || !form.endDateTime) return { payload: {} as CreateScheduleBlockPayload, valid: false, errorMsg: t('admin.scheduleBlocks.errors.rangeRequired') }
    const s = new Date(form.startDateTime)
    const e = new Date(form.endDateTime)
    if (e <= s) return { payload: {} as CreateScheduleBlockPayload, valid: false, errorMsg: t('admin.scheduleBlocks.errors.endBeforeStart') }
    startsAt = s.toISOString()
    endsAt = e.toISOString()
    allDay = false
  }
  return {
    payload: { startsAt, endsAt, allDay, reason, publicMessage },
    valid: true,
  }
}

async function onDelete(): Promise<void> {
  if (!props.initial) return
  deleting.value = true
  modalError.value = null
  try {
    await blocks.remove(props.botId, props.initial.id)
    emit('deleted', props.initial.id)
    confirmingDelete.value = false
    emit('close')
  } catch (err) {
    modalError.value = (err as ApiError).message
  } finally {
    deleting.value = false
  }
}

async function onSave(): Promise<void> {
  modalError.value = null
  const built = buildPayload()
  if (!built.valid) {
    modalError.value = built.errorMsg ?? ''
    return
  }
  modalSaving.value = true
  try {
    let result: ScheduleBlock
    if (props.mode === 'create') {
      result = await blocks.create(props.botId, built.payload)
    } else if (props.initial) {
      result = await blocks.update(props.botId, props.initial.id, built.payload)
    } else {
      throw new Error('edit mode requires initial')
    }
    affectedPreview.value = result.affectedMeetings ?? []
    emit('saved', result)
    if ((result.affectedMeetings?.length ?? 0) === 0) {
      emit('close')
    }
  } catch (err) {
    modalError.value = (err as ApiError).message
  } finally {
    modalSaving.value = false
  }
}
</script>

<template>
  <Modal
    :open="open"
    :title="mode === 'create' ? t('admin.scheduleBlocks.modalTitleCreate') : t('admin.scheduleBlocks.modalTitleEdit')"
    size="lg"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">{{ $t('admin.scheduleBlocks.typeLabel') }}</label>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-full px-3 py-1 text-xs font-medium ring-1 transition"
            :class="form.type === 'FULL_DAY' ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white/80 text-slate-600 ring-slate-200 hover:ring-slate-300'"
            @click="form.type = 'FULL_DAY'"
          >
            {{ $t('admin.scheduleBlocks.type.fullDay') }}
          </button>
          <button
            type="button"
            class="rounded-full px-3 py-1 text-xs font-medium ring-1 transition"
            :class="form.type === 'DATE_RANGE' ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white/80 text-slate-600 ring-slate-200 hover:ring-slate-300'"
            @click="form.type = 'DATE_RANGE'"
          >
            {{ $t('admin.scheduleBlocks.type.dateRange') }}
          </button>
          <button
            type="button"
            class="rounded-full px-3 py-1 text-xs font-medium ring-1 transition"
            :class="form.type === 'HOURS' ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white/80 text-slate-600 ring-slate-200 hover:ring-slate-300'"
            @click="form.type = 'HOURS'"
          >
            {{ $t('admin.scheduleBlocks.type.hours') }}
          </button>
        </div>
      </div>

      <div v-if="form.type === 'FULL_DAY'">
        <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.dateLabel') }}</label>
        <input
          v-model="form.singleDate"
          type="date"
          class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
      </div>

      <div v-else-if="form.type === 'DATE_RANGE'" class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.fromDate') }}</label>
          <input
            v-model="form.startDate"
            type="date"
            class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.toDate') }}</label>
          <input
            v-model="form.endDate"
            type="date"
            class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
        </div>
      </div>

      <div v-else class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.fromDateTime') }}</label>
          <input
            v-model="form.startDateTime"
            type="datetime-local"
            step="900"
            class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.toDateTime') }}</label>
          <input
            v-model="form.endDateTime"
            type="datetime-local"
            step="900"
            class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
        </div>
      </div>

      <p
        v-if="allDayPreview"
        class="rounded-lg border border-primary-200 bg-primary-50/70 px-3 py-2 text-xs text-primary-800"
      >
        {{ $t('admin.scheduleBlocks.willBlockDays', { count: allDayPreview.count, days: allDayPreview.label }) }}
      </p>

      <div>
        <span class="block text-xs font-medium text-slate-700 mb-1">{{ $t('admin.scheduleBlocks.presetsLabel') }}</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="key in PRESET_KEYS"
            :key="key"
            type="button"
            class="rounded-full px-3 py-1 text-xs font-medium ring-1 ring-primary-200 bg-primary-50/60 text-primary-800 hover:bg-primary-100/70 transition"
            @click="applyPreset(key)"
          >
            {{ $t(`admin.scheduleBlocks.presets.${key}`) }}
          </button>
        </div>
      </div>

      <div class="rounded-xl border border-primary-200 bg-primary-50/50 p-3">
        <label class="block text-sm font-semibold text-slate-900">{{ $t('admin.scheduleBlocks.publicMessageInputLabel') }}</label>
        <p class="mt-0.5 text-[11px] text-slate-600">{{ $t('admin.scheduleBlocks.publicMessageHelp') }}</p>
        <textarea
          v-model="form.publicMessage"
          rows="2"
          maxlength="500"
          :placeholder="$t('admin.scheduleBlocks.publicMessagePlaceholder')"
          class="mt-2 w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.reasonLabel') }}</label>
        <input
          v-model="form.reason"
          type="text"
          maxlength="500"
          :placeholder="$t('admin.scheduleBlocks.reasonPlaceholder')"
          class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
        <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.scheduleBlocks.reasonHelp') }}</p>
      </div>

      <div
        v-if="affectedPreview.length > 0"
        class="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900"
      >
        <p class="font-medium">{{ $t('admin.scheduleBlocks.affectedTitle', { n: affectedPreview.length }) }}</p>
        <p class="mt-1 text-xs">{{ $t('admin.scheduleBlocks.affectedWarning') }}</p>
        <ul class="mt-2 space-y-1 text-xs">
          <li v-for="m in affectedPreview" :key="m.id" class="flex flex-wrap items-center gap-2">
            <span class="font-medium">{{ formatMeetingWhen(m) }}</span>
            <span class="text-amber-700">·</span>
            <span>{{ m.attendeeName ?? m.attendeeEmail }}</span>
            <span v-if="m.topic" class="text-amber-700">— {{ m.topic }}</span>
          </li>
        </ul>
      </div>

      <p v-if="modalError" class="rounded-lg border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ modalError }}</p>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <button
          v-if="canDelete"
          type="button"
          :disabled="deleting || modalSaving"
          class="inline-flex items-center gap-1.5 rounded-xl border border-danger-200 bg-danger-50/60 px-4 py-2 text-sm font-medium text-danger-700 hover:bg-danger-100 disabled:opacity-60 transition"
          @click="confirmingDelete = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          </svg>
          {{ deleting ? $t('common.deleting') : $t('admin.scheduleBlocks.deleteBlock') }}
        </button>
        <span v-else />
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            @click="emit('close')"
          >
            {{ $t('common.close') }}
          </button>
          <button
            type="button"
            :disabled="modalSaving || deleting"
            class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 shadow-glass transition"
            @click="onSave"
          >
            {{ modalSaving ? $t('common.saving') : $t('admin.scheduleBlocks.saveBlock') }}
          </button>
        </div>
      </div>
    </template>
  </Modal>

  <ConfirmDialog
    :open="confirmingDelete"
    :title="$t('admin.scheduleBlocks.deleteConfirmTitle')"
    :message="$t('admin.scheduleBlocks.deleteConfirmMessage')"
    tone="danger"
    :confirm-label="$t('common.delete')"
    @confirm="onDelete"
    @cancel="confirmingDelete = false"
  />
</template>
