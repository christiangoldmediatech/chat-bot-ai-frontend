<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Bot } from '~/types/bot'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
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
  phoneNumber: '',
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
  form.phoneNumber = bot.phoneNumber ?? ''
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
      phoneNumber: form.phoneNumber || undefined,
      whatsappBusinessAccountId: form.whatsappBusinessAccountId || undefined,
      whatsappToken: form.whatsappToken || undefined,
      whatsappAppSecret: form.whatsappAppSecret || undefined,
      webhookVerifyToken: form.webhookVerifyToken,
      isActive: form.isActive,
    })
    success.value = t('admin.botEdit.successMessage')
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
    <SuperadminBackLink :to="`/superadmin/companies/${tenantId}/bots/${botId}`" :label="$t('admin.botEdit.back')" />
    <h1 class="mt-4 text-2xl font-display font-semibold text-pearl tracking-tight">{{ $t('admin.botEdit.title') }}</h1>
    <p class="text-mist text-sm mt-1 max-w-2xl leading-relaxed">
      {{ $t('admin.botEdit.subtitle') }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <div v-else class="mt-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start gap-6">
      <!-- ────────────────────────────────────────────────────────────────
           LEFT — Meta setup guide (sticky on desktop)
      ───────────────────────────────────────────────────────────────── -->
      <aside class="lg:sticky lg:top-20 rounded-3xl bg-ink-surface/70 ring-1 ring-line backdrop-blur-xl shadow-halo-glow p-5">
        <div class="flex items-center gap-2">
          <div class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4 text-emerald-400" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <h2 class="text-sm font-semibold text-pearl">{{ $t('admin.botCreate.metaGuide.title') }}</h2>
        </div>
        <p class="mt-1 text-xs text-mist leading-relaxed">{{ $t('admin.botCreate.metaGuide.subtitle') }}</p>

        <ol class="mt-4 space-y-3">
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-pearl text-ink-tealDeep text-[10px] font-bold">1</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-pearl">{{ $t('admin.botCreate.metaGuide.step1Title') }}</p>
              <p class="text-[11px] text-mist mt-0.5 leading-relaxed">
                <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" class="font-medium text-halo hover:text-halo-dim underline underline-offset-2 transition">developers.facebook.com</a> {{ $t('admin.botCreate.metaGuide.step1Body') }}
              </p>
            </div>
          </li>
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-pearl text-ink-tealDeep text-[10px] font-bold">2</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-pearl">{{ $t('admin.botCreate.metaGuide.step2Title') }}</p>
              <ul class="mt-1 space-y-0.5 text-[11px] text-mist leading-relaxed">
                <li>• {{ $t('admin.botCreate.metaGuide.step2AppSecret') }}</li>
                <li>• {{ $t('admin.botCreate.metaGuide.step2PhoneId') }}</li>
                <li>• {{ $t('admin.botCreate.metaGuide.step2Token') }}</li>
                <li>• {{ $t('admin.botCreate.metaGuide.step2Waba') }}</li>
              </ul>
            </div>
          </li>
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-pearl text-ink-tealDeep text-[10px] font-bold">3</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-pearl">{{ $t('admin.botCreate.metaGuide.step3Title') }}</p>
              <p class="text-[11px] text-mist mt-0.5 leading-relaxed">{{ $t('admin.botEdit.step3PasteHere') }}<span class="font-semibold text-pearl">{{ $t('admin.botEdit.step3SaveEmph') }}</span>.</p>
            </div>
          </li>
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-success-500 text-ink-tealDeep text-[10px] font-bold shadow-[0_0_10px_rgba(34,197,94,0.5)]">4</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-pearl">{{ $t('admin.botCreate.metaGuide.step4Title') }}</p>
              <p class="text-[11px] text-mist mt-0.5 leading-relaxed">
                {{ $t('admin.botEdit.step4ConfigBody') }}
              </p>
            </div>
          </li>
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-success-500 text-ink-tealDeep text-[10px] font-bold shadow-[0_0_10px_rgba(34,197,94,0.5)]">5</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-pearl">{{ $t('admin.botCreate.metaGuide.step5Title') }}</p>
              <p class="text-[11px] text-mist mt-0.5 leading-relaxed">{{ $t('admin.botCreate.metaGuide.step5Body') }}</p>
            </div>
          </li>
          <li class="flex gap-2.5">
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-ink-tealDeep text-[10px] font-bold shadow-halo-glow">6</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-pearl">{{ $t('admin.botCreate.metaGuide.step6Title') }}</p>
              <p class="text-[11px] text-mist mt-0.5 leading-relaxed">{{ $t('admin.botCreate.metaGuide.step6BodyBefore') }}{{ $t('admin.botCreate.metaGuide.step6Link') }}{{ $t('admin.botCreate.metaGuide.step6BodyAfter') }}</p>
            </div>
          </li>
        </ol>

        <div class="mt-4 pt-3 border-t border-line">
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-1 text-[11px] font-medium text-halo hover:text-halo-dim underline underline-offset-2 transition"
          >
            {{ $t('admin.botCreate.metaGuide.docsLink') }}
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
        <p v-if="error" class="mb-4 rounded-2xl border border-danger-500/40 bg-danger-500/10 backdrop-blur-sm p-3 text-sm text-danger-200">
          {{ error }}
        </p>
        <p v-if="success" class="mb-4 rounded-2xl border border-success-500/40 bg-success-500/10 backdrop-blur-sm p-3 text-sm text-success-200 inline-flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {{ success }}
        </p>

        <form class="space-y-5" @submit.prevent="onSubmit">
      <!-- ────────────────────────────────────────────────────────────────
           SECTION 1 — Bot details
      ───────────────────────────────────────────────────────────────── -->
      <section class="rounded-3xl bg-ink-surface/70 ring-1 ring-line backdrop-blur-xl shadow-halo-glow p-6 space-y-5">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-halo-wash ring-1 ring-halo-line">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-halo" aria-hidden="true">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v4" />
              <line x1="8" y1="16" x2="8" y2="16" />
              <line x1="16" y1="16" x2="16" y2="16" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-pearl">{{ $t('admin.botCreate.section.detailsTitle') }}</h2>
            <p class="text-xs text-mist mt-0.5 leading-relaxed">{{ $t('admin.botCreate.section.detailsSubtitle') }}</p>
          </div>
        </header>

        <div>
          <label class="block text-sm font-medium text-pearl">{{ $t('admin.botCreate.section.nameLabel') }}</label>
          <input
            v-model="form.name"
            type="text"
            required
            minlength="2"
            maxlength="80"
            class="mt-1 w-full rounded-xl border border-line bg-ink-surface/70 px-3 py-2 text-sm !text-pearl !caret-pearl placeholder:text-mist/60 focus:border-halo focus:outline-none focus:ring-1 focus:ring-halo transition"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-pearl">{{ $t('admin.botCreate.section.systemPromptLabel') }}</label>
          <textarea
            v-model="form.systemPrompt"
            required
            rows="5"
            class="mt-1 w-full rounded-xl border border-line bg-ink-surface/70 px-3 py-2 text-sm !text-pearl !caret-pearl placeholder:text-mist/60 font-mono focus:border-halo focus:outline-none focus:ring-1 focus:ring-halo transition"
          />
          <p class="mt-1 text-xs text-mist leading-relaxed">{{ $t('admin.botCreate.section.systemPromptHelp') }}</p>
        </div>

        <div class="flex items-center gap-2">
          <input id="isActive" v-model="form.isActive" type="checkbox" class="size-4 rounded border-line bg-ink-surface/70 text-halo focus:ring-halo focus:ring-offset-0">
          <label for="isActive" class="text-sm text-pearl">{{ $t('admin.botEdit.botActiveLabel') }}</label>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           SECTION 2 — WhatsApp Business connection (Meta credentials)
      ───────────────────────────────────────────────────────────────── -->
      <section class="rounded-3xl bg-ink-surface/70 ring-1 ring-line backdrop-blur-xl shadow-halo-glow p-6 space-y-5">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5 text-emerald-400" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-pearl">{{ $t('admin.botCreate.section.waConnectionTitle') }}</h2>
            <p class="text-xs text-mist mt-0.5 leading-relaxed">
              {{ $t('admin.botEdit.subtitleEdit') }}
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" class="font-medium text-halo hover:text-halo-dim underline underline-offset-2 transition">{{ $t('admin.botCreate.section.waConnectionSubtitleLink') }}</a>
              {{ $t('admin.botCreate.section.waConnectionSubtitleAfter') }}
            </p>
          </div>
        </header>

        <!-- Identifiers (public-ish) -->
        <div>
          <h3 class="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist">{{ $t('admin.botEdit.identifiers') }}</h3>
          <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-pearl">{{ $t('admin.botCreate.section.phoneIdLabel') }}</label>
              <input
                v-model="form.whatsappPhoneId"
                type="text"
                required
                placeholder="123456789012345"
                class="mt-1 w-full rounded-xl border border-line bg-ink-surface/70 px-3 py-2 text-sm !text-pearl !caret-pearl placeholder:text-mist/60 font-mono focus:border-halo focus:outline-none focus:ring-1 focus:ring-halo transition"
              >
              <p class="mt-1 text-xs text-mist leading-relaxed">{{ $t('admin.botCreate.section.phoneIdHelp') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-pearl">
                {{ $t('admin.botCreate.section.wabaIdLabel') }} <span class="text-mist font-normal">{{ $t('admin.botCreate.section.wabaIdOptional') }}</span>
              </label>
              <input
                v-model="form.whatsappBusinessAccountId"
                type="text"
                placeholder="987654321098765"
                class="mt-1 w-full rounded-xl border border-line bg-ink-surface/70 px-3 py-2 text-sm !text-pearl !caret-pearl placeholder:text-mist/60 font-mono focus:border-halo focus:outline-none focus:ring-1 focus:ring-halo transition"
              >
              <p class="mt-1 text-xs text-mist leading-relaxed">{{ $t('admin.botCreate.section.wabaIdHelp') }}</p>
            </div>
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-pearl">
              {{ $t('admin.botCreate.section.phoneNumberLabel') }} <span class="text-mist font-normal">{{ $t('admin.botCreate.section.wabaIdOptional') }}</span>
            </label>
            <input
              v-model="form.phoneNumber"
              type="tel"
              maxlength="32"
              :placeholder="$t('admin.botCreate.section.phoneNumberPlaceholder')"
              class="mt-1 w-full rounded-xl border border-line bg-ink-surface/70 px-3 py-2 text-sm !text-pearl !caret-pearl placeholder:text-mist/60 focus:border-halo focus:outline-none focus:ring-1 focus:ring-halo transition"
            >
            <p class="mt-1 text-xs text-mist leading-relaxed">{{ $t('admin.botCreate.section.phoneNumberHelp') }}</p>
          </div>
        </div>

        <div class="border-t border-line" />

        <!-- Secrets (write-only) -->
        <div>
          <div class="flex items-start gap-2">
            <h3 class="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist">{{ $t('admin.botEdit.secrets') }}</h3>
            <span class="inline-flex items-center gap-1 rounded-full bg-ink-card/80 px-2 py-0.5 text-[10px] font-medium text-mist ring-1 ring-line">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {{ $t('admin.botEdit.encryptedAtRest') }}
            </span>
          </div>
          <p class="mt-1 text-xs text-mist leading-relaxed">{{ $t('admin.botEdit.secretsHelp') }}</p>

          <div class="mt-3 space-y-4">
            <div>
              <label class="block text-sm font-medium text-pearl">{{ $t('admin.botEdit.newAccessToken') }}</label>
              <input
                v-model="form.whatsappToken"
                type="password"
                pattern="EAA[A-Za-z0-9_-]+"
                :placeholder="$t('admin.botEdit.newTokenPlaceholder')"
                autocomplete="off"
                class="mt-1 w-full rounded-xl border border-line bg-ink-surface/70 px-3 py-2 text-sm !text-pearl !caret-pearl placeholder:text-mist/60 font-mono focus:border-halo focus:outline-none focus:ring-1 focus:ring-halo transition"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-pearl">
                {{ $t('admin.botEdit.newAppSecret') }} <span class="text-mist font-normal">{{ $t('admin.botCreate.section.wabaIdOptional') }}</span>
              </label>
              <input
                v-model="form.whatsappAppSecret"
                type="password"
                pattern="[a-fA-F0-9]+"
                :placeholder="$t('admin.botEdit.newAppSecretPlaceholder')"
                autocomplete="off"
                class="mt-1 w-full rounded-xl border border-line bg-ink-surface/70 px-3 py-2 text-sm !text-pearl !caret-pearl placeholder:text-mist/60 font-mono focus:border-halo focus:outline-none focus:ring-1 focus:ring-halo transition"
              >
              <p class="mt-1 text-xs text-mist leading-relaxed">{{ $t('admin.botEdit.newAppSecretHelp') }}</p>
            </div>
          </div>
        </div>

        <div class="border-t border-line" />

        <!-- Webhook -->
        <div>
          <h3 class="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist">{{ $t('admin.botEdit.webhookTitle') }}</h3>
          <p class="mt-1 text-xs text-mist leading-relaxed">
            {{ $t('admin.botEdit.webhookHelp') }}
          </p>

          <!-- Callback URL (read-only, derived from bot id) -->
          <div class="mt-3">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-medium text-pearl">{{ $t('admin.botEdit.callbackUrlLabel') }}</label>
              <CopyButton :value="callbackUrl" tone="dark" :label="$t('admin.botEdit.copyUrl')" />
            </div>
            <div class="mt-1 flex items-center gap-2 rounded-xl border border-line bg-ink-card/80 px-3 py-2">
              <code class="flex-1 text-xs font-mono text-pearl break-all select-all">{{ callbackUrl }}</code>
            </div>
            <p class="mt-1 text-xs text-mist leading-relaxed">
              {{ $t('admin.botEdit.callbackHelpBefore') }}<span class="font-mono text-pearl">{{ botId }}</span>{{ $t('admin.botEdit.callbackHelpAfter') }}
            </p>
          </div>

          <!-- Verify token (editable) -->
          <div class="mt-4">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-medium text-pearl">{{ $t('admin.botEdit.verifyTokenLabel') }}</label>
              <CopyButton
                v-if="form.webhookVerifyToken"
                :value="form.webhookVerifyToken"
                tone="dark"
                :label="$t('admin.botEdit.copyToken')"
              />
            </div>
            <input
              v-model="form.webhookVerifyToken"
              type="text"
              required
              minlength="16"
              class="mt-1 w-full rounded-xl border border-line bg-ink-surface/70 px-3 py-2 text-sm !text-pearl !caret-pearl placeholder:text-mist/60 font-mono focus:border-halo focus:outline-none focus:ring-1 focus:ring-halo transition"
            >
            <p class="mt-1 text-xs text-mist leading-relaxed">
              {{ $t('admin.botEdit.verifyHelp') }}
            </p>
          </div>
        </div>
      </section>

      <div class="pt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-xl border border-line bg-ink-card/60 px-4 py-2 text-sm font-medium text-pearl hover:bg-ink-cardHi/60 hover:border-halo-line transition"
          @click="onCancel"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          type="submit"
          class="rounded-xl bg-brand-gradient text-ink-tealDeep px-5 py-2 text-sm font-semibold hover:brightness-110 disabled:opacity-60 shadow-halo-glow transition"
          :disabled="saving"
        >
          {{ saving ? $t('common.saving') : $t('admin.botEdit.saveChanges') }}
        </button>
      </div>
    </form>
      </div>
    </div>
  </div>
</template>
