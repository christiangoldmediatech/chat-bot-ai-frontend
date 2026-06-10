<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { CompanyDetail, Plan, TenantStatus } from '~/types/company'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const companiesApi = useCompanies()
const id = route.params.id as string

const data = ref<CompanyDetail | null>(null)
const name = ref('')
const plan = ref<Plan>('FREE')
const status = ref<TenantStatus>('ACTIVE')
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const planOptions = computed<{ value: Plan, label: string, description: string }[]>(() => [
  { value: 'FREE', label: t('superadmin.companyEdit.planFreeLabel'), description: t('superadmin.companyEdit.planFreeDesc') },
  { value: 'PRO', label: t('superadmin.companyEdit.planProLabel'), description: t('superadmin.companyEdit.planProDesc') },
  { value: 'ENTERPRISE', label: t('superadmin.companyEdit.planEnterpriseLabel'), description: t('superadmin.companyEdit.planEnterpriseDesc') },
])
const statusOptions = computed<{ value: TenantStatus, label: string, description: string }[]>(() => [
  { value: 'ACTIVE', label: t('superadmin.companyEdit.statusActive'), description: t('superadmin.companyEdit.statusActiveDesc') },
  { value: 'SUSPENDED', label: t('superadmin.companyEdit.statusSuspended'), description: t('superadmin.companyEdit.statusSuspendedDesc') },
])

const isDirty = computed(() => {
  if (!data.value) return false
  return name.value !== data.value.name
    || plan.value !== data.value.plan
    || status.value !== data.value.status
})

