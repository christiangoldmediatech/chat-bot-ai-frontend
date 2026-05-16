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
const botId = route.params.botId as string
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
  form.whatsappToken = ''
  form.whatsappAppSecret = ''
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const bot = await bots.get(botId)
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
    const updated = await bots.update(botId, {
      name: form.name,
      systemPrompt: form.systemPrompt,
      whatsappPhoneId: form.whatsappPhoneId,
      whatsappBusinessAccountId: form.whatsappBusinessAccountId || undefined,
      whatsappToken: form.whatsappToken || undefined,
      whatsappAppSecret: form.whatsappAppSecret || undefined,
      webhookVerifyToken: form.webhookVerifyToken,
      isActive: form.isActive,
    })
    success.value = 'Changes saved'
    hydrate(updated)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

async function onCancel(): Promise<void> {
  await router.replace(`/superadmin/companies/${tenantId}/bots/${botId}`)
}

await load()
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${tenantId}/bots/${botId}`" class="text-sm text-slate-400 hover:text-slate-200">← Back to bot</NuxtLink>
    <h1 class="mt-2 text-2xl font-semibold text-slate-100">Edit bot</h1>

    <p v-if="error" class="mt-4 rounded-md border border-danger-800 bg-danger-950 p-3 text-sm text-danger-300">
      {{ error }}
    </p>
    <p v-if="success" class="mt-4 rounded-md border border-success-800 bg-success-950 p-3 text-sm text-success-300">
      {{ success }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <form v-else class="mt-6 max-w-2xl space-y-5" @submit.prevent="onSubmit">
      <div>
        <label class="block text-sm font-medium text-slate-300">Name</label>
        <input
          v-model="form.name"
          type="text"
          required
          minlength="2"
          maxlength="80"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-300">System prompt</label>
        <textarea
          v-model="form.systemPrompt"
          required
          rows="5"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-300">WhatsApp Phone ID</label>
          <input
            v-model="form.whatsappPhoneId"
            type="text"
            required
            class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-300">WABA ID</label>
          <input
            v-model="form.whatsappBusinessAccountId"
            type="text"
            class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
          >
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-300">
          New access token <span class="text-slate-500 font-normal">(leave blank to keep current)</span>
        </label>
        <input
          v-model="form.whatsappToken"
          type="password"
          pattern="EAA[A-Za-z0-9_-]+"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-300">
          New app secret <span class="text-slate-500 font-normal">(leave blank to keep current)</span>
        </label>
        <input
          v-model="form.whatsappAppSecret"
          type="password"
          pattern="[a-fA-F0-9]+"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
        >
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-300">Webhook verify token</label>
        <input
          v-model="form.webhookVerifyToken"
          type="text"
          required
          minlength="16"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 font-mono"
        >
      </div>

      <div class="flex items-center gap-2">
        <input id="isActive" v-model="form.isActive" type="checkbox" class="size-4 rounded border-slate-700 bg-slate-900">
        <label for="isActive" class="text-sm text-slate-300">Bot active</label>
      </div>

      <div class="pt-2 flex gap-2">
        <button
          type="submit"
          class="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? 'Saving…' : 'Save changes' }}
        </button>
        <button
          type="button"
          class="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          @click="onCancel"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>
