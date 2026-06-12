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
const pricing = usePricing()

const tenantData = ref<Tenant | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    tenantData.value = await tenant.me()
  } catch (err) {
    const apiErr = err as ApiError
    // Suppress the tenant-active guard block (HTTP 402): this page IS the
    // remediation for that state, so showing "expired" copy on top of the
    // bank-transfer instructions would be confusing. The global
    // BillingBanner already communicates the status.
    if (apiErr.status !== 402) {
      error.value = apiErr.message
    }
  } finally {
    loading.value = false
  }
}

await load()

const ACCOUNT_NUMBER = '2200878125'
const ACCOUNT_TYPE_KEY = 'admin.payment.bank.typeValue'
const ACCOUNT_HOLDER = 'Christian Borja'
const ID_NUMBER = '0104793245'
const SUPPORT_EMAIL = 'info@kaibots.com'

const companyName = computed(() => tenantData.value?.name ?? '')
const userEmail = computed(() => auth.user?.email ?? '')

const planDetails = computed(() => tenantData.value?.planDetails ?? null)
const planCurrency = computed(() => planDetails.value?.currency ?? 'USD')
const planDisplayName = computed(() => planDetails.value?.displayName ?? '')
const planBreakdown = computed(() => pricing.breakdown(planDetails.value?.monthlyPrice ?? 0))

