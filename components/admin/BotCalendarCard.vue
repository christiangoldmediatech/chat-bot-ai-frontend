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
  followupHours: 24,
})
const saving = ref(false)
const escalationSavedAt = ref<number | null>(null)

function hydrateForm(value: Integration | null): void {
  form.advisorEmail = value?.advisorEmail ?? ''
  form.advisorName = value?.advisorName ?? ''
  form.followupHours = value?.followupHours ?? 24
}

async function onSaveEscalation(): Promise<void> {
  saving.value = true
  error.value = null
  try {
    const updated = await calendar.update(props.botId, {
      advisorEmail: form.advisorEmail.trim() === '' ? null : form.advisorEmail.trim(),
      advisorName: form.advisorName.trim() === '' ? null : form.advisorName.trim(),
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

async function onDisconnect(): Promise<void> {
  if (!window.confirm('Disconnect this Google account from the bot? You\'ll be able to reconnect afterwards.')) {
    return
  }
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
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-sm font-semibold text-slate-900">Google Calendar</h2>
        <p class="text-xs text-slate-500 mt-1">
          Connect an account so the bot can schedule meetings.
        </p>
      </div>
      <button
        v-if="!loading"
        type="button"
        class="text-xs text-slate-500 hover:text-slate-700"
        :disabled="busy"
        @click="load"
      >
        Reload
      </button>
    </div>

    <p v-if="error" class="mt-3 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-3" />

    <template v-else-if="integration">
      <dl class="mt-3 space-y-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-slate-500">Account</dt>
          <dd class="text-slate-900">{{ integration.accountEmail }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Calendar</dt>
          <dd class="text-slate-900 font-mono text-xs">{{ integration.calendarId }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Time zone</dt>
          <dd class="text-slate-900">{{ integration.timezone }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Working hours</dt>
          <dd class="text-slate-900">{{ integration.workingHoursStart }} – {{ integration.workingHoursEnd }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Default duration</dt>
          <dd class="text-slate-900">{{ integration.defaultDurationMinutes }} min</dd>
        </div>
      </dl>
      <!-- Escalation settings: advisorEmail + follow-up. Lives here because
           it shares the OAuth account with Calendar (sends email via gmail.send). -->
      <div class="mt-5 pt-5 border-t border-slate-100">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-600">
              {{ $t('admin.calendar.escalationTitle') }}
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ $t('admin.calendar.escalationSubtitle') }}
            </p>
          </div>
          <span
            v-if="escalationSavedAt"
            class="text-xs text-success-700 bg-success-50 border border-success-200 rounded-full px-2 py-0.5"
          >
            {{ $t('admin.calendar.saved') }}
          </span>
        </div>

        <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-slate-700">{{ $t('admin.calendar.advisorEmail') }}</label>
            <input
              v-model="form.advisorEmail"
              type="email"
              maxlength="254"
              placeholder="sales@company.com"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            >
            <p class="mt-1 text-[11px] text-slate-500">
              {{ $t('admin.calendar.advisorEmailHelp') }}
            </p>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700">{{ $t('admin.calendar.advisorName') }}</label>
            <input
              v-model="form.advisorName"
              type="text"
              maxlength="120"
              :placeholder="$t('common.optional')"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            >
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700">{{ $t('admin.calendar.followupHours') }}</label>
            <input
              v-model.number="form.followupHours"
              type="number"
              min="0"
              max="168"
              class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
            <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.calendar.followupHoursHelp') }}</p>
          </div>
        </div>

        <button
          type="button"
          class="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          :disabled="saving"
          @click="onSaveEscalation"
        >
          {{ saving ? $t('common.saving') : $t('admin.calendar.saveEscalation') }}
        </button>
      </div>

      <button
        type="button"
        class="mt-4 rounded-md border border-danger-200 px-3 py-1.5 text-sm text-danger-700 hover:bg-danger-50 disabled:opacity-60"
        :disabled="busy"
        @click="onDisconnect"
      >
        Disconnect
      </button>
    </template>

    <template v-else>
      <p class="mt-3 text-sm text-slate-500">No account connected.</p>
      <button
        type="button"
        class="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        :disabled="busy"
        @click="onConnect"
      >
        {{ busy ? 'Opening…' : 'Connect Google Calendar' }}
      </button>
      <p class="mt-2 text-xs text-slate-500">
        Google's consent screen will open in a new tab. When you come back, click Reload.
      </p>
    </template>
  </section>
</template>
