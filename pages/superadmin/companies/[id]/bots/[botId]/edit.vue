<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const tenantId = route.params.id as string
const botId = route.params.botId as string
const bots = useBots(tenantId)

// Webhook URL Meta will POST to. The bot id is part of the path so the backend
// can route the inbound to the right bot's credentials/agent.
const callbackUrl = computed(() => `${config.public.apiBaseUrl}/webhooks/whatsapp/${botId}`)

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
    <h1 class="mt-2 text-2xl font-semibold text-slate-100 tracking-tight">Edit bot</h1>
    <p class="text-slate-400 text-sm mt-1 max-w-2xl">
      Editing on behalf of this tenant. Update how the bot behaves and the WhatsApp Business credentials from Meta. Secrets stay unchanged unless you type a new value.
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <div v-else class="mt-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,40rem)] lg:items-start gap-6">
      <!-- ────────────────────────────────────────────────────────────────
           LEFT — Meta setup guide (sticky on desktop)
      ───────────────────────────────────────────────────────────────── -->
      <aside class="lg:sticky lg:top-6 rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-5">
        <div class="flex items-center gap-2">
          <div class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4 text-emerald-400" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <h2 class="text-sm font-semibold text-slate-100">Meta setup guide</h2>
        </div>
        <p class="mt-1 text-xs text-slate-500">Follow these steps in order.</p>

        <ol class="mt-4 space-y-3">
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 text-[10px] font-bold">1</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-100">Create app in Meta</p>
              <p class="text-[11px] text-slate-500 mt-0.5">
                <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" class="text-indigo-300 hover:underline">developers.facebook.com</a> → New app → add the <span class="font-medium text-slate-400">WhatsApp</span> product.
              </p>
            </div>
          </li>
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 text-[10px] font-bold">2</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-100">Copy 4 values from Meta</p>
              <ul class="mt-1 space-y-0.5 text-[11px] text-slate-500">
                <li>• <span class="font-medium text-slate-400">App Secret</span> — App Settings → Basic</li>
                <li>• <span class="font-medium text-slate-400">Phone Number ID</span> — WhatsApp → API Setup</li>
                <li>• <span class="font-medium text-slate-400">Access Token</span> — WhatsApp → API Setup</li>
                <li>• <span class="font-medium text-slate-400">WABA ID</span> — WhatsApp → API Setup</li>
              </ul>
            </div>
          </li>
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 text-[10px] font-bold">3</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-100">Paste them here</p>
              <p class="text-[11px] text-slate-500 mt-0.5">Fill the fields in the form on the right and click <span class="font-medium text-slate-300">Save changes</span>.</p>
            </div>
          </li>
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-900 text-[10px] font-bold">4</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-100">Configure webhook in Meta</p>
              <p class="text-[11px] text-slate-500 mt-0.5">
                In Meta → WhatsApp → Configuration → Webhook → <span class="font-medium text-slate-400">Edit</span>. Paste the
                <span class="font-medium text-slate-300">Callback URL</span> and
                <span class="font-medium text-slate-300">Verify token</span> shown in the Webhook section on the right.
              </p>
            </div>
          </li>
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-900 text-[10px] font-bold">5</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-100">Subscribe to <code class="font-mono text-[10px] bg-slate-800 text-slate-300 px-1 rounded">messages</code></p>
              <p class="text-[11px] text-slate-500 mt-0.5">In "Webhook fields" → Manage, check the <span class="font-medium text-slate-400">messages</span> event.</p>
            </div>
          </li>
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold">6</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-100">Test it</p>
              <p class="text-[11px] text-slate-500 mt-0.5">Send a real WhatsApp message to the business number — it should appear in this tenant's conversations.</p>
            </div>
          </li>
        </ol>

        <div class="mt-4 pt-3 border-t border-slate-800">
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-300 hover:underline"
          >
            Meta WhatsApp Cloud API docs
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </aside>

      <!-- ────────────────────────────────────────────────────────────────
           RIGHT — Edit form
      ───────────────────────────────────────────────────────────────── -->
      <div class="min-w-0">
        <p v-if="error" class="mb-4 rounded-2xl border border-danger-800 bg-danger-950/80 p-3 text-sm text-danger-300">
          {{ error }}
        </p>
        <p v-if="success" class="mb-4 rounded-2xl border border-emerald-800 bg-emerald-950/80 p-3 text-sm text-emerald-300">
          {{ success }}
        </p>

        <form class="space-y-5" @submit.prevent="onSubmit">
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
          <label class="block text-sm font-medium text-slate-300">Name</label>
          <input
            v-model="form.name"
            type="text"
            required
            minlength="2"
            maxlength="80"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-300">System prompt</label>
          <textarea
            v-model="form.systemPrompt"
            required
            rows="5"
            class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="mt-1 text-xs text-slate-500">Base instructions the model will receive on every conversation.</p>
        </div>

        <div class="flex items-center gap-2">
          <input id="isActive" v-model="form.isActive" type="checkbox" class="size-4 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500">
          <label for="isActive" class="text-sm text-slate-300">Bot active</label>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           SECTION 2 — WhatsApp Business connection (Meta credentials)
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
              Credentials from
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" class="font-medium text-indigo-300 hover:underline">Meta App</a>
              → WhatsApp → API Setup.
            </p>
          </div>
        </header>

        <!-- Identifiers (public-ish) -->
        <div>
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Identifiers</h3>
          <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-300">Phone Number ID</label>
              <input
                v-model="form.whatsappPhoneId"
                type="text"
                required
                placeholder="123456789012345"
                class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
              <p class="mt-1 text-xs text-slate-500">From the WhatsApp dashboard, next to the test number.</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-300">
                WhatsApp Business Account ID <span class="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                v-model="form.whatsappBusinessAccountId"
                type="text"
                placeholder="987654321098765"
                class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
              <p class="mt-1 text-xs text-slate-500">WABA ID — useful for templates and metrics.</p>
            </div>
          </div>
        </div>

        <div class="border-t border-slate-800" />

        <!-- Secrets (write-only) -->
        <div>
          <div class="flex items-start gap-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Secrets</h3>
            <span class="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Encrypted at rest
            </span>
          </div>
          <p class="mt-1 text-xs text-slate-500">For security, current values are never shown. Leave blank to keep the value already on the server.</p>

          <div class="mt-3 space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-300">New access token</label>
              <input
                v-model="form.whatsappToken"
                type="password"
                pattern="EAA[A-Za-z0-9_-]+"
                placeholder="EAA… (leave blank to keep current)"
                autocomplete="off"
                class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-300">
                New app secret <span class="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                v-model="form.whatsappAppSecret"
                type="password"
                pattern="[a-fA-F0-9]+"
                placeholder="hex string (leave blank to keep current)"
                autocomplete="off"
                class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
              <p class="mt-1 text-xs text-slate-500">Enables HMAC validation for Meta's webhook payloads.</p>
            </div>
          </div>
        </div>

        <div class="border-t border-slate-800" />

        <!-- Webhook -->
        <div>
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Webhook</h3>
          <p class="mt-1 text-xs text-slate-500">
            Paste these two values in <span class="font-medium text-slate-400">Meta App → WhatsApp → Configuration → Webhook → Edit</span>.
          </p>

          <!-- Callback URL (read-only, derived from bot id) -->
          <div class="mt-3">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-medium text-slate-300">Callback URL</label>
              <CopyButton :value="callbackUrl" tone="dark" label="Copy URL" />
            </div>
            <div class="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 ring-1 ring-inset ring-slate-800/50">
              <code class="flex-1 text-xs font-mono text-slate-200 break-all select-all">{{ callbackUrl }}</code>
            </div>
            <p class="mt-1 text-xs text-slate-500">
              Built from this bot's ID (<span class="font-mono">{{ botId }}</span>). Don't share — paste it in Meta's Callback URL field.
            </p>
          </div>

          <!-- Verify token (editable) -->
          <div class="mt-4">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-medium text-slate-300">Verify token</label>
              <CopyButton
                v-if="form.webhookVerifyToken"
                :value="form.webhookVerifyToken"
                tone="dark"
                label="Copy token"
              />
            </div>
            <input
              v-model="form.webhookVerifyToken"
              type="text"
              required
              minlength="16"
              class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
            <p class="mt-1 text-xs text-slate-500">
              Paste the same value in Meta's "Verify token" field. Meta uses it once to confirm you own the webhook endpoint.
            </p>
          </div>
        </div>
      </section>

      <div class="pt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
          @click="onCancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded-xl bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition"
          :disabled="saving"
        >
          {{ saving ? 'Saving…' : 'Save changes' }}
        </button>
      </div>
    </form>
      </div>
    </div>
  </div>
</template>
