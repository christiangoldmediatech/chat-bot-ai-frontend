<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Company } from '~/types/company'
import type { Lead, LeadInterest, LeadStatus } from '~/types/lead'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const superLeadsApi = useSuperadminLeads()
const companiesApi = useCompanies()

const PAGE_SIZE = 50

const rows = ref<Lead[]>([])
const total = ref(0)
const page = ref(1)
const companies = ref<Company[]>([])
const companyMap = computed(
  () => new Map(companies.value.map((c) => [c.id, c.name])),
)

const loading = ref(true)
const error = ref<string | null>(null)
const backfilling = ref(false)
const notification = ref<string | null>(null)

const tenantFilter = ref('')
const statusFilter = ref<LeadStatus | ''>('')
const interestFilter = ref<LeadInterest | ''>('')
const hasCrmFilter = ref<'' | 'true' | 'false'>('')
const search = ref('')

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const fromIndex = computed(() => (total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1))
const toIndex = computed(() => Math.min(total.value, page.value * PAGE_SIZE))

// Server-side search via the `search` query param — keeps the result set
// in sync with the paginated count instead of filtering only the current
// page in memory.
const filtered = computed(() => rows.value)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const hasCrm =
      hasCrmFilter.value === 'true'
        ? true
        : hasCrmFilter.value === 'false'
          ? false
          : undefined
    const res = await superLeadsApi.listPaginated({
      tenantId: tenantFilter.value || undefined,
      status: statusFilter.value || undefined,
      interest: interestFilter.value || undefined,
      hasCrm,
      search: search.value.trim() || undefined,
      page: page.value,
      pageSize: PAGE_SIZE,
    })
    rows.value = res.items
    total.value = res.total
    page.value = res.page
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

// Debounced search reset to page 1. Backend orders by createdAt DESC so the
// most recent leads always appear first regardless of filters.
let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    page.value = 1
    void load()
  }, 300)
})

function goPrev(): void {
  if (page.value <= 1) return
  page.value -= 1
  void load()
}
function goNext(): void {
  if (page.value >= pageCount.value) return
  page.value += 1
  void load()
}

// Any filter change resets to page 1 so the user always sees the freshest
// matches at the top.
function onFilterChange(): void {
  page.value = 1
  void load()
}

async function loadCompanies(): Promise<void> {
  try {
    companies.value = await companiesApi.list()
  } catch {
    companies.value = []
  }
}

function clearFilters(): void {
  tenantFilter.value = ''
  statusFilter.value = ''
  interestFilter.value = ''
  hasCrmFilter.value = ''
  search.value = ''
  page.value = 1
  void load()
}

/**
 * Triggers the cross-tenant backfill. If the user has a company filter
 * applied, narrows the sweep to just that tenant — otherwise it runs
 * platform-wide. Either way the UI shows the # of jobs enqueued.
 */
async function backfillAllCrm(): Promise<void> {
  backfilling.value = true
  error.value = null
  notification.value = null
  try {
    const { enqueued } = await superLeadsApi.backfillAllCrm({
      tenantId: tenantFilter.value || undefined,
    })
    notification.value = enqueued > 0
      ? `${enqueued} sync job${enqueued === 1 ? '' : 's'} enqueued`
      : 'No leads needed backfilling'
    setTimeout(() => { notification.value = null }, 4000)
    // Refresh the list so PENDING badges show up.
    setTimeout(() => { void load() }, 1500)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    backfilling.value = false
  }
}

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST',
]
const INTEREST_OPTIONS: LeadInterest[] = ['HIGH', 'MEDIUM', 'LOW']

// Status pill colors on dark theme — semantic tones with slate-900 contrast.
function statusPill(status: LeadStatus): string {
  switch (status) {
    case 'NEW': return 'bg-indigo-500/20 text-indigo-200 ring-indigo-400/30'
    case 'CONTACTED': return 'bg-sky-500/20 text-sky-200 ring-sky-400/30'
    case 'QUALIFIED': return 'bg-violet-500/20 text-violet-200 ring-violet-400/30'
    case 'PROPOSAL_SENT': return 'bg-amber-500/20 text-amber-200 ring-amber-400/30'
    case 'NEGOTIATION': return 'bg-orange-500/20 text-orange-200 ring-orange-400/30'
    case 'WON': return 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/30'
    case 'LOST': return 'bg-rose-500/20 text-rose-200 ring-rose-400/30'
    default: return 'bg-slate-700 text-slate-300 ring-slate-600'
  }
}

