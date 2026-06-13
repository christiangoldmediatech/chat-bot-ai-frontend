<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Integration } from '~/types/integration'

const props = defineProps<{
  botId: string
  tenantId?: string
}>()

const calendar = useCalendarIntegration(props.tenantId)

const integration = ref<Integration | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref<string | null>(null)

// Editable escalation settings. Lives on the same row as Calendar config but
// only takes effect for the case-escalation tools.
const form = reactive({
  advisorEmail: '',
  advisorName: '',
  advisorWhatsapp: '',
  followupHours: 24,
})
const saving = ref(false)
const escalationSavedAt = ref<number | null>(null)
const escalationOpen = ref(false)
const confirmingDisconnect = ref(false)

const escalationConfigured = computed(() => Boolean(integration.value?.advisorEmail))

function hydrateForm(value: Integration | null): void {
  form.advisorEmail = value?.advisorEmail ?? ''
  form.advisorName = value?.advisorName ?? ''
  form.advisorWhatsapp = value?.advisorWhatsapp ?? ''
  form.followupHours = value?.followupHours ?? 24
}

async function onSaveEscalation(): Promise<void> {
  saving.value = true
  error.value = null
  try {
    const updated = await calendar.update(props.botId, {
      advisorEmail: form.advisorEmail.trim() === '' ? null : form.advisorEmail.trim(),
      advisorName: form.advisorName.trim() === '' ? null : form.advisorName.trim(),
      advisorWhatsapp:
        form.advisorWhatsapp.trim() === '' ? null : form.advisorWhatsapp.trim(),
      followupHours: form.followupHours,
    })
    integration.value = updated
    hydrateForm(updated)
    escalationSavedAt.value = Date.now()
    setTimeout(() => {
      if (escalationSavedAt.value && Date.now() - escalationSavedAt.value >= 2500) {
        escalationSavedAt.value = null
      }
    }, 2600)
    escalationOpen.value = false
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const result = await calendar.get(props.botId)
    integration.value = result && result.isActive ? result : null
    hydrateForm(integration.value)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onConnect(): Promise<void> {
  busy.value = true
  error.value = null
  try {
    const { url } = await calendar.connectUrl(props.botId)
    // Open in a new tab — when the OAuth flow finishes the backend renders a
    // success page. The user comes back here and clicks "Reload".
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    busy.value = false
  }
}

async function onConfirmDisconnect(): Promise<void> {
  confirmingDisconnect.value = false
  busy.value = true
  error.value = null
  try {
    await calendar.disconnect(props.botId)
    integration.value = null
    // Re-fetch so the UI reflects the actual server state, not just the
    // optimistic clear. After this returns null the empty state renders and
    // the user can reconnect (same or different account) immediately.
    await load()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-slate-900">{{ $t('admin.calendar.cardTitle') }}</h2>
        <p class="text-xs text-slate-500 mt-1">{{ $t('admin.calendar.cardDescription') }}</p>
      </div>
      <button
        v-if="!loading"
        type="button"
        class="shrink-0 text-xs text-slate-500 hover:text-slate-700"
        :disabled="busy"
        @click="load"
      >
        {{ $t('common.reload') }}
      </button>
    </div>

    <p
      v-if="error"
      class="mt-3 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700"
    >
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-3" />

    <template v-else-if="integration">
      <!-- Connected state: 5 fields as a 2-column grid + status row -->
      <dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div class="min-w-0">
          <dt class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{{ $t('admin.calendar.fieldAccount') }}</dt>
          <dd class="mt-0.5 text-slate-900 truncate">{{ integration.accountEmail }}</dd>
        </div>
        <div class="min-w-0">
          <dt class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{{ $t('admin.calendar.fieldCalendar') }}</dt>
          <dd class="mt-0.5 text-slate-900 font-mono text-xs truncate">{{ integration.calendarId }}</dd>
        </div>
        <div class="min-w-0">
          <dt class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{{ $t('admin.calendar.fieldTimezone') }}</dt>
          <dd class="mt-0.5 text-slate-900 truncate">{{ integration.timezone }}</dd>
        </div>
        <div class="min-w-0">
          <dt class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{{ $t('admin.calendar.fieldWorkingHours') }}</dt>
          <dd class="mt-0.5 text-slate-900">{{ integration.workingHoursStart }} – {{ integration.workingHoursEnd }}</dd>
        </div>
        <div class="min-w-0">
          <dt class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{{ $t('admin.calendar.fieldDefaultDuration') }}</dt>
          <dd class="mt-0.5 text-slate-900">{{ integration.defaultDurationMinutes }} {{ $t('admin.calendar.minutesShort') }}</dd>
        </div>
      </dl>

      <!-- Escalation summary + open-modal button -->
      <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-600">
              {{ $t('admin.calendar.escalationTitle') }}
            </h3>
            <span
              v-if="escalationConfigured"
              class="inline-flex items-center gap-1 rounded-full bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700"
            >
              <span class="size-1.5 rounded-full bg-emerald-500" />
              {{ $t('common.active') }}
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 rounded-full bg-slate-100 ring-1 ring-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600"
            >
              {{ $t('admin.calendar.escalationNotConfigured') }}
            </span>
            <span
              v-if="escalationSavedAt"
              class="inline-flex items-center gap-1 rounded-full bg-success-50 ring-1 ring-success-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success-700"
            >
              {{ $t('admin.calendar.saved') }}
            </span>
          </div>
          <p v-if="escalationConfigured" class="mt-1 text-xs text-slate-500 truncate">
            {{ $t('admin.calendar.escalationConfiguredHint', { email: integration.advisorEmail, hours: integration.followupHours ?? 0 }) }}
          </p>
          <p v-else class="mt-1 text-xs text-slate-500 truncate">{{ $t('admin.calendar.escalationSubtitle') }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          @click="escalationOpen = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {{ $t('admin.calendar.escalationOpenButton') }}
        </button>
      </div>

      <button
        type="button"
        class="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-danger-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-danger-700 hover:bg-danger-50 disabled:opacity-60 transition"
        :disabled="busy"
        @click="confirmingDisconnect = true"
      >
        {{ $t('admin.calendar.disconnect') }}
      </button>
    </template>

    <template v-else>
      <!-- Empty state -->
      <div class="mt-4 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/70 p-6 text-center">
        <div class="mx-auto flex size-10 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-sky-600" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <p class="mt-3 text-sm font-medium text-slate-700">{{ $t('admin.calendar.emptyTitle') }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ $t('admin.calendar.emptyBody') }}</p>
        <button
          type="button"
          class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 shadow-glass transition"
          :disabled="busy"
          @click="onConnect"
        >
          <SpinnerInline v-if="busy" />
          {{ busy ? $t('admin.calendar.connecting') : $t('admin.calendar.connect') }}
        </button>
        <p class="mt-2 text-[11px] text-slate-500">{{ $t('admin.calendar.consentHint') }}</p>
      </div>
    </template>

    <!-- Escalation modal -->
    <Modal
      :open="escalationOpen"
      :title="$t('admin.calendar.escalationTitle')"
      :subtitle="$t('admin.calendar.escalationModalSubtitle')"
      size="lg"
      @close="escalationOpen = false"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.calendar.advisorEmail') }}</label>
          <input
            v-model="form.advisorEmail"
            type="email"
            maxlength="254"
            placeholder="sales@company.com"
            class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
          <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.calendar.advisorEmailHelp') }}</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.calendar.advisorName') }}</label>
          <input
            v-model="form.advisorName"
            type="text"
            maxlength="120"
            :placeholder="$t('common.optional')"
            class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.calendar.followupHours') }}</label>
          <input
            v-model.number="form.followupHours"
            type="number"
            min="0"
            max="168"
            class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
          <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.calendar.followupHoursHelp') }}</p>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.calendar.advisorWhatsapp') }}</label>
          <input
            v-model="form.advisorWhatsapp"
            type="tel"
            maxlength="20"
            inputmode="tel"
            autocomplete="off"
            placeholder="+5215512345678"
            class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-mono focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
          <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.calendar.advisorWhatsappHelp') }}</p>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            :disabled="saving"
            @click="escalationOpen = false"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition"
            :disabled="saving"
            @click="onSaveEscalation"
          >
            <SpinnerInline v-if="saving" class="!size-4" />
            {{ saving ? $t('common.saving') : $t('admin.calendar.saveEscalation') }}
          </button>
        </div>
      </template>
    </Modal>

    <ConfirmDialog
      :open="confirmingDisconnect"
      :title="$t('admin.calendar.disconnectConfirmTitle')"
      :message="$t('admin.calendar.disconnectConfirmMessage')"
      :confirm-label="$t('admin.calendar.disconnectConfirmAction')"
      tone="danger"
      @cancel="confirmingDisconnect = false"
      @confirm="onConfirmDisconnect"
    />
  </section>
</template>
