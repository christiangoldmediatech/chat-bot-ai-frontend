<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Tenant } from '~/types/company'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const { t } = useI18n()
const auth = useAuthStore()
const tenant = useTenant()

const tenantData = ref<Tenant | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    tenantData.value = await tenant.me()
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

await load()

const BANK_NAME = 'Banco Pichincha'
const ACCOUNT_NUMBER = '2200878125'
const ACCOUNT_TYPE_KEY = 'admin.payment.bank.typeValue'
const ACCOUNT_HOLDER = 'Christian Borja'
const ID_NUMBER = '0104793245'
const SUPPORT_EMAIL = 'info@kaibots.com'

const companyName = computed(() => tenantData.value?.name ?? '')
const userEmail = computed(() => auth.user?.email ?? '')

const emailSubject = computed(() => companyName.value
  ? companyName.value
  : t('admin.payment.email.subjectFallback'))

const emailBody = computed(() => t('admin.payment.email.bodyTemplate', {
  company: companyName.value || t('admin.payment.email.companyFallback'),
  user: userEmail.value || t('admin.payment.email.userFallback'),
}))

const mailtoHref = computed(() => {
  const subject = encodeURIComponent(emailSubject.value)
  const body = encodeURIComponent(emailBody.value)
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
})
</script>

<template>
  <div class="max-w-5xl">
    <!-- Page header -->
    <header>
      <NuxtLink to="/admin" class="text-sm text-slate-500 hover:text-slate-700">
        {{ $t('admin.payment.back') }}
      </NuxtLink>
      <h1 class="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
        {{ $t('admin.payment.title') }}
      </h1>
      <p class="mt-1 text-sm text-slate-500 max-w-2xl">
        {{ $t('admin.payment.subtitle') }}
      </p>
    </header>

    <SpinnerInline v-if="loading" class="mt-6" />

    <template v-else>
      <p v-if="error" class="mt-4 rounded-2xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
        {{ error }}
      </p>

      <!-- ────────────────────────────────────────────────────────────────
           1. Bank account card (Pichincha brand: yellow + dark)
      ───────────────────────────────────────────────────────────────── -->
      <section class="mt-6 overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-glass-lg">
        <!-- Brand strip -->
        <div class="relative flex items-center gap-3 bg-gradient-to-r from-[#FFD800] via-[#FFDD00] to-[#FFE65A] px-6 py-5">
          <!-- Pichincha brand chip: yellow square + stylized "P" mark.
               Faithful to brand colors. Drop /public/banco-pichincha.svg
               to swap to an exact logo asset. -->
          <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" class="size-7" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="#FFDD00" />
              <path
                fill="#111"
                d="M10 7h7.2c3.5 0 5.8 2 5.8 5.1 0 3.2-2.4 5.2-6 5.2h-3.7V25H10V7zm6.9 7.3c1.7 0 2.7-.8 2.7-2.2 0-1.4-1-2.2-2.7-2.2h-3.6v4.4h3.6z"
              />
            </svg>
          </div>
          <div>
            <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-900/70">
              {{ $t('admin.payment.bank.kicker') }}
            </p>
            <p class="text-lg font-bold text-slate-900 leading-tight">{{ BANK_NAME }}</p>
          </div>
        </div>

        <!-- Account details -->
        <div class="p-6 sm:p-7">
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Account holder -->
            <div class="flex items-start gap-3 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/70 p-4 sm:col-span-2">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <dt class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  {{ $t('admin.payment.bank.holderLabel') }}
                </dt>
                <dd class="mt-1 text-lg font-semibold text-slate-900">{{ ACCOUNT_HOLDER }}</dd>
              </div>
              <CopyButton :value="ACCOUNT_HOLDER" :aria-label="$t('admin.payment.bank.copyHolder')" />
            </div>

            <!-- Account number -->
            <div class="flex items-start gap-3 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/70 p-4">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <dt class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  {{ $t('admin.payment.bank.accountNumberLabel') }}
                </dt>
                <dd class="mt-1 font-mono text-lg font-semibold text-slate-900 break-all">{{ ACCOUNT_NUMBER }}</dd>
              </div>
              <CopyButton :value="ACCOUNT_NUMBER" :aria-label="$t('admin.payment.bank.copyAccount')" />
            </div>

            <!-- Account type -->
            <div class="flex items-start gap-3 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/70 p-4">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success-100 text-success-700 ring-1 ring-success-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                  <path d="M12 1v22" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <dt class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  {{ $t('admin.payment.bank.typeLabel') }}
                </dt>
                <dd class="mt-1 text-lg font-semibold text-slate-900">{{ $t(ACCOUNT_TYPE_KEY) }}</dd>
              </div>
            </div>

            <!-- Cédula -->
            <div class="flex items-start gap-3 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/70 p-4">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 ring-1 ring-primary-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="10" r="2" />
                  <path d="M15 8h3M15 12h3M5 16h14" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <dt class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  {{ $t('admin.payment.bank.idLabel') }}
                </dt>
                <dd class="mt-1 font-mono text-lg font-semibold text-slate-900 break-all">{{ ID_NUMBER }}</dd>
              </div>
              <CopyButton :value="ID_NUMBER" :aria-label="$t('admin.payment.bank.copyId')" />
            </div>

            <!-- Email -->
            <div class="flex items-start gap-3 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/70 p-4">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <dt class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  {{ $t('admin.payment.bank.emailLabel') }}
                </dt>
                <dd class="mt-1 text-lg font-semibold text-slate-900 break-all">{{ SUPPORT_EMAIL }}</dd>
              </div>
              <CopyButton :value="SUPPORT_EMAIL" :aria-label="$t('admin.payment.bank.copyEmail')" />
            </div>
          </dl>

          <!-- Official-only warning -->
          <div class="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 shrink-0 mt-0.5 text-amber-600" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-amber-900">{{ $t('admin.payment.officialNotice.title') }}</p>
              <p class="mt-1 text-sm leading-relaxed text-amber-900/90">
                {{ $t('admin.payment.officialNotice.body') }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           2. How to send the receipt
      ───────────────────────────────────────────────────────────────── -->
      <section class="mt-6 rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-6 sm:p-7">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 ring-1 ring-primary-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-slate-900">{{ $t('admin.payment.howTo.title') }}</h2>
            <p class="mt-0.5 text-sm text-slate-500">{{ $t('admin.payment.howTo.subtitle') }}</p>
          </div>
        </header>

        <ol class="mt-5 space-y-3">
          <li class="flex items-start gap-3 rounded-xl bg-slate-50/70 ring-1 ring-slate-200/60 p-3">
            <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-bold">1</span>
            <p class="text-sm text-slate-700 leading-relaxed">{{ $t('admin.payment.howTo.step1') }}</p>
          </li>
          <li class="flex items-start gap-3 rounded-xl bg-slate-50/70 ring-1 ring-slate-200/60 p-3">
            <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-bold">2</span>
            <p class="text-sm text-slate-700 leading-relaxed">{{ $t('admin.payment.howTo.step2') }}</p>
          </li>
          <li class="flex items-start gap-3 rounded-xl bg-slate-50/70 ring-1 ring-slate-200/60 p-3">
            <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-bold">3</span>
            <p class="text-sm text-slate-700 leading-relaxed">
              {{ $t('admin.payment.howTo.step3Before') }}<span class="font-mono font-medium text-slate-900">{{ SUPPORT_EMAIL }}</span>{{ $t('admin.payment.howTo.step3After') }}
            </p>
          </li>
        </ol>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           3. Example email (visual mock)
      ───────────────────────────────────────────────────────────────── -->
      <section class="mt-6">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {{ $t('admin.payment.example.kicker') }}
        </h2>
        <p class="mt-1 text-sm text-slate-500">{{ $t('admin.payment.example.helper') }}</p>

        <article class="mt-4 overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 shadow-glass">
          <!-- Mock email header -->
          <header class="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
            <div class="flex items-center gap-2">
              <div class="flex size-2 shrink-0 rounded-full bg-rose-400" />
              <div class="flex size-2 shrink-0 rounded-full bg-amber-400" />
              <div class="flex size-2 shrink-0 rounded-full bg-emerald-400" />
            </div>
            <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              {{ $t('admin.payment.example.mockTitle') }}
            </p>
          </header>

          <div class="p-5 sm:p-6 space-y-4">
            <!-- From -->
            <div class="flex items-center gap-3">
              <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-400 w-16 shrink-0">
                {{ $t('admin.payment.example.from') }}
              </span>
              <span class="text-sm font-mono text-slate-700 break-all">{{ userEmail || $t('admin.payment.email.userFallback') }}</span>
            </div>
            <!-- To -->
            <div class="flex items-center gap-3">
              <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-400 w-16 shrink-0">
                {{ $t('admin.payment.example.to') }}
              </span>
              <span class="text-sm font-mono text-slate-700">{{ SUPPORT_EMAIL }}</span>
            </div>
            <!-- Subject -->
            <div class="flex items-center gap-3">
              <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-400 w-16 shrink-0">
                {{ $t('admin.payment.example.subject') }}
              </span>
              <span class="rounded-lg bg-primary-50 px-2.5 py-1 text-sm font-semibold text-primary-700 ring-1 ring-primary-200">
                {{ emailSubject }}
              </span>
            </div>

            <div class="border-t border-slate-100 pt-4">
              <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                {{ $t('admin.payment.example.body') }}
              </p>
              <pre class="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 font-sans ring-1 ring-slate-200/70">{{ emailBody }}</pre>
            </div>

            <!-- Attachment placeholder -->
            <div class="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-slate-500" aria-hidden="true">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <p class="text-xs text-slate-600">
                <span class="font-medium text-slate-800">{{ $t('admin.payment.example.attachmentTitle') }}</span>
                <span class="text-slate-500"> — {{ $t('admin.payment.example.attachmentHint') }}</span>
              </p>
            </div>
          </div>
        </article>

        <!-- Pre-filled mailto CTA -->
        <div class="mt-5 flex flex-wrap items-center gap-3">
          <a
            :href="mailtoHref"
            class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-glass hover:bg-slate-800 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {{ $t('admin.payment.cta.compose') }}
          </a>
          <p class="text-xs text-slate-500">{{ $t('admin.payment.cta.helper') }}</p>
        </div>
      </section>
    </template>
  </div>
</template>
