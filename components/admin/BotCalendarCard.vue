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

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    integration.value = await calendar.get(props.botId)
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
  busy.value = true
  error.value = null
  try {
    await calendar.disconnect(props.botId)
    integration.value = null
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
