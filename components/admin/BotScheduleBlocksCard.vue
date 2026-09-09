<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  AffectedMeeting,
  CreateScheduleBlockPayload,
  ScheduleBlock,
} from '~/types/schedule'

const props = defineProps<{
  botId: string
  tenantId?: string
}>()

const { t, locale } = useI18n()
const blocks = useScheduleBlocks(props.tenantId)

type BlockType = 'FULL_DAY' | 'DATE_RANGE' | 'HOURS'

const items = ref<ScheduleBlock[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const tab = ref<'active' | 'past'>('active')

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const modalError = ref<string | null>(null)
const modalSaving = ref(false)
const editingId = ref<string | null>(null)

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

const confirmDelete = ref<ScheduleBlock | null>(null)
const deleting = ref(false)

const now = ref(new Date())

const activeBlocks = computed(() =>
  items.value.filter(b => new Date(b.endsAt).getTime() > now.value.getTime()),
)
const pastBlocks = computed(() =>
  items.value.filter(b => new Date(b.endsAt).getTime() <= now.value.getTime()),
)

const visibleBlocks = computed(() =>
  tab.value === 'active' ? activeBlocks.value : pastBlocks.value,
)

function formatBlockPeriod(b: ScheduleBlock): string {
  const start = new Date(b.startsAt)
  const end = new Date(b.endsAt)
  const opts: Intl.DateTimeFormatOptions = b.allDay
    ? { dateStyle: 'medium' }
    : { dateStyle: 'medium', timeStyle: 'short' }
  const fmt = new Intl.DateTimeFormat(locale.value, opts)
  return `${fmt.format(start)} — ${fmt.format(end)}`
}

function formatMeetingWhen(m: AffectedMeeting): string {
  const start = new Date(m.startTime)
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(start)
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    items.value = await blocks.list(props.botId)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
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

function openCreate(): void {
  resetForm()
  modalMode.value = 'create'
  editingId.value = null
  modalOpen.value = true
}

function openEdit(block: ScheduleBlock): void {
  resetForm()
  modalMode.value = 'edit'
  editingId.value = block.id
  form.reason = block.reason
  form.publicMessage = block.publicMessage ?? ''
  const start = new Date(block.startsAt)
  const end = new Date(block.endsAt)
  if (block.allDay) {
    const startDay = start.toISOString().slice(0, 10)
    const endDay = new Date(end.getTime() - 1).toISOString().slice(0, 10)
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
  modalOpen.value = true
}

function toLocalInput(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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

async function onSave(): Promise<void> {
  modalError.value = null
  const built = buildPayload()
  if (!built.valid) {
    modalError.value = built.errorMsg ?? ''
    return
  }
  modalSaving.value = true
  try {
    if (modalMode.value === 'create') {
      const created = await blocks.create(props.botId, built.payload)
      affectedPreview.value = created.affectedMeetings ?? []
      items.value = [...items.value, created].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      success.value = t('admin.scheduleBlocks.savedCreate')
    } else if (editingId.value) {
      const updated = await blocks.update(props.botId, editingId.value, built.payload)
      affectedPreview.value = updated.affectedMeetings ?? []
      items.value = items.value.map(b => (b.id === updated.id ? updated : b))
      success.value = t('admin.scheduleBlocks.savedUpdate')
    }
    if ((affectedPreview.value?.length ?? 0) === 0) {
      modalOpen.value = false
    }
  } catch (err) {
    modalError.value = (err as ApiError).message
  } finally {
    modalSaving.value = false
  }
}

function askDelete(block: ScheduleBlock): void {
  confirmDelete.value = block
}

async function onDelete(): Promise<void> {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await blocks.remove(props.botId, confirmDelete.value.id)
    items.value = items.value.filter(b => b.id !== confirmDelete.value!.id)
    success.value = t('admin.scheduleBlocks.savedDelete')
    confirmDelete.value = null
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    deleting.value = false
  }
}

onMounted(load)
watch(() => props.botId, () => { void load() })
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6 space-y-5">
    <header class="flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 ring-1 ring-rose-100">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-rose-600" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="9" y1="14" x2="15" y2="20" />
          <line x1="15" y1="14" x2="9" y2="20" />
        </svg>
      </div>
      <div class="flex-1">
        <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.scheduleBlocks.title') }}</h2>
        <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.scheduleBlocks.subtitle') }}</p>
      </div>
      <button type="button" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 shadow-glass transition" @click="openCreate">
        {{ $t('admin.scheduleBlocks.addBlock') }}
      </button>
    </header>

    <div class="flex gap-2 border-b border-slate-200/70">
      <button type="button" class="px-3 py-2 text-sm font-medium transition"
              :class="tab === 'active' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500 hover:text-slate-700'"
              @click="tab = 'active'">
        {{ $t('admin.scheduleBlocks.tabActive') }} ({{ activeBlocks.length }})
      </button>
      <button type="button" class="px-3 py-2 text-sm font-medium transition"
              :class="tab === 'past' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500 hover:text-slate-700'"
              @click="tab = 'past'">
        {{ $t('admin.scheduleBlocks.tabPast') }} ({{ pastBlocks.length }})
      </button>
    </div>

    <p v-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>
    <p v-if="success" class="rounded-xl border border-success-200 bg-success-50/80 p-3 text-sm text-success-700">{{ success }}</p>

    <SpinnerInline v-if="loading" />

    <div v-else-if="visibleBlocks.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-slate-500">
      {{ tab === 'active' ? $t('admin.scheduleBlocks.emptyActive') : $t('admin.scheduleBlocks.emptyPast') }}
    </div>

    <ul v-else class="space-y-2">
      <li v-for="block in visibleBlocks" :key="block.id" class="rounded-xl bg-white/60 ring-1 ring-slate-200/80 p-3 flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-slate-900">{{ formatBlockPeriod(block) }}</span>
            <span v-if="block.allDay" class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">{{ $t('admin.scheduleBlocks.allDayBadge') }}</span>
          </div>
          <p class="mt-1 text-sm text-slate-700">{{ block.reason }}</p>
          <p v-if="block.publicMessage" class="mt-1 text-xs text-slate-500">
            <span class="font-medium text-slate-600">{{ $t('admin.scheduleBlocks.publicMessageLabel') }}:</span> {{ block.publicMessage }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <button type="button" class="text-xs font-medium text-primary-700 hover:text-primary-800" @click="openEdit(block)">
            {{ $t('common.edit') }}
          </button>
          <button type="button" class="text-xs font-medium text-danger-600 hover:text-danger-700" @click="askDelete(block)">
            {{ $t('common.delete') }}
          </button>
        </div>
      </li>
    </ul>

    <Modal :open="modalOpen" :title="modalMode === 'create' ? t('admin.scheduleBlocks.modalTitleCreate') : t('admin.scheduleBlocks.modalTitleEdit')" size="lg" @close="modalOpen = false">
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">{{ $t('admin.scheduleBlocks.typeLabel') }}</label>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="rounded-full px-3 py-1 text-xs font-medium ring-1 transition"
                    :class="form.type === 'FULL_DAY' ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white/80 text-slate-600 ring-slate-200 hover:ring-slate-300'"
                    @click="form.type = 'FULL_DAY'">
              {{ $t('admin.scheduleBlocks.type.fullDay') }}
            </button>
            <button type="button" class="rounded-full px-3 py-1 text-xs font-medium ring-1 transition"
                    :class="form.type === 'DATE_RANGE' ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white/80 text-slate-600 ring-slate-200 hover:ring-slate-300'"
                    @click="form.type = 'DATE_RANGE'">
              {{ $t('admin.scheduleBlocks.type.dateRange') }}
            </button>
            <button type="button" class="rounded-full px-3 py-1 text-xs font-medium ring-1 transition"
                    :class="form.type === 'HOURS' ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white/80 text-slate-600 ring-slate-200 hover:ring-slate-300'"
                    @click="form.type = 'HOURS'">
              {{ $t('admin.scheduleBlocks.type.hours') }}
            </button>
          </div>
        </div>

        <div v-if="form.type === 'FULL_DAY'">
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.dateLabel') }}</label>
          <input v-model="form.singleDate" type="date" class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
        </div>

        <div v-else-if="form.type === 'DATE_RANGE'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.fromDate') }}</label>
            <input v-model="form.startDate" type="date" class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.toDate') }}</label>
            <input v-model="form.endDate" type="date" class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
          </div>
        </div>

        <div v-else class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.fromDateTime') }}</label>
            <input v-model="form.startDateTime" type="datetime-local" step="900" class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.toDateTime') }}</label>
            <input v-model="form.endDateTime" type="datetime-local" step="900" class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.reasonLabel') }}</label>
          <input v-model="form.reason" type="text" maxlength="500" :placeholder="$t('admin.scheduleBlocks.reasonPlaceholder')" class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
          <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.scheduleBlocks.reasonHelp') }}</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.scheduleBlocks.publicMessageInputLabel') }}</label>
          <textarea v-model="form.publicMessage" rows="2" maxlength="500" :placeholder="$t('admin.scheduleBlocks.publicMessagePlaceholder')" class="mt-1 w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.scheduleBlocks.publicMessageHelp') }}</p>
        </div>

        <div v-if="affectedPreview.length > 0" class="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
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
        <div class="flex items-center justify-end gap-2">
          <button type="button" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition" @click="modalOpen = false">
            {{ $t('common.close') }}
          </button>
          <button type="button" :disabled="modalSaving" class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 shadow-glass transition" @click="onSave">
            {{ modalSaving ? $t('common.saving') : $t('admin.scheduleBlocks.saveBlock') }}
          </button>
        </div>
      </template>
    </Modal>

    <ConfirmDialog
      :open="confirmDelete !== null"
      :title="$t('admin.scheduleBlocks.deleteConfirmTitle')"
      :message="$t('admin.scheduleBlocks.deleteConfirmMessage')"
      tone="danger"
      :confirm-label="$t('common.delete')"
      @confirm="onDelete"
      @cancel="confirmDelete = null"
    />
  </section>
</template>
