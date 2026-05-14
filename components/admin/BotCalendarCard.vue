<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Integration } from '~/types/integration'

const props = defineProps<{
  botId: string
}>()

const calendar = useCalendarIntegration()

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
    // success page. The user comes back here and clicks "Recargar".
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

await load()
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-sm font-semibold text-slate-900">Google Calendar</h2>
        <p class="text-xs text-slate-500 mt-1">
          Conecta una cuenta para que el bot pueda agendar reuniones.
        </p>
      </div>
      <button
        v-if="!loading"
        type="button"
        class="text-xs text-slate-500 hover:text-slate-700"
        :disabled="busy"
        @click="load"
      >
        Recargar
      </button>
    </div>

    <p v-if="error" class="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {{ error }}
    </p>

    <div v-if="loading" class="mt-3 text-sm text-slate-500">Cargando…</div>

    <template v-else-if="integration">
      <dl class="mt-3 space-y-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-slate-500">Cuenta</dt>
          <dd class="text-slate-900">{{ integration.accountEmail }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Calendario</dt>
          <dd class="text-slate-900 font-mono text-xs">{{ integration.calendarId }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Zona horaria</dt>
          <dd class="text-slate-900">{{ integration.timezone }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Horario</dt>
          <dd class="text-slate-900">{{ integration.workingHoursStart }} – {{ integration.workingHoursEnd }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500">Duración default</dt>
          <dd class="text-slate-900">{{ integration.defaultDurationMinutes }} min</dd>
        </div>
      </dl>
      <button
        type="button"
        class="mt-4 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
        :disabled="busy"
        @click="onDisconnect"
      >
        Desconectar
      </button>
    </template>

    <template v-else>
      <p class="mt-3 text-sm text-slate-500">No hay cuenta conectada.</p>
      <button
        type="button"
        class="mt-3 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        :disabled="busy"
        @click="onConnect"
      >
        {{ busy ? 'Abriendo…' : 'Conectar Google Calendar' }}
      </button>
      <p class="mt-2 text-xs text-slate-500">
        Se abrirá el consentimiento de Google en una pestaña nueva. Al volver, hacé click en Recargar.
      </p>
    </template>
  </section>
</template>