function interestDot(interest: LeadInterest): string {
  if (interest === 'HIGH') return 'bg-emerald-400'
  if (interest === 'MEDIUM') return 'bg-amber-400'
  return 'bg-slate-500'
}

function crmBadge(lead: Lead): { class: string; text: string } | null {
  if (lead.crmSyncStatus === 'SYNCED') {
    return { class: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/30', text: 'SYNCED' }
  }
  if (lead.crmSyncStatus === 'FAILED') {
    return { class: 'bg-rose-500/20 text-rose-200 ring-rose-400/30', text: 'FAILED' }
  }
  if (lead.crmSyncStatus === 'PENDING') {
    return { class: 'bg-sky-500/20 text-sky-200 ring-sky-400/30', text: 'PENDING' }
  }
  return null
}

await Promise.all([loadCompanies(), load()])
</script>

<template>
  <div>
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
          <span class="size-1.5 rounded-full bg-indigo-400" />
          {{ $t('superadmin.leads.kicker') }}
        </span>
        <h1 class="mt-2 text-2xl font-semibold text-slate-100 tracking-tight">{{ $t('superadmin.leads.title') }}</h1>
        <p class="mt-1 text-sm text-slate-400 max-w-2xl">{{ $t('superadmin.leads.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <span class="inline-flex items-center gap-2 rounded-xl bg-slate-800 ring-1 ring-slate-700 px-3 py-1.5">
          <span class="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{{ $t('superadmin.leads.totalLabel') }}</span>
          <span class="text-base font-bold text-slate-100 tabular-nums">{{ total }}</span>
        </span>
        <button
          type="button"
          :disabled="backfilling"
          class="inline-flex items-center gap-1.5 rounded-xl bg-violet-500/20 ring-1 ring-violet-500/30 px-3 py-1.5 text-sm font-medium text-violet-200 hover:bg-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
          :title="tenantFilter ? $t('superadmin.leads.backfillTenantTooltip') : $t('superadmin.leads.backfillAllTooltip')"
          @click="backfillAllCrm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': backfilling }">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
          {{ backfilling
              ? $t('leads.list.backfillingLabel')
              : tenantFilter
                ? $t('superadmin.leads.backfillTenant')
                : $t('superadmin.leads.backfillAll') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition"
          :disabled="loading"
          @click="load"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': loading }">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
          {{ $t('common.reload') }}
        </button>
      </div>
    </header>

    <p
      v-if="notification"
      class="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200"
    >{{ notification }}</p>

    <!-- Filter bar -->
    <div class="mt-5 rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-3 flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-[18rem]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="search"
          type="search"
          :placeholder="$t('leads.filter.searchPlaceholder')"
          class="w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        >
      </div>

      <select
        v-model="tenantFilter"
        class="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        @change="onFilterChange"
      >
        <option value="">{{ $t('superadmin.leads.allCompanies') }}</option>
        <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>

      <select
        v-model="statusFilter"
        class="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        @change="onFilterChange"
      >
        <option value="">{{ $t('superadmin.leads.allStatuses') }}</option>
        <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ $t(`leads.status.${s}`) }}</option>
      </select>

      <select
        v-model="interestFilter"
        class="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        @change="onFilterChange"
      >
        <option value="">{{ $t('leads.filter.allInterests') }}</option>
        <option v-for="i in INTEREST_OPTIONS" :key="i" :value="i">{{ $t(`leads.interest.${i}`) }}</option>
      </select>

      <select
        v-model="hasCrmFilter"
        class="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
        @change="onFilterChange"
      >
        <option value="">{{ $t('superadmin.leads.allCrm') }}</option>
        <option value="true">{{ $t('superadmin.leads.hasCrmYes') }}</option>
        <option value="false">{{ $t('superadmin.leads.hasCrmNo') }}</option>
      </select>

      <button
        v-if="tenantFilter || statusFilter || interestFilter || hasCrmFilter || search"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-xl bg-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-600 transition"
        @click="clearFilters"
      >
        {{ $t('common.cancel') }}
      </button>
    </div>

    <p v-if="error" class="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{{ error }}</p>

    <SpinnerInline v-if="loading && rows.length === 0" class="mt-6" />

    <div
      v-else-if="filtered.length === 0"
      class="mt-6 rounded-2xl bg-slate-800/40 ring-1 ring-slate-700 p-10 text-center text-slate-400"
    >
      {{ search || tenantFilter || statusFilter || interestFilter || hasCrmFilter ? $t('leads.list.noMatches') : $t('leads.list.empty') }}
    </div>

    <!-- Table -->
    <div
      v-else
      class="mt-4 overflow-hidden rounded-2xl bg-slate-800/60 ring-1 ring-slate-700"
      :class="{ 'opacity-60 pointer-events-none': loading }"
    >
      <table class="w-full text-sm text-left">
        <thead class="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-900/60">
          <tr>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.customer') }}</th>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.company') }}</th>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.status') }}</th>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.score') }}</th>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.crm') }}</th>
            <th scope="col" class="px-4 py-3 font-semibold">{{ $t('superadmin.leads.col.created') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-700">
          <tr
            v-for="l in filtered"
            :key="l.id"
            class="hover:bg-slate-800/70 transition cursor-pointer"
            @click="$router.push(`/superadmin/leads/${l.id}`)"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-semibold text-xs">
                  {{ (l.customerName || l.customerPhone || '?').charAt(0).toUpperCase() }}
                </span>
                <div class="min-w-0">
                  <div class="text-slate-100 font-medium truncate">{{ l.customerName || l.customerPhone }}</div>
                  <div class="text-[11px] text-slate-500 font-mono truncate">{{ l.customerPhone }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <!-- Drill into this company's leads list (not the company
                   detail) — clicking the company name should narrow the
                   view to only that tenant's leads, mirroring what the
                   user expects from a column-level filter. -->
              <NuxtLink
                :to="`/superadmin/companies/${l.tenantId}/leads`"
                class="text-xs text-indigo-300 hover:underline"
                @click.stop
              >
                {{ companyMap.get(l.tenantId) ?? l.tenantId.slice(0, 8) }}
              </NuxtLink>
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset"
                :class="statusPill(l.status)"
              >
                {{ $t(`leads.status.${l.status}`) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="size-1.5 rounded-full" :class="interestDot(l.interest)" />
                <span class="text-slate-100 font-bold tabular-nums">{{ l.score }}</span>
                <span class="text-[11px] text-slate-500">{{ $t(`leads.interest.${l.interest}`) }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <a
                v-if="l.crmLeadUrl"
                :href="l.crmLeadUrl"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 text-xs text-violet-300 hover:underline"
                @click.stop
              >
                {{ $t('leads.list.crmBadge') }}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                  <path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd" />
                  <path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd" />
                </svg>
              </a>
              <span
                v-else-if="crmBadge(l)"
                class="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset"
                :class="crmBadge(l)?.class"
              >
                {{ crmBadge(l)?.text }}
              </span>
              <span v-else class="text-[11px] text-slate-500">{{ $t('leads.crmStatus.NOT_CONFIGURED') }}</span>
            </td>
            <td class="px-4 py-3 text-xs text-slate-400">{{ new Date(l.createdAt).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination footer -->
    <div
      v-if="filtered.length > 0 && pageCount > 1"
      class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 px-4 py-3"
    >
      <p class="text-xs text-slate-400 tabular-nums">
        {{ $t('leads.pagination.summary', { from: fromIndex, to: toIndex, total }) }}
      </p>
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-500 tabular-nums">
          {{ $t('leads.pagination.page', { page, total: pageCount }) }}
        </span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-xl bg-slate-900 ring-1 ring-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          :disabled="page <= 1 || loading"
          @click="goPrev"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {{ $t('leads.pagination.previous') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          :disabled="page >= pageCount || loading"
          @click="goNext"
        >
          {{ $t('leads.pagination.next') }}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
