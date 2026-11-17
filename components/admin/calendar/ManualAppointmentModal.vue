<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { ManualAppointment } from '~/types/calendar'
import type { CustomerSummary } from '~/types/customer'
import type { Service } from '~/types/service'

const props = defineProps<{
  open: boolean
  botId: string
  tenantId?: string
  services: Service[]
  defaultDate?: string
  timezoneLabel?: string
}>()

const emit = defineEmits<{
  close: []
  saved: [ManualAppointment]
}>()

const { t } = useI18n()
const cal = useCalendar(props.tenantId)
const customersApi = useCustomers(props.tenantId)

const form = reactive({
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  serviceName: '',
  date: '',
  time: '',
  notes: '',
})

const search = ref('')
const searching = ref(false)
const results = ref<CustomerSummary[]>([])
const allCustomers = ref<CustomerSummary[] | null>(null)
const saving = ref(false)
const error = ref<string | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchSeq = 0

function reset(): void {
  form.customerName = ''
  form.customerPhone = ''
  form.customerEmail = ''
  form.serviceName = props.services[0]?.name ?? ''
  form.date = props.defaultDate ?? ''
  form.time = ''
  form.notes = ''
  search.value = ''
  results.value = []
  allCustomers.value = null
  error.value = null
  saving.value = false
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) reset()
  },
)

async function runSearch(term: string): Promise<void> {
  const seq = ++searchSeq
  searching.value = true
  try {
    let found: CustomerSummary[]
    if (props.tenantId) {
      if (!allCustomers.value) {
        allCustomers.value = await customersApi.list(props.botId)
      }
      const needle = term.toLowerCase()
      const phoneDigits = /^[\d\s+()-]+$/.test(term)
        ? term.replace(/\D/g, '').replace(/^0+/, '')
        : ''
      found = allCustomers.value.filter(
        (c) =>
          (c.customerName ?? '').toLowerCase().includes(needle)
          || (phoneDigits.length > 0 && c.customerPhone.includes(phoneDigits)),
      )
    } else {
      const page = await customersApi.listPaginated({
        botId: props.botId,
        search: term,
        pageSize: 8,
      })
      found = page.items
    }
    if (seq === searchSeq) results.value = found.slice(0, 8)
  } catch {
    if (seq === searchSeq) results.value = []
  } finally {
    if (seq === searchSeq) searching.value = false
  }
}

watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  const term = value.trim()
  if (term.length < 2) {
    searchSeq++
    results.value = []
    searching.value = false
    return
  }
  searchTimer = setTimeout(() => void runSearch(term), 300)
})

function pickCustomer(customer: CustomerSummary): void {
  form.customerName = customer.customerName ?? ''
  form.customerPhone = customer.customerPhone.startsWith('+')
    ? customer.customerPhone
    : `+${customer.customerPhone}`
  search.value = ''
  results.value = []
}

const canSubmit = computed(
  () =>
    form.customerName.trim().length >= 2
    && form.customerPhone.trim().length >= 7
    && form.customerEmail.trim().length > 0
    && form.serviceName.length > 0
    && form.date.length > 0
    && form.time.length > 0
    && !saving.value,
)

function describeError(err: ApiError): string {
  const reason = /Slot unavailable: (\w+)/.exec(err.message ?? '')?.[1]
  if (reason) {
    const key = `admin.calendarView.manualAppointment.errors.slot.${reason}`
    const translated = t(key)
    return translated === key
      ? t('admin.calendarView.manualAppointment.errors.slot.generic')
      : translated
  }
  if (/not connected to Google Calendar/i.test(err.message ?? '')) {
    return t('admin.calendarView.manualAppointment.errors.notConnected')
  }
  if (/credentials/i.test(err.message ?? '')) {
    return t('admin.calendarView.manualAppointment.errors.credentials')
  }
  if (/customerPhone/i.test(err.message ?? '')) {
    return t('admin.calendarView.manualAppointment.errors.phone')
  }
  return err.message || t('admin.calendarView.manualAppointment.errors.generic')
}

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return
  saving.value = true
  error.value = null
  try {
    const notes = form.notes.trim()
    const created = await cal.createAppointment(props.botId, {
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      customerEmail: form.customerEmail.trim(),
      serviceName: form.serviceName,
      startsAt: `${form.date}T${form.time.slice(0, 5)}`,
      ...(notes ? { notes } : {}),
    })
    emit('saved', created)
    emit('close')
  } catch (err) {
    error.value = describeError(err as ApiError)
  } finally {
    saving.value = false
  }
}

