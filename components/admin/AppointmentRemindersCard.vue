<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  AppointmentReminder,
  AppointmentReminderStatus,
  FindRemindersQuery,
} from '~/types/appointment-reminder'

const props = defineProps<{
  botId: string
  tenantId?: string
}>()

const { t, te } = useI18n()
const api = useAppointmentReminders(props.tenantId)

const items = ref<AppointmentReminder[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)
const loadError = ref<string | null>(null)

const filters = reactive<{ status: AppointmentReminderStatus | ''; dateFrom: string; dateTo: string }>({
  status: '',
  dateFrom: '',
  dateTo: '',
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const query: FindRemindersQuery = {
      page: page.value,
      pageSize,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    }
    const res = await api.listForBot(props.botId, query)
    items.value = res.items
    total.value = res.total
  }
  catch (err) {
    loadError.value = (err as ApiError).message || t('admin.reminders.errors.loadFailed')
  }
  finally {
    loading.value = false
  }
}

function clearFilters(): void {
  filters.status = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  page.value = 1
  void load()
}

function onFilterChange(): void {
  page.value = 1
  void load()
}

function totalPages(): number {
  return Math.max(1, Math.ceil(total.value / pageSize))
}

function goPrev(): void {
  if (page.value > 1) {
    page.value--
    void load()
  }
}
function goNext(): void {
  if (page.value < totalPages()) {
    page.value++
    void load()
  }
}

function statusBadgeClasses(status: AppointmentReminderStatus): string {
  if (status === 'SENT') return 'bg-emerald-100 text-emerald-700 ring-emerald-200'
  if (status === 'FAILED') return 'bg-rose-100 text-rose-700 ring-rose-200'
  return 'bg-amber-100 text-amber-700 ring-amber-200'
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  }
  catch { return iso }
}

function translateReason(reason: string | null): string {
  if (!reason) return '—'
  const key = `admin.reminders.reasons.${reason}`
  if (te(key)) return t(key)
  const errKey = `errors.code.${reason}`
  if (te(errKey)) return t(errKey)
  return reason
}

function customerName(row: AppointmentReminder): string {
  return row.calendarEvent.attendeeName
    || row.variables?.['1']
    || row.calendarEvent.customerPhone
}

function serviceName(row: AppointmentReminder): string {
  const mapped = Object.entries(row.variables || {}).find(([, v]) => !!v)
  const explicit = row.variables?.['2']
  if (explicit) return explicit
  if (row.calendarEvent.topic) return row.calendarEvent.topic
  return mapped?.[1] ?? '—'
}

watch(() => props.botId, () => {
  page.value = 1
  void load()
}, { immediate: true })
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
    <div class="grid gap-3 md:grid-cols-4 mb-4">
      <label class="block text-sm">
        <span class="font-medium text-slate-800">{{ t('admin.reminders.filters.status') }}</span>
        <select
          v-model="filters.status"
          class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          @change="onFilterChange"
        >
          <option value="">{{ t('admin.reminders.filters.statusAll') }}</option>
          <option value="SENT">{{ t('admin.reminders.status.SENT') }}</option>
          <option value="FAILED">{{ t('admin.reminders.status.FAILED') }}</option>
          <option value="SKIPPED">{{ t('admin.reminders.status.SKIPPED') }}</option>
        </select>
      </label>
      <label class="block text-sm">
        <span class="font-medium text-slate-800">{{ t('admin.reminders.filters.dateFrom') }}</span>
        <input
          v-model="filters.dateFrom"
          type="date"
          class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          @change="onFilterChange"
        >
      </label>
      <label class="block text-sm">
        <span class="font-medium text-slate-800">{{ t('admin.reminders.filters.dateTo') }}</span>
        <input
          v-model="filters.dateTo"
          type="date"
          class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          @change="onFilterChange"
        >
      </label>
      <div class="flex items-end">
        <button
          type="button"
          class="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
          @click="clearFilters"
        >
          {{ t('admin.reminders.filters.clear') }}
        </button>
      </div>
    </div>

    <div v-if="loadError" class="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ loadError }}
    </div>

    <div v-if="loading" class="py-10 flex justify-center">
      <SpinnerInline />
    </div>

    <div v-else-if="!items.length" class="py-10 text-center">
      <p class="text-sm font-medium text-slate-700">{{ t('admin.reminders.empty') }}</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="text-left text-xs uppercase tracking-wide text-slate-500">
          <tr class="border-b border-slate-200">
            <th class="py-2 pr-3 font-medium">{{ t('admin.reminders.columns.sentAt') }}</th>
            <th class="py-2 pr-3 font-medium">{{ t('admin.reminders.columns.customer') }}</th>
            <th class="py-2 pr-3 font-medium">{{ t('admin.reminders.columns.service') }}</th>
            <th class="py-2 pr-3 font-medium">{{ t('admin.reminders.columns.appointment') }}</th>
            <th class="py-2 pr-3 font-medium">{{ t('admin.reminders.columns.status') }}</th>
            <th class="py-2 pr-3 font-medium">{{ t('admin.reminders.columns.template') }}</th>
            <th class="py-2 pr-3 font-medium">{{ t('admin.reminders.columns.reason') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200/70">
          <tr v-for="row in items" :key="row.id" class="align-top">
            <td class="py-2 pr-3 text-slate-700 whitespace-nowrap">{{ formatDateTime(row.sentAt) }}</td>
            <td class="py-2 pr-3 text-slate-800">
              <div class="font-medium">{{ customerName(row) }}</div>
              <div class="text-xs text-slate-500">{{ row.calendarEvent.customerPhone }}</div>
            </td>
            <td class="py-2 pr-3 text-slate-700">{{ serviceName(row) }}</td>
            <td class="py-2 pr-3 text-slate-700 whitespace-nowrap">{{ formatDateTime(row.calendarEvent.startTime) }}</td>
            <td class="py-2 pr-3">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1"
                :class="statusBadgeClasses(row.status)"
              >
                {{ t(`admin.reminders.status.${row.status}`) }}
              </span>
              <div v-if="row.errorCode" class="mt-1 text-[10px] text-rose-700">#{{ row.errorCode }}</div>
            </td>
            <td class="py-2 pr-3 text-slate-700">
              <div v-if="row.template">
                <code class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-800">{{ row.template.name }}</code>
                <div class="text-xs text-slate-500">{{ row.template.language }}</div>
              </div>
              <span v-else class="text-slate-400 text-xs">—</span>
            </td>
            <td class="py-2 pr-3 text-slate-700 max-w-[280px]">{{ translateReason(row.reason) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-4 flex items-center justify-between text-sm">
        <div class="text-slate-600">{{ page }} / {{ totalPages() }}</div>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition disabled:opacity-50"
            :disabled="page <= 1"
            @click="goPrev"
          >
            {{ t('common.previous') }}
          </button>
          <button
            type="button"
            class="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition disabled:opacity-50"
            :disabled="page >= totalPages()"
            @click="goNext"
          >
            {{ t('common.next') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
