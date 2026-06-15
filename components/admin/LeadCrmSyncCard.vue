<script setup lang="ts">
import type { Lead, LeadCrmSyncStatus } from '~/types/lead'

interface Props {
  lead: Lead
  busy?: boolean
}

defineProps<Props>()
const emit = defineEmits<{ retry: [] }>()

const palette: Record<LeadCrmSyncStatus, { ring: string; bg: string; dot: string; text: string }> = {
  NOT_CONFIGURED: {
    ring: 'ring-slate-200',
    bg: 'bg-slate-50',
    dot: 'bg-slate-400',
    text: 'text-slate-700',
  },
  PENDING: {
    ring: 'ring-sky-200',
    bg: 'bg-sky-50',
    dot: 'bg-sky-500 animate-pulse',
    text: 'text-sky-800',
  },
  SYNCED: {
    ring: 'ring-emerald-200',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
    text: 'text-emerald-800',
  },
  FAILED: {
    ring: 'ring-rose-200',
    bg: 'bg-rose-50',
    dot: 'bg-rose-500',
    text: 'text-rose-800',
  },
}
</script>

<template>
  <section
    class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-5"
  >
    <header class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">{{ $t('leads.detail.crmTitle') }}</h3>
        <p class="text-xs text-slate-500 mt-0.5">{{ $t('leads.detail.crmSubtitle') }}</p>
      </div>
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-inset"
        :class="[palette[lead.crmSyncStatus].bg, palette[lead.crmSyncStatus].ring, palette[lead.crmSyncStatus].text]"
      >
        <span class="size-1.5 rounded-full" :class="palette[lead.crmSyncStatus].dot" />
        <span class="text-[10px] uppercase tracking-wider font-semibold">
          {{ $t(`leads.crmStatus.${lead.crmSyncStatus}`) }}
        </span>
      </span>
    </header>

    <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <div v-if="lead.crmProvider">
        <dt class="text-slate-500">{{ $t('leads.detail.crmProvider') }}</dt>
        <dd class="text-slate-900 font-medium mt-0.5">{{ lead.crmProvider }}</dd>
      </div>
      <div v-if="lead.crmLeadId">
        <dt class="text-slate-500">{{ $t('leads.detail.crmLeadId') }}</dt>
        <dd class="text-slate-900 font-mono mt-0.5 break-all">{{ lead.crmLeadId }}</dd>
      </div>
      <div v-if="lead.crmSyncedAt">
        <dt class="text-slate-500">{{ $t('leads.detail.crmSyncedAt') }}</dt>
        <dd class="text-slate-900 mt-0.5">{{ new Date(lead.crmSyncedAt).toLocaleString() }}</dd>
      </div>
      <div v-if="lead.crmLastError" class="sm:col-span-2">
        <dt class="text-slate-500">{{ $t('leads.detail.crmLastError') }}</dt>
        <dd class="mt-0.5 rounded-lg bg-rose-50 ring-1 ring-rose-100 px-3 py-2 text-rose-800 leading-relaxed">
          {{ lead.crmLastError }}
        </dd>
      </div>
    </dl>

    <div v-if="lead.crmSyncStatus === 'NOT_CONFIGURED'" class="mt-4 text-xs text-slate-500">
      {{ $t('leads.detail.crmNotConfiguredHelp') }}
    </div>

    <div class="mt-4 flex items-center justify-end gap-2">
      <a
        v-if="lead.crmLeadUrl"
        :href="lead.crmLeadUrl"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100 transition"
      >
        {{ $t('leads.detail.openInCrm') }}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3">
          <path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd" />
          <path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd" />
        </svg>
      </a>
      <button
        v-if="lead.crmSyncStatus !== 'NOT_CONFIGURED'"
        type="button"
        :disabled="busy"
        class="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition"
        @click="emit('retry')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="{ 'animate-spin': busy }">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
          <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
        </svg>
        {{ busy ? $t('common.loading') : $t('leads.detail.retrySync') }}
      </button>
    </div>
  </section>
</template>
