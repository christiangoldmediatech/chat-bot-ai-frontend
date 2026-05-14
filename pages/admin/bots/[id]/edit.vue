<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const bots = useBots()
const id = route.params.id as string

const form = reactive({
  name: '',
  systemPrompt: '',
  whatsappPhoneId: '',
  whatsappBusinessAccountId: '',
  whatsappToken: '',
  whatsappAppSecret: '',
  webhookVerifyToken: '',
  isActive: true,
})

const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

function hydrate(bot: Bot): void {
  form.name = bot.name
  form.systemPrompt = bot.systemPrompt
  form.whatsappPhoneId = bot.whatsappPhoneId
  form.whatsappBusinessAccountId = bot.whatsappBusinessAccountId ?? ''
  form.webhookVerifyToken = bot.webhookVerifyToken
  form.isActive = bot.isActive
  // Secrets remain blank — backend leaves them untouched on undefined.
  form.whatsappToken = ''
  form.whatsappAppSecret = ''
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const bot = await bots.get(id)
    hydrate(bot)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onSubmit(): Promise<void> {
  saving.value = true
  error.value = null
  success.value = null
  try {
    const updated = await bots.update(id, {
      name: form.name,
      systemPrompt: form.systemPrompt,
      whatsappPhoneId: form.whatsappPhoneId,
      whatsappBusinessAccountId: form.whatsappBusinessAccountId || undefined,
      // Only send secrets if the user typed something — leaving them blank
      // keeps the value already on the server.
      whatsappToken: form.whatsappToken || undefined,
      whatsappAppSecret: form.whatsappAppSecret || undefined,
      webhookVerifyToken: form.webhookVerifyToken,
      isActive: form.isActive,
    })
    success.value = 'Cambios guardados'
    hydrate(updated)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

async function onCancel(): Promise<void> {
  await router.replace(`/admin/bots/${id}`)
}

await load()
</script>

<template>
  <div>
    <NuxtLink :to="`/admin/bots/${id}`" class="text-sm text-slate-500 hover:text-slate-700">← Volver al bot</NuxtLink>
    <h1 class="mt-2 text-2xl font-semibold">Editar bot</h1>

    <p v-if="error" class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </p>
    <p v-if="success" class="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
      {{ success }}
    </p>

    <div v-if="loading" class="mt-6 text-sm text-slate-500">Cargando…</div>

    <form v-else class="mt-6 max-w-2xl space-y-5" @submit.prevent="onSubmit">
      <div>
        <label class="block text-sm font-medium text-slate-700">Nombre</label>
        <input
          v-model="form.name"
          type="text"
          required
          minlength="2"
          maxlength="80"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">System prompt</label>
        <textarea
          v-model="form.systemPrompt"
          required
          rows="5"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700">WhatsApp Phone ID</label>
          <input
            v-model="form.whatsappPhoneId"
            type="text"
            required
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700">WABA ID</label>
          <input
            v-model="form.whatsappBusinessAccountId"
            type="text"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
          >
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">
          Nuevo access token <span class="text-slate-400 font-normal">(dejar vacío para no cambiarlo)</span>
        </label>
        <input
          v-model="form.whatsappToken"
          type="password"
          pattern="EAA[A-Za-z0-9_-]+"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">
          Nuevo app secret <span class="text-slate-400 font-normal">(dejar vacío para no cambiarlo)</span>
        </label>
        <input
          v-model="form.whatsappAppSecret"
          type="password"
          pattern="[a-fA-F0-9]+"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">Webhook verify token</label>
        <input
          v-model="form.webhookVerifyToken"
          type="text"
          required
          minlength="16"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
        >
      </div>

      <div class="flex items-center gap-2">
        <input id="isActive" v-model="form.isActive" type="checkbox" class="size-4 rounded border-slate-300">
        <label for="isActive" class="text-sm text-slate-700">Bot activo</label>
      </div>

      <div class="pt-2 flex gap-2">
        <button
          type="submit"
          class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </button>
        <button
          type="button"
          class="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          @click="onCancel"
        >
          Cancelar
        </button>
      </div>
    </form>
  </div>
</template>
