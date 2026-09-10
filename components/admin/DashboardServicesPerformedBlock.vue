<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { ServicesPerformedResponse, ServicesPerformedRow } from '~/types/service-history'

const props = defineProps<{
  from: string
  to: string
  botId?: string
  tenantId?: string
}>()

const { t, locale } = useI18n()

const metrics = props.tenantId
  ? useSuperadminTenantDashboardMetrics(props.tenantId)
  : useTenantDashboardMetrics()

const data = ref<ServicesPerformedResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const sortKey = ref<'attended' | 'scheduled' | 'noShow' | 'rescheduled' | 'revenueCents'>('attended')
const sortDir = ref<'desc' | 'asc'>('desc')

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await metrics.servicesPerformed({
      from: props.from,
      to: props.to,
      botId: props.botId,
    })
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

watch(() => [props.from, props.to, props.botId], () => { void load() }, { immediate: true })

function fmtMoney(cents: number, currency: string | null): string {
  if (!currency) return cents === 0 ? '—' : String(cents / 100)
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function fmtRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)}%`
}

const sortedRows = computed<ServicesPerformedRow[]>(() => {
  if (!data.value) return []
  const rows = data.value.rows.slice()
  const dir = sortDir.value === 'desc' ? -1 : 1
  rows.sort((a, b) => {
    const av = a[sortKey.value] ?? 0
    const bv = b[sortKey.value] ?? 0
    if (av === bv) return 0
    return av < bv ? -dir : dir
  })
  return rows
})

function setSort(k: typeof sortKey.value): void {
  if (sortKey.value === k) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = k
    sortDir.value = 'desc'
  }
}

function meetingLink(row: ServicesPerformedRow): string {
  const q = new URLSearchParams()
  q.set('serviceId', row.serviceId ?? '')
  q.set('dateFrom', props.from)
  q.set('dateTo', props.to)
  if (props.botId) q.set('botId', props.botId)
  return props.tenantId
    ? `/superadmin/companies/${props.tenantId}/meetings?${q.toString()}`
    : `/admin/meetings?${q.toString()}`
}
</script>

<template>
  <section class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass p-5">
    <header class="mb-4">
      <h3 class="text-sm font-semibold text-slate-900">{{ $t('admin.dashboardServices.title') }}</h3>
      <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.dashboardServices.subtitle') }}</p>
    </header>

    <div v-if="loading && !data" class="h-40 rounded-xl bg-slate-100/60 animate-pulse" />
    <p v-else-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>
    <div v-else-if="data && data.rows.length === 0" class="text-sm text-slate-400 py-6 text-center">
      {{ $t('admin.dashboardServices.empty') }}
    </div>
    <div v-else-if="data" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-[11px] uppercase tracking-wider text-slate-600 font-medium border-b border-slate-200">
            <th class="py-2 pr-3">{{ $t('admin.dashboardServices.col.service') }}</th>
            <th class="py-2 pr-3 cursor-pointer" @click="setSort('attended')">{{ $t('admin.dashboardServices.col.attended') }}</th>
            <th class="py-2 pr-3 cursor-pointer" @click="setSort('scheduled')">{{ $t('admin.dashboardServices.col.scheduled') }}</th>
            <th class="py-2 pr-3 cursor-pointer" @click="setSort('noShow')">{{ $t('admin.dashboardServices.col.noShow') }}</th>
            <th class="py-2 pr-3 cursor-pointer" @click="setSort('rescheduled')">{{ $t('admin.dashboardServices.col.rescheduled') }}</th>
            <th class="py-2 pr-3">{{ $t('admin.dashboardServices.col.rate') }}</th>
            <th class="py-2 pr-3 cursor-pointer" @click="setSort('revenueCents')">{{ $t('admin.dashboardServices.col.revenue') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200/70">
          <tr v-for="row in sortedRows" :key="row.serviceId ?? row.name" class="hover:bg-slate-50/50">
            <td class="py-2 pr-3">
              <NuxtLink :to="meetingLink(row)" class="text-slate-800 font-medium hover:text-primary-700">{{ row.name }}</NuxtLink>
            </td>
            <td class="py-2 pr-3 tabular-nums font-semibold" :class="row.attended > 0 ? 'text-success-700' : 'text-slate-500'">{{ row.attended }}</td>
            <td class="py-2 pr-3 tabular-nums text-slate-700">{{ row.scheduled }}</td>
            <td class="py-2 pr-3 tabular-nums" :class="row.noShow > 0 ? 'text-danger-700 font-medium' : 'text-slate-500'">{{ row.noShow }}</td>
            <td class="py-2 pr-3 tabular-nums" :class="row.rescheduled > 0 ? 'text-warning-700 font-medium' : 'text-slate-500'">{{ row.rescheduled }}</td>
            <td class="py-2 pr-3 tabular-nums text-slate-700">{{ fmtRate(row.attendanceRate) }}</td>
            <td class="py-2 pr-3 tabular-nums text-slate-900 font-medium">{{ fmtMoney(row.revenueCents, row.currency) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
