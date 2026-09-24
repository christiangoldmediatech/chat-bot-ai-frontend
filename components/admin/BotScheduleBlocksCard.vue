<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { ScheduleBlock } from '~/types/schedule'
import {
  addDaysToDayKey,
  getBrowserTimezone,
  toWallDayKey,
} from '~/utils/calendar-layout'

const props = defineProps<{
  botId: string
  tenantId?: string
  timezone?: string
}>()

const emit = defineEmits<{ changed: [] }>()

const { t, locale } = useI18n()
const blocks = useScheduleBlocks(props.tenantId)

const businessTz = computed(() => props.timezone ?? getBrowserTimezone())

const items = ref<ScheduleBlock[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const tab = ref<'active' | 'past'>('active')

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editing = ref<ScheduleBlock | null>(null)

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
  if (b.allDay) {
    const startDay = toWallDayKey(b.startsAt, businessTz.value)
    const endDayExclusive = toWallDayKey(b.endsAt, businessTz.value)
    const lastDayInclusive = addDaysToDayKey(endDayExclusive, -1)
    const startLabel = formatDayKey(startDay)
    if (startDay === lastDayInclusive) return startLabel
    return `${startLabel} — ${formatDayKey(lastDayInclusive)}`
  }
  const start = new Date(b.startsAt)
  const end = new Date(b.endsAt)
  const fmt = new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: businessTz.value,
  })
  return `${fmt.format(start)} — ${fmt.format(end)}`
}

function formatDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)
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

function openCreate(): void {
  modalMode.value = 'create'
  editing.value = null
  modalOpen.value = true
}

function openEdit(block: ScheduleBlock): void {
  modalMode.value = 'edit'
  editing.value = block
  modalOpen.value = true
}

function onSaved(result: ScheduleBlock): void {
  if (modalMode.value === 'create') {
    items.value = [...items.value.filter(b => b.id !== result.id), result].sort(
      (a, b) => a.startsAt.localeCompare(b.startsAt),
    )
    success.value = t('admin.scheduleBlocks.savedCreate')
  } else {
    items.value = items.value.map(b => (b.id === result.id ? result : b))
    success.value = t('admin.scheduleBlocks.savedUpdate')
  }
  emit('changed')
  void load()
}

function onDeletedFromModal(id: string): void {
  items.value = items.value.filter(b => b.id !== id)
  success.value = t('admin.scheduleBlocks.savedDelete')
  emit('changed')
  void load()
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
    emit('changed')
    void load()
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
  <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-6 space-y-5">
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

    <ScheduleBlockModal
      :open="modalOpen"
      :bot-id="botId"
      :tenant-id="tenantId"
      :timezone="timezone"
      :mode="modalMode"
      :initial="editing"
      @close="modalOpen = false"
      @saved="onSaved"
      @deleted="onDeletedFromModal"
    />

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