function formatMoney(n: number): string {
  return pricing.formatMoney(n, planCurrency.value)
}

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
           0. Amount to deposit (plan + IVA 15% breakdown)
      ───────────────────────────────────────────────────────────────── -->
      <section v-if="planDetails" class="mt-6 overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-glass-lg">
        <div class="p-6 sm:p-7">
          <header class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 ring-1 ring-primary-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div class="min-w-0">
              <h2 class="text-lg font-semibold text-slate-900">{{ $t('admin.payment.amount.title') }}</h2>
              <p class="mt-0.5 text-sm text-slate-500">{{ $t('admin.payment.amount.subtitle') }}</p>
            </div>
          </header>

          <dl class="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200/70 divide-y divide-slate-200">
            <!-- Plan subtotal -->
            <div class="flex items-center justify-between gap-4 bg-slate-50/80 p-4">
              <dt class="min-w-0">
                <p class="text-sm font-medium text-slate-700">
                  {{ $t('admin.payment.amount.planLabel', { plan: planDisplayName }) }}
                </p>
                <p class="mt-0.5 text-xs text-slate-500">{{ $t('admin.payment.amount.planHelper') }}</p>
              </dt>
              <dd class="font-mono text-base font-semibold text-slate-900 whitespace-nowrap">
                {{ formatMoney(planBreakdown.subtotal) }}
              </dd>
            </div>

            <!-- IVA -->
            <div class="flex items-center justify-between gap-4 bg-slate-50/80 p-4">
              <dt class="min-w-0">
                <p class="text-sm font-medium text-slate-700">
                  {{ $t('admin.payment.amount.ivaLabel', { percent: pricing.ivaPercentLabel.value }) }}
                </p>
                <p class="mt-0.5 text-xs text-slate-500">{{ $t('admin.payment.amount.ivaHelper') }}</p>
              </dt>
              <dd class="font-mono text-base font-semibold text-slate-900 whitespace-nowrap">
                {{ formatMoney(planBreakdown.iva) }}
              </dd>
            </div>

            <!-- Total -->
            <div class="flex items-center justify-between gap-4 bg-slate-900 p-4 text-white">
              <dt class="min-w-0">
                <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-300">
                  {{ $t('admin.payment.amount.totalLabel') }}
                </p>
                <p class="mt-1 text-sm font-medium text-white/90">{{ $t('admin.payment.amount.totalHelper') }}</p>
              </dt>
              <dd class="font-mono text-2xl sm:text-3xl font-bold whitespace-nowrap">
                {{ formatMoney(planBreakdown.total) }}
              </dd>
            </div>
          </dl>

          <p class="mt-3 text-xs text-slate-500">
            {{ $t('admin.payment.amount.disclaimer', { percent: pricing.ivaPercentLabel.value }) }}
          </p>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────────
           1. Bank account card (Pichincha brand: yellow + dark)
      ───────────────────────────────────────────────────────────────── -->
      <section class="mt-6 overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-glass-lg">
        <!-- Brand strip — white surface so the official Banco Pichincha
             wordmark (which contains a yellow brand mark) reads correctly.
             Yellow accent line on top conveys the bank identity. -->
        <div class="relative bg-white px-6 py-5">
          <span class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FFD800] via-[#FFDD00] to-[#FFE65A]" aria-hidden="true" />
          <p class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
            {{ $t('admin.payment.bank.kicker') }}
          </p>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 576 48"
            class="mt-2 h-7 sm:h-8 w-auto"
            aria-labelledby="logo-pichincha-payment"
            role="img"
          >
            <title id="logo-pichincha-payment">Banco Pichincha</title>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M30.2311 0H0V31.9275C0 40.8041 7.1959 48 16.0725 48H48V0H30.2311Z" fill="#FFDD00" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M40 24H32.8216V15.2688H24V8H40V24Z" fill="#0F265C" />
            <path d="M573.333 42.0852L560.21 8.46156C559.61 6.96872 558.178 5.99724 556.592 6.0072H551.936L537.849 42.1098H545.785L548.607 35.0169H562.55L565.421 42.1098L573.333 42.0852ZM560.066 28.194H551.116L555.603 16.3889L560.066 28.194ZM524.123 42.0852H531.745V5.98266H528.031C525.895 5.96907 524.149 7.71235 524.123 9.88505V20.1439H509.022V5.98266H501.351V42.0852H509.022V27.1632H524.123V42.0852ZM471.728 32.4154C469.506 30.1905 468.306 27.1175 468.423 23.9481C468.303 20.8357 469.508 17.8219 471.728 15.6772C473.659 13.737 476.251 12.6293 478.965 12.5848C481.576 12.5722 484.119 13.4347 486.201 15.039C487.753 16.2006 489.91 16.0115 491.243 14.5973L493.655 12.143C490.191 7.7025 484.872 5.1832 479.302 5.34462C474.314 5.17749 469.464 7.03113 465.817 10.4986C462.179 14.0079 460.217 18.9506 460.438 24.0463C460.239 29.1093 462.2 34.013 465.817 37.4957C469.587 40.9278 474.512 42.7477 479.568 42.5761C485.226 42.7691 490.646 40.2526 494.21 35.7777L489.12 30.3783C486.916 33.5746 483.309 35.4647 479.471 35.4341C476.599 35.5074 473.816 34.4222 471.728 32.4154ZM446.64 42.0853H453.587V5.98274H445.988V30.5256L432.552 7.94616C431.847 6.76375 430.582 6.04591 429.223 6.05637H422.227V42.0853H429.874V17.7387L443.311 40.1954C444.016 41.3778 445.28 42.0957 446.64 42.0853ZM405.221 42.0852H412.844V5.98274H405.221V42.0852ZM388.335 42.0852H395.933V5.98266H392.122C391.098 5.97621 390.114 6.38368 389.386 7.11551C388.657 7.84734 388.245 8.84357 388.238 9.88505V20.1439H373.113V5.98266H365.587V42.0852H373.234V27.1632H388.359L388.335 42.0852ZM335.795 32.4154C333.582 30.1863 332.392 27.1138 332.514 23.9481C332.369 20.9852 333.425 18.0914 335.436 15.9433C337.447 13.7952 340.237 12.5811 343.152 12.5848C345.765 12.5648 348.311 13.4281 350.389 15.039C351.952 16.2237 354.133 16.0562 355.503 14.6464L357.916 12.1921C354.426 7.71626 349.054 5.19303 343.442 5.39371C338.46 5.22228 333.616 7.07698 329.981 10.5477C326.322 14.0545 324.349 19.0109 324.578 24.1199C324.375 29.1885 326.347 34.0967 329.981 37.5693C333.784 41.0419 338.771 42.8651 343.876 42.6497C349.476 42.7886 354.822 40.2775 358.35 35.8513L353.26 30.4519C351.061 33.6548 347.45 35.5469 343.611 35.5077C340.687 35.5942 337.853 34.4796 335.747 32.4154H335.795ZM310.104 42.0852H317.703V5.98274H310.104V42.0852ZM303.663 18.0823C303.807 14.6725 302.369 11.3918 299.78 9.22239C296.872 6.90577 293.239 5.73762 289.551 5.93365H274.933V42.0852H282.604V30.6483H289.551C293.245 30.8158 296.869 29.5925 299.731 27.2123C302.319 24.9229 303.754 21.5691 303.639 18.0823H303.663ZM296.016 18.2296C296.016 21.7883 293.387 23.6045 288.201 23.6045H282.604V13.0265H288.201C293.508 13.0265 296.016 14.5727 296.016 18.2296ZM250.665 37.3975C254.271 33.9045 256.237 29.0104 256.069 23.9481C256.22 18.9319 254.253 14.0898 250.665 10.6459C247.133 7.12072 242.344 5.20729 237.398 5.34462C232.488 5.21524 227.74 7.12997 224.251 10.6459C220.704 14.1146 218.759 18.9445 218.895 23.9481C218.766 28.972 220.708 33.8221 224.251 37.3239C227.757 40.8074 232.498 42.7015 237.398 42.5761C242.334 42.7068 247.114 40.8144 250.665 37.3239V37.3975ZM248.253 23.9481C248.342 26.937 247.297 29.8462 245.334 32.0718C243.411 34.2756 240.631 35.5056 237.735 35.4341C234.749 35.5891 231.849 34.3838 229.823 32.1454C227.792 29.9228 226.693 26.9821 226.759 23.9481C226.683 20.9642 227.737 18.0646 229.702 15.849C231.783 13.6238 234.723 12.4471 237.735 12.6338C240.649 12.5544 243.451 13.7736 245.406 15.9717C247.339 18.1558 248.375 21.0104 248.301 23.9481H248.253ZM192.384 32.4154C190.196 30.1763 189.04 27.1011 189.2 23.9481C189.055 20.9852 190.111 18.0914 192.122 15.9433C194.133 13.7952 196.922 12.5811 199.838 12.5848C202.45 12.5722 204.993 13.4347 207.075 15.039C208.626 16.2006 210.784 16.0115 212.117 14.5973L214.529 12.143C211.039 7.66717 205.667 5.14394 200.055 5.34462C195.066 5.17478 190.216 7.0288 186.571 10.4986C182.926 14.0054 180.955 18.9473 181.167 24.0463C180.974 29.1131 182.944 34.0174 186.571 37.4957C190.334 40.9218 195.249 42.7413 200.297 42.5761C205.962 42.7691 211.389 40.2535 214.963 35.7777L209.873 30.3783C207.645 33.6108 203.984 35.5055 200.104 35.4341C197.18 35.5206 194.346 34.406 192.24 32.3417L192.384 32.4154ZM167.417 42.0853H174.364V5.9827H166.766V30.5256L153.305 7.87253C152.597 6.69375 151.334 5.97716 149.976 5.9827H142.981V42.0853H150.652V17.7387L164.088 40.1954C164.793 41.3778 166.058 42.0957 167.417 42.0853ZM129.448 42.0852H137.36L124.358 8.46156C123.757 6.96872 122.325 5.99724 120.739 6.0072H115.963L101.875 42.0852H109.884L112.706 34.9924H126.649L129.448 42.0852ZM124.092 28.194H115.143L119.533 16.3889L124.092 28.194ZM94.2764 23.2854C96.6378 21.6094 98.0293 18.8517 97.9913 15.9226C97.9913 9.49236 93.1668 5.93365 85.5439 5.93365H69.3333V42.0852H86.4123C89.6511 42.2414 92.8393 41.2239 95.4102 39.2137C97.6743 37.3403 98.9499 34.4996 98.8598 31.5318C98.8229 28.1653 97.093 25.0528 94.2764 23.2854ZM90.272 16.757C90.272 19.2113 88.2698 20.463 84.2895 20.463H77.0526V13.1002H84.0483C88.511 13.1002 90.3202 14.0819 90.3202 16.8307L90.272 16.757ZM91.1887 30.9428C91.1887 33.9861 88.9694 35.1151 84.6996 35.1151H77.0044V26.8932H84.8685C89.0417 26.8932 91.1404 28.2431 91.1404 30.8692L91.1887 30.9428Z" fill="#0F265C" />
          </svg>
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
