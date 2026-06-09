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
    <h1 class="mt-2 text-2xl font-semibold text-slate-100 tracking-tight">Create bot</h1>
    <p class="text-slate-400 text-sm mt-1 max-w-2xl">
      Creating a bot on behalf of this tenant. Two things are needed: how it should behave, and the Meta/WhatsApp credentials. Fine-tuning is done later in Configuration.
    </p>

    <form v-if="!createdBot" class="mt-6 max-w-2xl space-y-5" @submit.prevent="onSubmit">
      <!-- ────────────────────────────────────────────────────────────────
           SECTION 1 — Bot details
      ───────────────────────────────────────────────────────────────── -->
      <section class="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6 space-y-5">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-indigo-300" aria-hidden="true">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v4" />
              <line x1="8" y1="16" x2="8" y2="16" />
              <line x1="16" y1="16" x2="16" y2="16" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-100">Bot details</h2>
            <p class="text-xs text-slate-500 mt-0.5">Identity and base behavior — only visible inside the admin.</p>
          </div>
        </header>

        <div>
          <label for="name" class="block text-sm font-medium text-slate-300">Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            minlength="2"
            maxlength="80"
            placeholder="e.g. Sales assistant"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
        </div>

        <div>
          <label for="systemPrompt" class="block text-sm font-medium text-slate-300">System prompt</label>
          <textarea
            id="systemPrompt"
            v-model="form.systemPrompt"
            required
            rows="5"
            placeholder="You are a friendly sales assistant for…"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">Base instructions the model will receive on every conversation.</p>
        </div>

        <div class="flex items-center gap-2">
          <input id="isActive" v-model="form.isActive" type="checkbox" class="size-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500">
          <label for="isActive" class="text-sm text-slate-300">Activate bot on creation</label>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           SECTION 2 — WhatsApp Business connection
      ───────────────────────────────────────────────────────────────── -->
      <section class="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6 space-y-5">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5 text-emerald-400" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-100">WhatsApp Business connection</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Copy these from
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" class="font-medium text-indigo-300 hover:underline">Meta App</a>
              → WhatsApp → API Setup.
            </p>
          </div>
        </header>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="phoneId" class="block text-sm font-medium text-slate-300">Phone Number ID</label>
            <input
              id="phoneId"
              v-model="form.whatsappPhoneId"
              type="text"
              required
              placeholder="123456789012345"
              class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
            <p class="mt-1 text-xs text-slate-500">From the WhatsApp dashboard, next to the test number.</p>
          </div>
          <div>
            <label for="wabaId" class="block text-sm font-medium text-slate-300">
              WhatsApp Business Account ID <span class="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              id="wabaId"
              v-model="form.whatsappBusinessAccountId"
              type="text"
              placeholder="987654321098765"
              class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
            <p class="mt-1 text-xs text-slate-500">WABA ID — useful for templates and metrics.</p>
          </div>
        </div>

        <div>
          <label for="token" class="block text-sm font-medium text-slate-300">Permanent access token</label>
          <input
            id="token"
            v-model="form.whatsappToken"
            type="password"
            required
            pattern="EAA[A-Za-z0-9_-]+"
            placeholder="EAA…"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
          <p class="mt-1 text-xs text-slate-500">Stored encrypted with AES-256-GCM. Starts with <span class="font-mono">EAA</span>.</p>
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
            placeholder="hex string"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
          <p class="mt-1 text-xs text-slate-500">Enables HMAC validation for Meta's webhook payloads.</p>
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
              placeholder="At least 16 characters"
              class="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
            <button
              type="button"
              class="rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
              @click="generateVerifyToken"
            >
              Generate
            </button>
          </div>
          <p class="mt-1 text-xs text-slate-500">
            Tenant sets the same value in <span class="font-medium text-slate-400">Meta App → WhatsApp → Configuration → Webhook</span>.
          </p>
        </div>
      </section>

      <p v-if="error" class="rounded-2xl border border-danger-800 bg-danger-950/80 p-3 text-sm text-danger-300">
        {{ error }}
      </p>

      <div class="pt-2 flex items-center justify-end gap-2">
        <NuxtLink
          :to="`/superadmin/companies/${tenantId}`"
          class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
        >
          Cancel
        </NuxtLink>
        <button
          type="submit"
          class="rounded-xl bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition"
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
          class="rounded-xl bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition"
          @click="onContinue"
        >
          Continue to bot →
        </button>
      </div>
    </template>
  </div>
</template>
