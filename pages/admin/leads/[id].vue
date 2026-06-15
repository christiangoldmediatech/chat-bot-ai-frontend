<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { LeadDetail, LeadStatus } from '~/types/lead'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const route = useRoute()
const leadId = computed(() => String(route.params.id))
const leadsApi = useLeads()
const { t } = useI18n()

const lead = ref<LeadDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)
const syncing = ref(false)
const notification = ref<string | null>(null)
const payloadOpen = ref(false)
const payloadCopied = ref(false)

const payloadJson = computed(() =>
  lead.value?.crmPayload ? JSON.stringify(lead.value.crmPayload, null, 2) : '',
)

async function copyPayload(): Promise<void> {
  if (!payloadJson.value || !import.meta.client) return
  try {
    await navigator.clipboard.writeText(payloadJson.value)
    payloadCopied.value = true
    setTimeout(() => { payloadCopied.value = false }, 1500)
  } catch {
    // Clipboard API can fail in non-secure contexts; silent — the JSON is
    // visible in the pre block so the user can select+copy manually.
  }
}

// Local form state — mirrored from `lead` after load and on each save.
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

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    lead.value = await leadsApi.get(leadId.value)
    syncFormFromLead()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

function syncFormFromLead(): void {
  if (!lead.value) return
  form.value = {
    status: lead.value.status,
    note: '',
    customerName: lead.value.customerName ?? '',
    customerEmail: lead.value.customerEmail ?? '',
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
    if (form.value.note.trim()) {
      payload.note = form.value.note.trim()
    }
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
    // Backend works async; poll once after a moment to catch the transition.
    setTimeout(() => { void load() }, 1500)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    syncing.value = false
  }
}

function statusPill(status: LeadStatus): string {
  switch (status) {
    case 'NEW': return 'bg-primary-50 text-primary-700 ring-primary-200'
    case 'CONTACTED': return 'bg-sky-50 text-sky-700 ring-sky-200'
    case 'QUALIFIED': return 'bg-violet-50 text-violet-700 ring-violet-200'
    case 'PROPOSAL_SENT': return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'NEGOTIATION': return 'bg-orange-50 text-orange-700 ring-orange-200'
    case 'WON': return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'LOST': return 'bg-rose-50 text-rose-700 ring-rose-200'
    default: return 'bg-slate-50 text-slate-700 ring-slate-200'
  }
}

await load()
</script>

