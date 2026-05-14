<script setup lang="ts">
import type { ApiError } from '~/types/api'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const bots = useBots()
const router = useRouter()

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

const saving = ref(false)
const error = ref<string | null>(null)

function generateVerifyToken(): void {
  // 32 random hex chars — comfortably above the backend's 16-char minimum.
  if (typeof crypto?.randomUUID === 'function') {
    form.webhookVerifyToken = crypto.randomUUID().replace(/-/g, '')
  } else {
    form.webhookVerifyToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  }
}

async function onSubmit(): Promise<void> {
  saving.value = true
  error.value = null
  try {
    const created = await bots.create({
      name: form.name,
      systemPrompt: form.systemPrompt,
      whatsappPhoneId: form.whatsappPhoneId,
      whatsappBusinessAccountId: form.whatsappBusinessAccountId || undefined,
      whatsappToken: form.whatsappToken,
      whatsappAppSecret: form.whatsappAppSecret || undefined,
      webhookVerifyToken: form.webhookVerifyToken,
      isActive: form.isActive,
    })
    await router.replace(`/admin/bots/${created.id}`)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <NuxtLink to="/admin/bots" class="text-sm text-slate-500 hover:text-slate-700">← Volver a bots</NuxtLink>
    <h1 class="mt-2 text-2xl font-semibold">Crear bot</h1>
    <p class="text-slate-500 text-sm mt-1">
      Conecta un número de WhatsApp Cloud API. La configuración fina (tono, personalidad, fallback) se completa después en el panel del bot.
    </p>

    <form class="mt-6 max-w-2xl space-y-5" @submit.prevent="onSubmit">
      <div>
        <label for="name" class="block text-sm font-medium text-slate-700">Nombre</label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          required
          minlength="2"
          maxlength="80"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
      </div>

      <div>
        <label for="systemPrompt" class="block text-sm font-medium text-slate-700">System prompt</label>
        <textarea
          id="systemPrompt"
          v-model="form.systemPrompt"
          required
          rows="5"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
        />
        <p class="mt-1 text-xs text-slate-500">Instrucciones base que recibirá el modelo en cada conversación.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="phoneId" class="block text-sm font-medium text-slate-700">WhatsApp Phone ID</label>
          <input
            id="phoneId"
            v-model="form.whatsappPhoneId"
            type="text"
            required
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
          >
        </div>
        <div>
          <label for="wabaId" class="block text-sm font-medium text-slate-700">
            WABA ID <span class="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            id="wabaId"
            v-model="form.whatsappBusinessAccountId"
            type="text"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
          >
        </div>
      </div>

      <div>
        <label for="token" class="block text-sm font-medium text-slate-700">Access token (EAA…)</label>
        <input
          id="token"
          v-model="form.whatsappToken"
          type="password"
          required
          pattern="EAA[A-Za-z0-9_-]+"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
        >
        <p class="mt-1 text-xs text-slate-500">Se guarda cifrado con AES-256-GCM.</p>
      </div>

      <div>
        <label for="appSecret" class="block text-sm font-medium text-slate-700">
          App secret <span class="text-slate-400 font-normal">(opcional)</span>
        </label>
        <input
          id="appSecret"
          v-model="form.whatsappAppSecret"
          type="password"
          pattern="[a-fA-F0-9]+"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
        >
        <p class="mt-1 text-xs text-slate-500">Habilita validación HMAC del webhook de Meta.</p>
      </div>

      <div>
        <label for="verify" class="block text-sm font-medium text-slate-700">Webhook verify token</label>
        <div class="mt-1 flex gap-2">
          <input
            id="verify"
            v-model="form.webhookVerifyToken"
            type="text"
            required
            minlength="16"
            class="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
          >
          <button
            type="button"
            class="rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
            @click="generateVerifyToken"
          >
            Generar
          </button>
        </div>
        <p class="mt-1 text-xs text-slate-500">Lo configurarás idéntico en Meta App → WhatsApp → Webhook.</p>
      </div>

      <div class="flex items-center gap-2">
        <input id="isActive" v-model="form.isActive" type="checkbox" class="size-4 rounded border-slate-300">
        <label for="isActive" class="text-sm text-slate-700">Bot activo</label>
      </div>

      <p v-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ error }}
      </p>

      <div class="pt-2">
        <button
          type="submit"
          class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? 'Creando…' : 'Crear bot' }}
        </button>
      </div>
    </form>
  </div>
</template>
