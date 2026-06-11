<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { CompanyDetail } from '~/types/company'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const companiesApi = useCompanies()
const id = route.params.id as string

const data = ref<CompanyDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await companiesApi.get(id)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

await load()
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${id}`" class="text-sm text-slate-400 hover:text-slate-200">
      {{ $t('superadmin.companyBilling.back') }}
    </NuxtLink>

    <p v-if="error" class="mt-4 rounded-md border border-danger-800 bg-danger-950 p-3 text-sm text-danger-300">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <template v-else-if="data">
      <header class="mt-2 flex items-start justify-between gap-4 flex-wrap">
        <div class="min-w-0">
          <h1 class="text-2xl font-semibold text-slate-100">{{ $t('superadmin.companyBilling.title') }}</h1>
          <p class="mt-1 text-sm text-slate-400">{{ $t('superadmin.companyBilling.subtitle') }}</p>
          <p class="mt-2 text-xs text-slate-500">
            <span class="font-medium text-slate-300">{{ data.name }}</span>
            <span class="mx-1.5 text-slate-600">·</span>
            <span class="font-mono">{{ data.slug }}</span>
          </p>
        </div>
        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1"
          :class="data.status === 'ACTIVE'
            ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
            : 'bg-amber-500/10 text-amber-300 ring-amber-500/30'"
        >
          <span class="size-1.5 rounded-full" :class="data.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'" />
          {{ data.status }}
        </span>
      </header>

      <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Plan snapshot (read-only) -->
        <section class="lg:col-span-1">
          <div class="mb-3">
            <h2 class="text-base font-semibold text-slate-100">{{ $t('superadmin.companyBilling.planTitle') }}</h2>
            <p class="mt-0.5 text-xs text-slate-500">{{ $t('superadmin.companyBilling.planSubtitle') }}</p>
          </div>
          <PlanCard :plan="data.planDetails" dark />
        </section>

        <!-- Billing controls + history -->
        <div class="lg:col-span-2">
          <SuperadminBillingCard
            :tenant-id="data.id"
            :tenant-name="data.name"
            :plan-summary="`${data.planDetails.displayName} · ${data.planDetails.currency} ${data.planDetails.monthlyPrice}/mo`"
          />
        </div>
      </div>
    </template>
  </div>
</template>