function onDiscard(): void {
  if (!data.value) return
  name.value = data.value.name
  plan.value = data.value.plan
  status.value = data.value.status
  success.value = null
  error.value = null
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await companiesApi.get(id)
    name.value = data.value.name
    plan.value = data.value.plan
    status.value = data.value.status
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
    const updated = await companiesApi.update(id, {
      name: name.value,
      plan: plan.value,
      status: status.value,
    })
    // Refresh the snapshot so isDirty/Discard work against the new baseline.
    if (data.value) {
      data.value = { ...data.value, name: updated.name, plan: updated.plan, status: updated.status }
    }
    success.value = t('superadmin.companyEdit.successMessage')
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

async function onCancel(): Promise<void> {
  await router.replace(`/superadmin/companies/${id}`)
}

await load()
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${id}`" class="text-sm text-slate-400 hover:text-slate-200">{{ $t('superadmin.companyEdit.back') }}</NuxtLink>
    <div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
        <span class="size-1.5 rounded-full bg-indigo-400" />
        {{ $t('superadmin.companyEdit.tenantKicker') }}
      </span>
      <h1 class="text-2xl font-semibold text-slate-100 tracking-tight">{{ $t('superadmin.companyEdit.title') }}</h1>
    </div>
    <p class="text-slate-400 text-sm mt-1 max-w-2xl">
      {{ $t('superadmin.companyEdit.subtitle') }}
    </p>

    <p v-if="error" class="mt-4 max-w-2xl rounded-2xl border border-danger-800 bg-danger-950/80 p-3 text-sm text-danger-300">
      {{ error }}
    </p>
    <p v-if="success" class="mt-4 max-w-2xl rounded-2xl border border-emerald-800 bg-emerald-950/80 p-3 text-sm text-emerald-300">
      {{ success }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <template v-else-if="data">
      <!-- Identity snapshot card -->
      <section class="mt-6 max-w-2xl rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-5">
        <div class="flex items-start gap-3">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-semibold text-xl ring-1 ring-slate-700">
            {{ data.name.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-base font-semibold text-slate-100 truncate">{{ data.name }}</p>
            <p class="text-xs text-slate-500 font-mono truncate">{{ data.slug }}</p>
          </div>
          <div class="hidden sm:flex flex-col items-end gap-1">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1"
              :class="data.status === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 ring-amber-500/30'"
            >
              <span class="size-1.5 rounded-full" :class="data.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'" />
              {{ data.status === 'ACTIVE' ? $t('superadmin.companyEdit.statusActive') : $t('superadmin.companyEdit.statusSuspended') }}
            </span>
            <span class="text-[10px] uppercase tracking-wider font-medium text-slate-500">{{ $t('superadmin.companyEdit.currentPlanLabel', { plan: data.plan }) }}</span>
          </div>
        </div>
      </section>

      <form class="mt-4 max-w-2xl space-y-5" @submit.prevent="onSubmit">
        <!-- ──────────────────────────────────────────────────────────────
             SECTION 1 — Identity (name + immutable slug)
        ─────────────────────────────────────────────────────────────── -->
        <section class="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6 space-y-5">
          <header class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-indigo-300" aria-hidden="true">
                <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
                <line x1="9" y1="9" x2="9" y2="9" />
                <line x1="9" y1="13" x2="9" y2="13" />
                <line x1="9" y1="17" x2="9" y2="17" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-100">{{ $t('superadmin.companyEdit.sectionIdentity') }}</h2>
              <p class="text-xs text-slate-500 mt-0.5">{{ $t('superadmin.companyEdit.sectionIdentityHelp') }}</p>
            </div>
          </header>

          <div>
            <label class="block text-sm font-medium text-slate-300">{{ $t('superadmin.companyEdit.tenantName') }}</label>
            <input
              v-model="name"
              type="text"
              required
              minlength="2"
              maxlength="120"
              class="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300">
              {{ $t('superadmin.companyEdit.tenantSlug') }}
              <span class="ml-1 inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-700 normal-case tracking-normal">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {{ $t('superadmin.companyEdit.slugReadOnly') }}
              </span>
            </label>
            <div class="mt-1 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-400 font-mono select-all">
              {{ data.slug }}
            </div>
            <p class="mt-1 text-xs text-slate-500">{{ $t('superadmin.companyEdit.slugHelp') }}</p>
          </div>
        </section>

        <!-- ──────────────────────────────────────────────────────────────
             SECTION 2 — Plan (billing tier)
        ─────────────────────────────────────────────────────────────── -->
        <section class="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6 space-y-4">
          <header class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-amber-300" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-100">{{ $t('superadmin.companyEdit.sectionPlan') }}</h2>
              <p class="text-xs text-slate-500 mt-0.5">{{ $t('superadmin.companyEdit.sectionPlanHelp') }}</p>
            </div>
          </header>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label
              v-for="p in planOptions"
              :key="p.value"
              class="relative cursor-pointer rounded-xl ring-1 transition px-3 py-3"
              :class="plan === p.value
                ? 'bg-amber-500/10 ring-amber-500/40'
                : 'bg-slate-950 ring-slate-800 hover:ring-slate-700'"
            >
              <input v-model="plan" :value="p.value" type="radio" class="sr-only" :name="'plan'">
              <div class="flex items-start justify-between gap-2">
                <span class="text-sm font-semibold" :class="plan === p.value ? 'text-amber-200' : 'text-slate-200'">{{ p.label }}</span>
                <span
                  v-if="plan === p.value"
                  class="flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-500"
                  aria-hidden="true"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-2.5 text-slate-900">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span v-else class="size-4 shrink-0 rounded-full border border-slate-700" aria-hidden="true" />
              </div>
              <p class="mt-1 text-[11px] text-slate-500">{{ p.description }}</p>
            </label>
          </div>
        </section>

        <!-- ──────────────────────────────────────────────────────────────
             SECTION 3 — Access status
        ─────────────────────────────────────────────────────────────── -->
        <section class="rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 p-6 space-y-4">
          <header class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-emerald-400" aria-hidden="true">
                <path d="M9 12l2 2 4-4" />
                <path d="M12 2L4 7v5a10 10 0 0 0 8 9 10 10 0 0 0 8-9V7l-8-5z" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-100">{{ $t('superadmin.companyEdit.sectionAccess') }}</h2>
              <p class="text-xs text-slate-500 mt-0.5">{{ $t('superadmin.companyEdit.sectionAccessHelp') }}</p>
            </div>
          </header>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              v-for="s in statusOptions"
              :key="s.value"
              class="relative cursor-pointer rounded-xl ring-1 transition px-3 py-3"
              :class="status === s.value
                ? (s.value === 'ACTIVE' ? 'bg-emerald-500/10 ring-emerald-500/40' : 'bg-amber-500/10 ring-amber-500/40')
                : 'bg-slate-950 ring-slate-800 hover:ring-slate-700'"
            >
              <input v-model="status" :value="s.value" type="radio" class="sr-only" :name="'status'">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span
                    class="size-2 rounded-full"
                    :class="s.value === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'"
                    aria-hidden="true"
                  />
                  <span
                    class="text-sm font-semibold"
                    :class="status === s.value
                      ? (s.value === 'ACTIVE' ? 'text-emerald-200' : 'text-amber-200')
                      : 'text-slate-200'"
                  >
                    {{ s.label }}
                  </span>
                </div>
                <span
                  v-if="status === s.value"
                  class="flex size-4 shrink-0 items-center justify-center rounded-full"
                  :class="s.value === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'"
                  aria-hidden="true"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-2.5 text-slate-900">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span v-else class="size-4 shrink-0 rounded-full border border-slate-700" aria-hidden="true" />
              </div>
              <p class="mt-1 text-[11px] text-slate-500">{{ s.description }}</p>
            </label>
          </div>

          <div v-if="status === 'SUSPENDED'" class="flex items-start gap-2 rounded-xl bg-amber-500/5 ring-1 ring-amber-500/20 px-3 py-2.5 text-xs text-amber-200/90">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 mt-0.5 shrink-0 text-amber-400" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p class="leading-relaxed">
              {{ $t('superadmin.companyEdit.suspendedWarningBefore') }}<strong class="font-semibold">{{ $t('superadmin.companyEdit.suspendedWarningEmph') }}</strong>{{ $t('superadmin.companyEdit.suspendedWarningAfter') }}
            </p>
          </div>
        </section>

        <!-- Action bar -->
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition"
            :disabled="saving || !isDirty"
            @click="onDiscard"
          >
            {{ $t('superadmin.companyEdit.discard') }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
            @click="onCancel"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="submit"
            class="rounded-xl bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition"
            :disabled="saving || !isDirty || !name"
          >
            {{ saving ? $t('superadmin.companyEdit.saving') : $t('superadmin.companyEdit.saveChanges') }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
