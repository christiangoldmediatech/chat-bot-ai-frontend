<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { LeadDetail, LeadStatus } from '~/types/lead'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const tenantId = computed(() => String(route.params.id))
const leadId = computed(() => String(route.params.leadId))
const leadsApi = useLeads(tenantId.value)
const { t } = useI18n()

const lead = ref<LeadDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)
const syncing = ref(false)
const notification = ref<string | null>(null)
const payloadOpen = ref(false)
const payloadCopied = ref(false)

// Lifted to match the global superadmin detail page — keeps the two views
// in parity so it doesn't matter which URL the platform admin reaches the
// lead through.
const form = ref({
  status: '' as LeadStatus | '',
  note: '',
  customerName: '',
  customerEmail: '',
})

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST',
]

const payloadJson = computed(() =>
  lead.value?.crmPayload ? JSON.stringify(lead.value.crmPayload, null, 2) : '',
)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    lead.value = await leadsApi.get(leadId.value)
    form.value = {
      status: lead.value.status,
      note: '',
      customerName: lead.value.customerName ?? '',
      customerEmail: lead.value.customerEmail ?? '',
    }
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

const hasFormChanges = computed(() => {
  if (!lead.value) return false
  return (
    form.value.status !== lead.value.status ||
    form.value.note.trim().length > 0 ||
    form.value.customerName !== (lead.value.customerName ?? '') ||
    form.value.customerEmail !== (lead.value.customerEmail ?? '')
  )
})