<template>
  <div>
    <NuxtLink to="/admin/leads" class="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {{ $t('leads.detail.backToList') }}
    </NuxtLink>

    <p v-if="error" class="mt-4 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{{ error }}</p>
    <p v-if="notification" class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{{ notification }}</p>

    <SpinnerInline v-if="loading && !lead" class="mt-6" />

    <template v-else-if="lead">
      <!-- Header card -->
      <header class="mt-4 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-5 flex items-start gap-4 flex-wrap">
        <div class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-bold text-xl ring-1 ring-indigo-300/60 shadow-sm">
          {{ (lead.customerName || lead.customerPhone).charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-[16rem]">
          <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            {{ lead.customerName || lead.customerPhone }}
          </h1>
          <div class="mt-1 flex items-center gap-2 flex-wrap text-xs">
            <span class="font-mono text-slate-500">{{ lead.customerPhone }}</span>
            <span v-if="lead.customerEmail" class="text-slate-500">·</span>
            <span v-if="lead.customerEmail" class="text-slate-700">{{ lead.customerEmail }}</span>
          </div>
          <p v-if="lead.reason" class="mt-2 text-sm text-slate-700">{{ lead.reason }}</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span
            class="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ring-1 ring-inset"
            :class="statusPill(lead.status)"
          >
            {{ $t(`leads.status.${lead.status}`) }}
          </span>
          <LeadScoreBadge :score="lead.score" :interest="lead.interest" />
          <NuxtLink
            :to="`/admin/conversations?id=${lead.conversationId}`"
            class="text-xs text-primary-700 hover:underline"
          >
            {{ $t('leads.detail.openConversation') }} →
          </NuxtLink>
        </div>
      </header>

      <div class="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- LEFT: form + key facts (2 cols) -->
        <div class="lg:col-span-2 space-y-4">
          <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-5">
            <h3 class="text-sm font-semibold text-slate-900">{{ $t('leads.detail.editTitle') }}</h3>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('leads.detail.editSubtitle') }}</p>

            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="block">
                <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('leads.detail.statusLabel') }}</span>
                <select
                  v-model="form.status"
                  class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                >
                  <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ $t(`leads.status.${s}`) }}</option>
                </select>
              </label>
              <label class="block">
                <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('leads.detail.scoreLabel') }}</span>
                <div class="mt-1 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200">
                  <span class="text-base font-bold tabular-nums text-slate-900">{{ lead.score }}</span>
                  <span class="text-xs text-slate-500">·</span>
                  <span class="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    {{ $t(`leads.interest.${lead.interest}`) }} · {{ lead.conversionProb }}%
                  </span>
                </div>
              </label>
              <label class="block">
                <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('leads.detail.nameLabel') }}</span>
                <input
                  v-model="form.customerName"
                  type="text"
                  :placeholder="$t('leads.detail.namePlaceholder')"
                  maxlength="200"
                  class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                >
              </label>
              <label class="block">
                <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('leads.detail.emailLabel') }}</span>
                <input
                  v-model="form.customerEmail"
                  type="email"
                  :placeholder="$t('leads.detail.emailPlaceholder')"
                  maxlength="320"
                  class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                >
              </label>
            </div>

            <label class="block mt-3">
              <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('leads.detail.noteLabel') }}</span>
              <textarea
                v-model="form.note"
                rows="2"
                maxlength="2000"
                :placeholder="$t('leads.detail.notePlaceholder')"
                class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </label>

            <div class="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                class="rounded-xl bg-white ring-1 ring-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                :disabled="!hasFormChanges || saving"
                @click="syncFormFromLead"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="button"
                class="rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-primary-600 hover:to-indigo-700 disabled:opacity-50"
                :disabled="!hasFormChanges || saving"
                @click="saveChanges"
              >
                {{ saving ? $t('common.saving') : $t('common.save') }}
              </button>
            </div>
          </section>

          <LeadEventsTimeline :events="lead.events" />
        </div>

        <!-- RIGHT: CRM card + payload + facts (1 col) -->
        <div class="space-y-4">
          <LeadCrmSyncCard :lead="lead" :busy="syncing" @retry="retrySync" />

          <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-5">
            <header class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <h3 class="text-sm font-semibold text-slate-900">{{ $t('leads.detail.payloadTitle') }}</h3>
                <p class="text-xs text-slate-500 mt-0.5">{{ $t('leads.detail.payloadSubtitle') }}</p>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
                @click="payloadOpen = !payloadOpen"
              >
                {{ payloadOpen ? $t('leads.detail.payloadHide') : $t('leads.detail.payloadShow') }}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 transition-transform" :class="{ 'rotate-180': payloadOpen }">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </header>
            <p
              v-if="!lead.crmPayload"
              class="mt-3 text-xs text-slate-500"
            >
              {{ $t('leads.detail.payloadEmpty') }}
            </p>
            <template v-else-if="payloadOpen">
              <div class="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span v-if="lead.crmPayloadAt">
                  {{ $t('leads.detail.payloadUpdatedAt') }} {{ new Date(lead.crmPayloadAt).toLocaleString() }}
                </span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition"
                  @click="copyPayload"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {{ payloadCopied ? $t('common.copied') : $t('common.copy') }}
                </button>
              </div>
              <pre class="mt-2 rounded-xl bg-slate-900 text-slate-100 ring-1 ring-slate-800 p-3 text-[11px] leading-relaxed overflow-x-auto font-mono whitespace-pre">{{ payloadJson }}</pre>
            </template>
            <p
              v-else
              class="mt-3 text-[11px] text-slate-500"
            >
              {{ $t('leads.detail.payloadCollapsed') }}
            </p>
          </section>

          <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-5">
            <h3 class="text-sm font-semibold text-slate-900">{{ $t('leads.detail.factsTitle') }}</h3>
            <dl class="mt-3 space-y-3 text-xs">
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500">{{ $t('leads.detail.createdAt') }}</dt>
                <dd class="text-slate-900 text-right">{{ new Date(lead.createdAt).toLocaleString() }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500">{{ $t('leads.detail.updatedAt') }}</dt>
                <dd class="text-slate-900 text-right">{{ new Date(lead.updatedAt).toLocaleString() }}</dd>
              </div>
              <div v-if="lead.lastSignalAt" class="flex justify-between gap-3">
                <dt class="text-slate-500">{{ $t('leads.detail.lastSignalAt') }}</dt>
                <dd class="text-slate-900 text-right">{{ new Date(lead.lastSignalAt).toLocaleString() }}</dd>
              </div>
              <div v-if="lead.lastSignalType" class="flex justify-between gap-3">
                <dt class="text-slate-500">{{ $t('leads.detail.lastSignalType') }}</dt>
                <dd class="text-slate-900 text-right">{{ $t(`leads.eventType.${lead.lastSignalType}`) }}</dd>
              </div>
              <div v-if="lead.statusChangedAt" class="flex justify-between gap-3">
                <dt class="text-slate-500">{{ $t('leads.detail.statusChangedAt') }}</dt>
                <dd class="text-slate-900 text-right">{{ new Date(lead.statusChangedAt).toLocaleString() }}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