const inputClass
  = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
const labelClass = 'block text-xs font-medium text-slate-700 mb-1'
</script>

<template>
  <Modal
    :open="open"
    :title="$t('admin.calendarView.manualAppointment.title')"
    size="lg"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent="onSubmit">
      <p class="text-xs text-slate-500">{{ $t('admin.calendarView.manualAppointment.intro') }}</p>

      <div class="relative">
        <label :class="labelClass">{{ $t('admin.calendarView.manualAppointment.searchLabel') }}</label>
        <input
          v-model="search"
          type="search"
          autocomplete="off"
          :placeholder="$t('admin.calendarView.manualAppointment.searchPlaceholder')"
          :class="inputClass"
        >
        <ul
          v-if="results.length > 0"
          class="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <li v-for="customer in results" :key="customer.customerPhone">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
              @click="pickCustomer(customer)"
            >
              <span class="truncate text-slate-900">{{ customer.customerName || $t('admin.calendarView.manualAppointment.unnamedCustomer') }}</span>
              <span class="shrink-0 text-xs text-slate-500">{{ customer.customerPhone }}</span>
            </button>
          </li>
        </ul>
        <p v-else-if="search.trim().length >= 2 && !searching" class="mt-1 text-xs text-slate-500">
          {{ $t('admin.calendarView.manualAppointment.searchEmpty') }}
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label :class="labelClass">{{ $t('admin.calendarView.manualAppointment.nameLabel') }}</label>
          <input v-model="form.customerName" type="text" required minlength="2" maxlength="120" :class="inputClass">
        </div>
        <div>
          <label :class="labelClass">{{ $t('admin.calendarView.manualAppointment.phoneLabel') }}</label>
          <input
            v-model="form.customerPhone"
            type="tel"
            required
            maxlength="32"
            :placeholder="$t('admin.calendarView.manualAppointment.phonePlaceholder')"
            :class="inputClass"
          >
          <p class="mt-1 text-xs text-slate-500">{{ $t('admin.calendarView.manualAppointment.phoneHint') }}</p>
        </div>
      </div>

      <div>
        <label :class="labelClass">{{ $t('admin.calendarView.manualAppointment.emailLabel') }}</label>
        <input v-model="form.customerEmail" type="email" required maxlength="254" :class="inputClass">
        <p class="mt-1 text-xs text-slate-500">{{ $t('admin.calendarView.manualAppointment.emailHint') }}</p>
      </div>

      <div>
        <label :class="labelClass">{{ $t('admin.calendarView.manualAppointment.serviceLabel') }}</label>
        <select v-model="form.serviceName" required :class="inputClass">
          <option v-for="s in services" :key="s.id" :value="s.name">{{ s.name }}</option>
        </select>
        <p v-if="services.length === 0" class="mt-1 text-xs text-danger-700">
          {{ $t('admin.calendarView.manualAppointment.noServices') }}
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label :class="labelClass">{{ $t('admin.calendarView.manualAppointment.dateLabel') }}</label>
          <input v-model="form.date" type="date" required :class="inputClass">
        </div>
        <div>
          <label :class="labelClass">{{ $t('admin.calendarView.manualAppointment.timeLabel') }}</label>
          <input v-model="form.time" type="time" required step="300" :class="inputClass">
          <p v-if="timezoneLabel" class="mt-1 text-xs text-slate-500">{{ timezoneLabel }}</p>
        </div>
      </div>

      <div>
        <label :class="labelClass">{{ $t('admin.calendarView.manualAppointment.notesLabel') }}</label>
        <textarea v-model="form.notes" rows="2" maxlength="2000" :class="inputClass" />
      </div>

      <p v-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>

      <div class="flex justify-end gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          class="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          @click="emit('close')"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          type="submit"
          class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          :disabled="!canSubmit"
        >
          {{ saving ? $t('common.saving') : $t('admin.calendarView.manualAppointment.submit') }}
        </button>
      </div>
    </form>
  </Modal>
</template>