async function saveChanges(): Promise<void> {
  if (!lead.value || !hasFormChanges.value) return
  saving.value = true
  error.value = null
  try {
    const payload: Record<string, unknown> = {}
    if (form.value.status && form.value.status !== lead.value.status) {
      payload.status = form.value.status
    }
    if (form.value.note.trim()) payload.note = form.value.note.trim()
    if (form.value.customerName !== (lead.value.customerName ?? '')) {
      payload.customerName = form.value.customerName
    }
    if (form.value.customerEmail !== (lead.value.customerEmail ?? '')) {
      payload.customerEmail = form.value.customerEmail
    }
    await leadsApi.update(leadId.value, payload)
    notification.value = t('leads.detail.saved')
    setTimeout(() => { notification.value = null }, 2500)
    await load()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

async function retrySync(): Promise<void> {
  syncing.value = true
  error.value = null
  try {
    await leadsApi.syncCrm(leadId.value)
    notification.value = t('leads.detail.syncQueued')
    setTimeout(() => { notification.value = null }, 2500)
    setTimeout(() => { void load() }, 1500)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    syncing.value = false
  }
}

async function copyPayload(): Promise<void> {
  if (!payloadJson.value || !import.meta.client) return
  try {
    await navigator.clipboard.writeText(payloadJson.value)
    payloadCopied.value = true
    setTimeout(() => { payloadCopied.value = false }, 1500)
  } catch {
    // Clipboard may be unavailable in non-secure contexts; pre block is
    // still selectable manually as a fallback.
  }
}

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

function crmTone(): { ring: string; bg: string; text: string; dot: string } {
  if (!lead.value) return { ring: 'ring-slate-700', bg: 'bg-slate-800', text: 'text-slate-300', dot: 'bg-slate-500' }
  switch (lead.value.crmSyncStatus) {
    case 'SYNCED': return { ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-200', dot: 'bg-emerald-400' }
    case 'PENDING': return { ring: 'ring-sky-500/30', bg: 'bg-sky-500/10', text: 'text-sky-200', dot: 'bg-sky-400 animate-pulse' }
    case 'FAILED': return { ring: 'ring-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-200', dot: 'bg-rose-400' }
    default: return { ring: 'ring-slate-700', bg: 'bg-slate-800', text: 'text-slate-300', dot: 'bg-slate-500' }
  }
}

await load()
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${tenantId}/leads`" class="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {{ $t('superadmin.leads.backToCompanyLeads') }}
    </NuxtLink>

    <p v-if="error" class="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{{ error }}</p>
    <p v-if="notification" class="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{{ notification }}</p>

    <SpinnerInline v-if="loading && !lead" class="mt-6" />

    <template v-else-if="lead">
      <!-- Header -->
      <header class="mt-4 rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-5 flex items-start gap-4 flex-wrap">
        <div class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xl">
          {{ (lead.customerName || lead.customerPhone).charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-[16rem]">
          <h1 class="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight">
            {{ lead.customerName || lead.customerPhone }}
          </h1>
          <div class="mt-1 flex items-center gap-2 flex-wrap text-xs">
            <span class="font-mono text-slate-400">{{ lead.customerPhone }}</span>
            <span v-if="lead.customerEmail" class="text-slate-500">·</span>
            <span v-if="lead.customerEmail" class="text-slate-300">{{ lead.customerEmail }}</span>
          </div>
          <p v-if="lead.reason" class="mt-2 text-sm text-slate-300">{{ lead.reason }}</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span
            class="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ring-1 ring-inset"
            :class="statusPill(lead.status)"
          >
            {{ $t(`leads.status.${lead.status}`) }}
          </span>
          <span class="text-xs text-slate-400">
            <span class="text-base font-bold text-slate-100 tabular-nums">{{ lead.score }}</span>
            <span class="ml-1">{{ $t(`leads.interest.${lead.interest}`) }}</span>
          </span>
        </div>
      </header>

      <div class="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- LEFT: form + timeline -->
        <div class="lg:col-span-2 space-y-4">
          <section class="rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-5">
            <h3 class="text-sm font-semibold text-slate-100">{{ $t('leads.detail.editTitle') }}</h3>
            <p class="text-xs text-slate-400 mt-0.5">{{ $t('superadmin.leads.editHint') }}</p>

            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="block">
                <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-400">{{ $t('leads.detail.statusLabel') }}</span>
                <select
                  v-model="form.status"
                  class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ $t(`leads.status.${s}`) }}</option>
                </select>
              </label>
              <label class="block">
                <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-400">{{ $t('leads.detail.scoreLabel') }}</span>
                <div class="mt-1 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 ring-1 ring-inset ring-slate-700">
                  <span class="text-base font-bold text-slate-100 tabular-nums">{{ lead.score }}</span>
                  <span class="text-xs text-slate-500">·</span>
                  <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {{ $t(`leads.interest.${lead.interest}`) }} · {{ lead.conversionProb }}%
                  </span>
                </div>
              </label>
              <label class="block">
                <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-400">{{ $t('leads.detail.nameLabel') }}</span>
                <input
                  v-model="form.customerName"
                  type="text"
                  :placeholder="$t('leads.detail.namePlaceholder')"
                  maxlength="200"
                  class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
              </label>
              <label class="block">
                <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-400">{{ $t('leads.detail.emailLabel') }}</span>
                <input
                  v-model="form.customerEmail"
                  type="email"
                  :placeholder="$t('leads.detail.emailPlaceholder')"
                  maxlength="320"
                  class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
              </label>
            </div>

            <label class="block mt-3">
              <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-400">{{ $t('leads.detail.noteLabel') }}</span>
              <textarea
                v-model="form.note"
                rows="2"
                maxlength="2000"
                :placeholder="$t('leads.detail.notePlaceholder')"
                class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </label>

            <div class="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                class="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                :disabled="saving"
                @click="load"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="button"
                class="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50"
                :disabled="!hasFormChanges || saving"
                @click="saveChanges"
              >
                {{ saving ? $t('common.saving') : $t('common.save') }}
              </button>
            </div>
          </section>

          <!-- Timeline (dark-themed inline render — keeps parity with the
               global superadmin detail page, single source for both URLs). -->
          <section class="rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-5">
            <h3 class="text-sm font-semibold text-slate-100">{{ $t('leads.detail.timelineTitle') }}</h3>
            <p class="text-xs text-slate-400 mt-0.5">{{ $t('leads.detail.timelineSubtitle') }}</p>

            <ol v-if="lead.events.length > 0" class="mt-5 relative space-y-3 pl-5">
              <span class="absolute left-1.5 top-1 bottom-1 w-px bg-slate-700" aria-hidden="true" />
              <li v-for="ev in lead.events" :key="ev.id" class="relative">
                <span class="absolute -left-[15px] top-1 size-3 rounded-full ring-2 ring-slate-900 bg-indigo-400" />
                <div class="flex items-center gap-2 flex-wrap text-xs">
                  <span class="font-semibold text-slate-200 uppercase tracking-wider text-[10px]">
                    {{ $t(`leads.eventType.${ev.type}`) }}
                  </span>
                  <span v-if="ev.scoreDelta !== 0" class="text-[10px] font-semibold text-emerald-300">+{{ ev.scoreDelta }}</span>
                  <time class="text-[11px] text-slate-500">{{ new Date(ev.createdAt).toLocaleString() }}</time>
                </div>
                <p
                  v-if="ev.type === 'MANUAL_NOTE' && typeof ev.payload?.note === 'string'"
                  class="mt-1 text-sm text-slate-300"
                >{{ ev.payload.note }}</p>
                <p
                  v-else-if="ev.type === 'STATUS_CHANGED' && ev.fromStatus && ev.toStatus"
                  class="mt-1 text-sm text-slate-300"
                >{{ ev.fromStatus }} → {{ ev.toStatus }}</p>
                <p
                  v-else-if="ev.type === 'CRM_SYNC_FAIL' && typeof ev.payload?.error === 'string'"
                  class="mt-1 text-sm text-rose-300"
                >{{ ev.payload.error }}</p>
              </li>
            </ol>
            <p v-else class="mt-4 text-sm text-slate-400">{{ $t('leads.detail.timelineEmpty') }}</p>
          </section>
        </div>

        <!-- RIGHT: CRM card + payload + facts -->
        <div class="space-y-4">
          <section class="rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-5">
            <header class="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 class="text-sm font-semibold text-slate-100">{{ $t('leads.detail.crmTitle') }}</h3>
                <p class="text-xs text-slate-400 mt-0.5">{{ $t('leads.detail.crmSubtitle') }}</p>
              </div>
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-inset"
                :class="[crmTone().bg, crmTone().ring, crmTone().text]"
              >
                <span class="size-1.5 rounded-full" :class="crmTone().dot" />
                <span class="text-[10px] uppercase tracking-wider font-semibold">
                  {{ $t(`leads.crmStatus.${lead.crmSyncStatus}`) }}
                </span>
              </span>
            </header>
            <dl class="mt-4 grid grid-cols-1 gap-3 text-xs">
              <div v-if="lead.crmProvider">
                <dt class="text-slate-500">{{ $t('leads.detail.crmProvider') }}</dt>
                <dd class="text-slate-100 font-medium mt-0.5">{{ lead.crmProvider }}</dd>
              </div>
              <div v-if="lead.crmLeadId">
                <dt class="text-slate-500">{{ $t('leads.detail.crmLeadId') }}</dt>
                <dd class="text-slate-100 font-mono mt-0.5 break-all">{{ lead.crmLeadId }}</dd>
              </div>
              <div v-if="lead.crmSyncedAt">
                <dt class="text-slate-500">{{ $t('leads.detail.crmSyncedAt') }}</dt>
                <dd class="text-slate-100 mt-0.5">{{ new Date(lead.crmSyncedAt).toLocaleString() }}</dd>
              </div>
              <div v-if="lead.crmLastError">
                <dt class="text-slate-500">{{ $t('leads.detail.crmLastError') }}</dt>
                <dd class="mt-0.5 rounded-lg bg-rose-500/10 ring-1 ring-rose-500/30 px-3 py-2 text-rose-200">
                  {{ lead.crmLastError }}
                </dd>
              </div>
            </dl>
            <div class="mt-4 flex items-center justify-end gap-2">
              <a
                v-if="lead.crmLeadUrl"
                :href="lead.crmLeadUrl"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1.5 rounded-xl bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-200 ring-1 ring-violet-500/30 hover:bg-violet-500/30 transition"
              >
                {{ $t('leads.detail.openInCrm') }}
              </a>
              <button
                v-if="lead.crmSyncStatus !== 'NOT_CONFIGURED'"
                type="button"
                :disabled="syncing"
                class="inline-flex items-center gap-1.5 rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-600 disabled:opacity-50 transition"
                @click="retrySync"
              >
                {{ syncing ? $t('common.loading') : $t('leads.detail.retrySync') }}
              </button>
            </div>
          </section>

          <section class="rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-5">
            <header class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <h3 class="text-sm font-semibold text-slate-100">{{ $t('leads.detail.payloadTitle') }}</h3>
                <p class="text-xs text-slate-400 mt-0.5">{{ $t('leads.detail.payloadSubtitle') }}</p>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-slate-100 transition"
                @click="payloadOpen = !payloadOpen"
              >
                {{ payloadOpen ? $t('leads.detail.payloadHide') : $t('leads.detail.payloadShow') }}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 transition-transform" :class="{ 'rotate-180': payloadOpen }">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </header>
            <p v-if="!lead.crmPayload" class="mt-3 text-xs text-slate-500">{{ $t('leads.detail.payloadEmpty') }}</p>
            <template v-else-if="payloadOpen">
              <div class="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span v-if="lead.crmPayloadAt">{{ $t('leads.detail.payloadUpdatedAt') }} {{ new Date(lead.crmPayloadAt).toLocaleString() }}</span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-2 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-600 transition"
                  @click="copyPayload"
                >
                  {{ payloadCopied ? $t('common.copied') : $t('common.copy') }}
                </button>
              </div>
              <pre class="mt-2 rounded-xl bg-slate-950 text-slate-100 ring-1 ring-slate-800 p-3 text-[11px] leading-relaxed overflow-x-auto font-mono whitespace-pre">{{ payloadJson }}</pre>
            </template>
            <p v-else class="mt-3 text-[11px] text-slate-500">{{ $t('leads.detail.payloadCollapsed') }}</p>
          </section>

          <section class="rounded-2xl bg-slate-800/60 ring-1 ring-slate-700 p-5">
            <h3 class="text-sm font-semibold text-slate-100">{{ $t('leads.detail.factsTitle') }}</h3>
            <dl class="mt-3 space-y-3 text-xs">
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500">{{ $t('leads.detail.createdAt') }}</dt>
                <dd class="text-slate-100 text-right">{{ new Date(lead.createdAt).toLocaleString() }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500">{{ $t('leads.detail.updatedAt') }}</dt>
                <dd class="text-slate-100 text-right">{{ new Date(lead.updatedAt).toLocaleString() }}</dd>
              </div>
              <div v-if="lead.lastSignalAt" class="flex justify-between gap-3">
                <dt class="text-slate-500">{{ $t('leads.detail.lastSignalAt') }}</dt>
                <dd class="text-slate-100 text-right">{{ new Date(lead.lastSignalAt).toLocaleString() }}</dd>
              </div>
              <div v-if="lead.lastSignalType" class="flex justify-between gap-3">
                <dt class="text-slate-500">{{ $t('leads.detail.lastSignalType') }}</dt>
                <dd class="text-slate-100 text-right">{{ $t(`leads.eventType.${lead.lastSignalType}`) }}</dd>
              </div>
              <div v-if="lead.statusChangedAt" class="flex justify-between gap-3">
                <dt class="text-slate-500">{{ $t('leads.detail.statusChangedAt') }}</dt>
                <dd class="text-slate-100 text-right">{{ new Date(lead.statusChangedAt).toLocaleString() }}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
