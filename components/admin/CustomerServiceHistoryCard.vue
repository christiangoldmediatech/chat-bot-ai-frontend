<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Service } from '~/types/service'
import type {
  AttendanceResult,
  ServiceHistoryItem,
  ServiceHistoryResponse,
} from '~/types/service-history'

const props = defineProps<{
  botId: string
  phone: string
  tenantId?: string
  botLabel?: string
}>()

const emit = defineEmits<{ refreshed: [] }>()

const { t, locale } = useI18n()
const historyApi = useServiceHistory(props.tenantId)
const servicesApi = useServices(props.tenantId)
const meetingsApi = useMeetings(props.tenantId)

const data = ref<ServiceHistoryResponse | null>(null)
const services = ref<Service[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const page = ref(1)
const limit = ref(20)
const statusFilter = ref<AttendanceResult | ''>('')
const serviceFilter = ref<string>('')

const markingId = ref<string | null>(null)
const confirmTarget = ref<{ id: string, result: 'ATTENDED' | 'NO_SHOW' } | null>(null)
const successMsg = ref<string | null>(null)

const STATUS_OPTIONS: Array<{ value: '' | AttendanceResult, key: string }> = [
  { value: '', key: 'all' },
  { value: 'ATTENDED', key: 'attended' },
  { value: 'NO_SHOW', key: 'noShow' },
  { value: 'RESCHEDULED', key: 'rescheduled' },
  { value: 'CANCELLED', key: 'cancelled' },
  { value: 'PENDING', key: 'pending' },
  { value: 'UNREGISTERED', key: 'unregistered' },
]

async function loadServices(): Promise<void> {
  try {
    services.value = await servicesApi.list(props.botId)
  } catch {
    services.value = []
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await historyApi.get(props.botId, props.phone, {
      page: page.value,
      limit: limit.value,
      status: statusFilter.value || undefined,
      serviceId: serviceFilter.value || undefined,
    })
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function markAttendance(id: string, result: 'ATTENDED' | 'NO_SHOW'): Promise<void> {
  markingId.value = id
  try {
    const outcome = result === 'ATTENDED' ? 'COMPLETED' : 'NO_SHOW'
    await meetingsApi.markOutcome(id, outcome)
    successMsg.value = t('customers.serviceHistory.markSuccess')
    await load()
    emit('refreshed')
    setTimeout(() => { successMsg.value = null }, 3000)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    markingId.value = null
    confirmTarget.value = null
  }
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function fmtMoney(cents: number | null, currency: string | null): string {
  if (cents === null || currency === null) return '—'
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function fmtAttendanceRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)}%`
}

function toneForResult(result: AttendanceResult): { chip: string, label: string } {
  const label = t(`customers.serviceHistory.status.${result.toLowerCase()}`)
  switch (result) {
    case 'ATTENDED':
      return { chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', label }
    case 'NO_SHOW':
      return { chip: 'bg-danger-50 text-danger-700 ring-danger-200', label }
    case 'RESCHEDULED':
      return { chip: 'bg-amber-50 text-amber-800 ring-amber-200', label }
    case 'CANCELLED':
      return { chip: 'bg-slate-100 text-slate-600 ring-slate-200', label }
    case 'PENDING':
      return { chip: 'bg-primary-50 text-primary-700 ring-primary-200', label }
    case 'UNREGISTERED':
    default:
      return { chip: 'bg-slate-50 text-slate-500 ring-slate-300 border border-dashed border-slate-300', label }
  }
}

const canMark = (item: ServiceHistoryItem): boolean =>
  item.attendanceResult === 'UNREGISTERED'

const totalPages = computed(() => {
  if (!data.value || data.value.limit === 0) return 1
  return Math.max(1, Math.ceil(data.value.total / data.value.limit))
})

const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < totalPages.value)

watch([page, statusFilter, serviceFilter], () => { void load() })
onMounted(async () => {
  await loadServices()
  await load()
})
</script>

<template>
  <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-6 space-y-5">
    <header class="flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 ring-1 ring-primary-100">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-primary-600" aria-hidden="true"><path d="M9 11H15M9 15H13M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold text-slate-900">
          {{ $t('customers.serviceHistory.title') }}
          <span v-if="botLabel" class="text-slate-500 font-normal">— {{ botLabel }}</span>
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">{{ $t('customers.serviceHistory.subtitle') }}</p>
      </div>
    </header>

    <SpinnerInline v-if="loading && !data" />

    <template v-else-if="data">
      <div class="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <div><span class="text-slate-500">{{ $t('customers.serviceHistory.summary.total') }}:</span> <strong class="text-slate-900">{{ data.summary.totalAppointments }}</strong></div>
        <div><span class="text-slate-500">{{ $t('customers.serviceHistory.summary.attended') }}:</span> <strong class="text-emerald-700">{{ data.summary.attended }}</strong></div>
        <div><span class="text-slate-500">{{ $t('customers.serviceHistory.summary.noShow') }}:</span> <strong class="text-danger-700">{{ data.summary.noShow }}</strong></div>
        <div><span class="text-slate-500">{{ $t('customers.serviceHistory.summary.rescheduled') }}:</span> <strong class="text-amber-700">{{ data.summary.rescheduled }}</strong></div>
        <div><span class="text-slate-500">{{ $t('customers.serviceHistory.summary.pendingUnreg') }}:</span> <strong class="text-slate-700">{{ data.summary.pending + data.summary.unregistered }}</strong></div>
        <div><span class="text-slate-500">{{ $t('customers.serviceHistory.summary.attendanceRate') }}:</span> <strong class="text-slate-900">{{ fmtAttendanceRate(data.summary.attendanceRate) }}</strong></div>
        <div><span class="text-slate-500">{{ $t('customers.serviceHistory.summary.totalSpent') }}:</span> <strong class="text-slate-900">{{ fmtMoney(data.summary.totalAmountCents, data.summary.currency) }}</strong></div>
        <div v-if="data.summary.lastVisitAt"><span class="text-slate-500">{{ $t('customers.serviceHistory.summary.lastVisit') }}:</span> <strong class="text-slate-900">{{ fmtDate(data.summary.lastVisitAt) }}</strong></div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select v-model="statusFilter" class="rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
          <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ $t(`customers.serviceHistory.filter.${opt.key}`) }}</option>
        </select>
        <select v-model="serviceFilter" class="rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
          <option value="">{{ $t('customers.serviceHistory.filter.allServices') }}</option>
          <option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>

      <p v-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>
      <p v-if="successMsg" class="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-700">{{ successMsg }}</p>

      <div v-if="data.items.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-slate-500">
        {{ $t('customers.serviceHistory.empty') }}
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th class="py-2 pr-3 font-medium">{{ $t('customers.serviceHistory.col.when') }}</th>
              <th class="py-2 pr-3 font-medium">{{ $t('customers.serviceHistory.col.service') }}</th>
              <th class="py-2 pr-3 font-medium">{{ $t('customers.serviceHistory.col.amount') }}</th>
              <th class="py-2 pr-3 font-medium">{{ $t('customers.serviceHistory.col.result') }}</th>
              <th class="py-2 pr-3 font-medium text-right">{{ $t('customers.serviceHistory.col.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/70">
            <tr v-for="item in data.items" :key="item.appointmentId" class="align-top hover:bg-slate-50/50">
              <td class="py-3 pr-3">
                <div class="font-medium text-slate-900">{{ fmtDate(item.scheduledAt) }}</div>
                <div v-if="item.rescheduleCount > 0" class="mt-1 text-[11px] text-amber-700">
                  {{ $t('customers.serviceHistory.rescheduledNTimes', { n: item.rescheduleCount }) }}
                  <details class="mt-0.5">
                    <summary class="cursor-pointer text-slate-500 hover:text-slate-700">{{ $t('customers.serviceHistory.viewChain') }}</summary>
                    <ul class="mt-1 space-y-0.5 text-slate-600">
                      <li v-for="(r, i) in item.reschedules" :key="i">{{ fmtDate(r.previousStartsAt) }} → {{ fmtDate(r.newStartsAt) }}</li>
                    </ul>
                  </details>
                </div>
              </td>
              <td class="py-3 pr-3">
                <div class="text-slate-800">{{ item.service?.name ?? '—' }}</div>
                <div v-if="item.topic && item.service && item.topic !== item.service.name" class="text-[11px] text-slate-500 line-clamp-1">{{ item.topic }}</div>
              </td>
              <td class="py-3 pr-3 tabular-nums text-slate-800">{{ fmtMoney(item.amountCents, item.currency) }}</td>
              <td class="py-3 pr-3">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1" :class="toneForResult(item.attendanceResult).chip">
                  {{ toneForResult(item.attendanceResult).label }}
                </span>
              </td>
              <td class="py-3 pr-3 text-right">
                <div class="inline-flex items-center gap-1.5 flex-wrap justify-end">
                  <button
                    v-if="canMark(item)"
                    type="button"
                    :disabled="markingId === item.appointmentId"
                    class="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    @click="confirmTarget = { id: item.appointmentId, result: 'ATTENDED' }"
                  >
                    {{ $t('customers.serviceHistory.markAttended') }}
                  </button>
                  <button
                    v-if="canMark(item)"
                    type="button"
                    :disabled="markingId === item.appointmentId"
                    class="rounded-md bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-60"
                    @click="confirmTarget = { id: item.appointmentId, result: 'NO_SHOW' }"
                  >
                    {{ $t('customers.serviceHistory.markNoShow') }}
                  </button>
                  <NuxtLink :to="tenantId ? `/superadmin/companies/${tenantId}/conversations/${item.conversationId}` : `/admin/conversations/${item.conversationId}`" class="text-[11px] text-primary-700 hover:underline">
                    {{ $t('customers.serviceHistory.viewConversation') }}
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-between text-xs text-slate-600 pt-2">
        <span>{{ $t('customers.serviceHistory.pagination', { page: data.page, total: totalPages }) }}</span>
        <div class="flex gap-2">
          <button type="button" :disabled="!canPrev" class="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-40" @click="page--">
            {{ $t('common.previous') }}
          </button>
          <button type="button" :disabled="!canNext" class="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-40" @click="page++">
            {{ $t('common.next') }}
          </button>
        </div>
      </div>
    </template>

    <ConfirmDialog
      :open="confirmTarget !== null"
      :title="confirmTarget?.result === 'ATTENDED' ? $t('customers.serviceHistory.confirmAttendedTitle') : $t('customers.serviceHistory.confirmNoShowTitle')"
      :message="$t('customers.serviceHistory.confirmMessage')"
      tone="default"
      :confirm-label="confirmTarget?.result === 'ATTENDED' ? $t('customers.serviceHistory.markAttended') : $t('customers.serviceHistory.markNoShow')"
      @confirm="confirmTarget && markAttendance(confirmTarget.id, confirmTarget.result)"
      @cancel="confirmTarget = null"
    />
  </section>
</template>
