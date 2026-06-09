<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'

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
  webhookVerifyToken: '',
  isActive: true,
})

const saving = ref(false)
const error = ref<string | null>(null)
// `createdBot` switches the page from "form" mode to "uploads" mode once the
// bot exists. Documents can only attach to an existing bot, so they live in a
// second step on the same page instead of redirecting away immediately.
const createdBot = ref<Bot | null>(null)

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
    createdBot.value = await bots.create({
      name: form.name,
      systemPrompt: form.systemPrompt,
      whatsappPhoneId: form.whatsappPhoneId,
      whatsappBusinessAccountId: form.whatsappBusinessAccountId || undefined,
      whatsappToken: form.whatsappToken,
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
  await router.replace(`/admin/bots/${createdBot.value.id}`)
}
</script>

<template>
  <div>
    <NuxtLink to="/admin/bots" class="text-sm text-slate-500 hover:text-slate-700">← Back to bots</NuxtLink>
    <h1 class="mt-2 text-2xl font-semibold tracking-tight">Create bot</h1>
    <p class="text-slate-500 text-sm mt-1 max-w-2xl">
      Two things are needed: how the bot should behave, and the WhatsApp Business credentials from Meta. Fine-tuning (tone, fallback, documents) is done later from the bot panel.
    </p>

    <form v-if="!createdBot" class="mt-6 max-w-2xl space-y-5" @submit.prevent="onSubmit">
      <!-- ────────────────────────────────────────────────────────────────
           SECTION 1 — Bot details (internal: name, prompt, status)
      ───────────────────────────────────────────────────────────────── -->
      <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6 space-y-5">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 ring-1 ring-primary-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-primary-600" aria-hidden="true">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v4" />
              <line x1="8" y1="16" x2="8" y2="16" />
              <line x1="16" y1="16" x2="16" y2="16" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-900">Bot details</h2>
            <p class="text-xs text-slate-500 mt-0.5">Identity and base behavior — only visible inside the admin.</p>
          </div>
        </header>

        <div>
          <label for="name" class="block text-sm font-medium text-slate-700">Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            minlength="2"
            maxlength="80"
            placeholder="e.g. Sales assistant"
            class="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
        </div>

        <div>
          <label for="systemPrompt" class="block text-sm font-medium text-slate-700">System prompt</label>
          <textarea
            id="systemPrompt"
            v-model="form.systemPrompt"
            required
            rows="5"
            placeholder="You are a friendly sales assistant for…"
            class="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
          />
          <p class="mt-1 text-xs text-slate-500">Base instructions the model will receive on every conversation.</p>
        </div>

        <div class="flex items-center gap-2">
          <input id="isActive" v-model="form.isActive" type="checkbox" class="size-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500">
          <label for="isActive" class="text-sm text-slate-700">Activate bot on creation</label>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           SECTION 2 — WhatsApp Business connection (from Meta)
      ───────────────────────────────────────────────────────────────── -->
      <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6 space-y-5">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-50 ring-1 ring-success-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5 text-success-600" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-900">WhatsApp Business connection</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Copy these from
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" class="font-medium text-primary-600 hover:underline">Meta App</a>
              → WhatsApp → API Setup.
            </p>
          </div>
        </header>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="phoneId" class="block text-sm font-medium text-slate-700">Phone Number ID</label>
            <input
              id="phoneId"
              v-model="form.whatsappPhoneId"
              type="text"
              required
              placeholder="123456789012345"
              class="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
            <p class="mt-1 text-xs text-slate-500">From the WhatsApp dashboard, next to the test number.</p>
          </div>
          <div>
            <label for="wabaId" class="block text-sm font-medium text-slate-700">
              WhatsApp Business Account ID <span class="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="wabaId"
              v-model="form.whatsappBusinessAccountId"
              type="text"
              placeholder="987654321098765"
              class="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
            <p class="mt-1 text-xs text-slate-500">WABA ID — useful for templates and metrics.</p>
          </div>
        </div>

        <div>
          <label for="token" class="block text-sm font-medium text-slate-700">Permanent access token</label>
          <input
            id="token"
            v-model="form.whatsappToken"
            type="password"
            required
            pattern="EAA[A-Za-z0-9_-]+"
            placeholder="EAA…"
            class="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
          <p class="mt-1 text-xs text-slate-500">Stored encrypted with AES-256-GCM. Starts with <span class="font-mono">EAA</span>.</p>
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
              placeholder="At least 16 characters"
              class="flex-1 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
            <button
              type="button"
              class="rounded-xl border border-slate-200 bg-white/80 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              @click="generateVerifyToken"
            >
              Generate
            </button>
          </div>
          <p class="mt-1 text-xs text-slate-500">
            Set the same value in <span class="font-medium text-slate-600">Meta App → WhatsApp → Configuration → Webhook</span>.
          </p>
        </div>
      </section>

      <p v-if="error" class="rounded-2xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
        {{ error }}
      </p>

      <div class="pt-2 flex items-center justify-end gap-2">
        <NuxtLink
          to="/admin/bots"
          class="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          Cancel
        </NuxtLink>
        <button
          type="submit"
          class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition shadow-glass"
          :disabled="saving"
        >
          {{ saving ? 'Creating…' : 'Create bot' }}
        </button>
      </div>
    </form>

    <!-- Post-creation: bot exists, upload docs in the same flow before moving on. -->
    <template v-else>
      <div class="mt-6 max-w-2xl rounded-2xl border border-success-200 bg-success-50/70 backdrop-blur-xl p-4 text-sm text-success-700">
        Bot <strong class="font-semibold">{{ createdBot.name }}</strong> was created. Upload knowledge documents below to improve its answers — or skip and add them later.
      </div>

      <div class="mt-6 max-w-2xl">
        <BotDocumentsCard :bot-id="createdBot.id" />
      </div>

      <div class="mt-6 max-w-2xl flex justify-end gap-2">
        <button
          type="button"
          class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 shadow-glass transition"
          @click="onContinue"
        >
          Continue to bot →
        </button>
      </div>
    </template>
  </div>
</template>
