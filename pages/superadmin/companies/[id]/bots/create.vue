<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const router = useRouter()
const tenantId = route.params.id as string
const bots = useBots(tenantId)

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
const createdBot = ref<Bot | null>(null)

function generateVerifyToken(): void {
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
    createdBot.value = await bots.create({
      name: form.name,
      systemPrompt: form.systemPrompt,
      whatsappPhoneId: form.whatsappPhoneId,
      whatsappBusinessAccountId: form.whatsappBusinessAccountId || undefined,
      whatsappToken: form.whatsappToken,
      whatsappAppSecret: form.whatsappAppSecret || undefined,
      webhookVerifyToken: form.webhookVerifyToken,
      isActive: form.isActive,
    })
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

async function onContinue(): Promise<void> {
  if (!createdBot.value) return
  await router.replace(`/superadmin/companies/${tenantId}/bots/${createdBot.value.id}`)
}
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${tenantId}`" class="text-sm text-slate-400 hover:text-slate-200">← Back to company</NuxtLink>
    <h1 class="mt-2 text-2xl font-semibold text-slate-100">Create bot</h1>
    <p class="text-slate-400 text-sm mt-1">
      You are creating a bot on behalf of this tenant. Fine-tuning is available later in the Configuration tab.
    </p>

    <form v-if="!createdBot" class="mt-6 max-w-2xl space-y-5" @submit.prevent="onSubmit">
      <div>
        <label for="name" class="block text-sm font-medium text-slate-300">Name</label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          required
          minlength="2"
          maxlength="80"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
      </div>

      <div>
        <label for="systemPrompt" class="block text-sm font-medium text-slate-300">System prompt</label>
        <textarea
          id="systemPrompt"
          v-model="form.systemPrompt"
          required
          rows="5"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
        />
        <p class="mt-1 text-xs text-slate-500">Base instructions the model will receive on every conversation.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="phoneId" class="block text-sm font-medium text-slate-300">WhatsApp Phone ID</label>
          <input
            id="phoneId"
            v-model="form.whatsappPhoneId"
            type="text"
            required
            class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
          >
        </div>
        <div>
          <label for="wabaId" class="block text-sm font-medium text-slate-300">
            WABA ID <span class="text-slate-500 font-normal">(optional)</span>
          </label>
          <input
            id="wabaId"
            v-model="form.whatsappBusinessAccountId"
            type="text"
            class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
          >
        </div>
      </div>

      <div>
        <label for="token" class="block text-sm font-medium text-slate-300">Access token (EAA…)</label>
        <input
          id="token"
          v-model="form.whatsappToken"
          type="password"
          required
          pattern="EAA[A-Za-z0-9_-]+"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
        >
        <p class="mt-1 text-xs text-slate-500">Stored encrypted with AES-256-GCM.</p>
      </div>

      <div>
        <label for="appSecret" class="block text-sm font-medium text-slate-300">
          App secret <span class="text-slate-500 font-normal">(optional)</span>
        </label>
        <input
          id="appSecret"
          v-model="form.whatsappAppSecret"
          type="password"
          pattern="[a-fA-F0-9]+"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
        >
        <p class="mt-1 text-xs text-slate-500">Enables HMAC validation for Meta's webhook.</p>
      </div>

      <div>
        <label for="verify" class="block text-sm font-medium text-slate-300">Webhook verify token</label>
        <div class="mt-1 flex gap-2">
          <input
            id="verify"
            v-model="form.webhookVerifyToken"
            type="text"
            required
            minlength="16"
            class="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
          >
          <button
            type="button"
            class="rounded-md border border-slate-700 px-3 text-sm text-slate-200 hover:bg-slate-800"
            @click="generateVerifyToken"
          >
            Generate
          </button>
        </div>
        <p class="mt-1 text-xs text-slate-500">Tenant will set the same value in Meta App → WhatsApp → Webhook.</p>
      </div>

      <div class="flex items-center gap-2">
        <input id="isActive" v-model="form.isActive" type="checkbox" class="size-4 rounded border-slate-700 bg-slate-900">
        <label for="isActive" class="text-sm text-slate-300">Bot active</label>
      </div>

      <p v-if="error" class="rounded-md border border-danger-800 bg-danger-950 p-3 text-sm text-danger-300">
        {{ error }}
      </p>

      <div class="pt-2">
        <button
          type="submit"
          class="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? 'Creating…' : 'Create bot' }}
        </button>
      </div>
    </form>

    <template v-else>
      <div class="mt-6 max-w-2xl rounded-2xl border border-success-800 bg-success-950 p-4 text-sm text-success-300">
        Bot <strong class="font-semibold text-white">{{ createdBot.name }}</strong> was created. Upload knowledge documents below to improve its answers — or skip and add them later.
      </div>

      <div class="mt-6 max-w-2xl">
        <BotDocumentsCard :bot-id="createdBot.id" :tenant-id="tenantId" />
      </div>

      <div class="mt-6 max-w-2xl flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          @click="onContinue"
        >
          Continue to bot →
        </button>
      </div>
    </template>
  </div>
</template>
