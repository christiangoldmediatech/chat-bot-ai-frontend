<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Tenant } from '~/types/company'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const { t } = useI18n()
const tenant = useTenant()

const data = ref<Tenant | null>(null)
const name = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await tenant.me()
    name.value = data.value.name
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onSubmit(): Promise<void> {
  if (!data.value) return
  saving.value = true
  error.value = null
  success.value = null
  try {
    data.value = await tenant.update({ name: name.value })
    success.value = t('admin.company.successMessage')
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

await load()
</script>

<template>
  <div>
    <!-- Page header -->
    <header>
      <h1 class="text-2xl font-semibold tracking-tight">{{ $t('admin.company.title') }}</h1>
      <p class="text-slate-500 mt-1 text-sm max-w-2xl">
        {{ $t('admin.company.subtitle') }}
      </p>
    </header>

    <p v-if="error" class="mt-4 max-w-3xl rounded-2xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <p v-if="success" class="mt-4 max-w-3xl rounded-2xl border border-success-200 bg-success-50/80 p-3 text-sm text-success-700">
      {{ success }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <template v-else-if="data">
      <!-- Identity card with avatar + read-only quick facts -->
      <section class="mt-6 max-w-3xl rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6">
        <div class="flex items-start gap-4">
          <div class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-semibold text-2xl ring-1 ring-white/40 shadow-inner">
            {{ data.name.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-lg font-semibold text-slate-900 truncate">{{ data.name }}</h2>
            <p class="text-sm text-slate-500 font-mono truncate">{{ data.slug }}</p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <!-- Plan pill -->
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1"
                :class="data.plan === 'ENTERPRISE'
                  ? 'bg-indigo-50 text-indigo-700 ring-indigo-200'
                  : data.plan === 'PRO'
                    ? 'bg-primary-50 text-primary-700 ring-primary-200'
                    : 'bg-slate-100 text-slate-600 ring-slate-200'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {{ data.plan }}
              </span>
              <!-- Status pill -->
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1"
                :class="data.status === 'ACTIVE'
                  ? 'bg-success-50 text-success-700 ring-success-200'
                  : 'bg-amber-50 text-amber-700 ring-amber-200'"
              >
                <span class="size-1.5 rounded-full" :class="data.status === 'ACTIVE' ? 'bg-success-500' : 'bg-amber-500'" />
                {{ data.status === 'ACTIVE' ? $t('admin.company.statusActive') : $t('admin.company.statusSuspended') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Read-only quick facts grid -->
        <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="rounded-xl bg-slate-50/80 ring-1 ring-slate-200/70 px-3 py-2.5">
            <p class="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('admin.company.slugLabel') }}</p>
            <p class="mt-0.5 text-sm font-mono text-slate-700 truncate">{{ data.slug }}</p>
          </div>
          <div class="rounded-xl bg-slate-50/80 ring-1 ring-slate-200/70 px-3 py-2.5">
            <p class="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('admin.company.planLabel') }}</p>
            <p class="mt-0.5 text-sm font-medium text-slate-700">{{ data.plan }}</p>
          </div>
          <div class="rounded-xl bg-slate-50/80 ring-1 ring-slate-200/70 px-3 py-2.5">
            <p class="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{{ $t('admin.company.statusLabel') }}</p>
            <p class="mt-0.5 text-sm font-medium text-slate-700">{{ data.status === 'ACTIVE' ? $t('admin.company.statusActive') : $t('admin.company.statusSuspended') }}</p>
          </div>
        </div>

        <!-- Helper: who manages plan/status -->
        <div class="mt-4 flex items-start gap-2 rounded-xl bg-primary-50/60 ring-1 ring-primary-100 px-3 py-2.5 text-xs text-primary-900/80">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5 mt-0.5 shrink-0 text-primary-600" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p class="leading-relaxed">
            {{ $t('admin.company.platformNote') }}
          </p>
        </div>
      </section>

      <!-- Editable details -->
      <form class="mt-4 max-w-3xl rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6 space-y-5" @submit.prevent="onSubmit">
        <header class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 ring-1 ring-primary-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-primary-600" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.company.editableTitle') }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.company.editableSubtitle') }}</p>
          </div>
        </header>

        <div>
          <label for="name" class="block text-sm font-medium text-slate-700">{{ $t('admin.company.companyName') }}</label>
          <input
            id="name"
            v-model="name"
            type="text"
            required
            minlength="2"
            :placeholder="$t('admin.company.companyNamePlaceholder')"
            class="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
          <p class="mt-1 text-xs text-slate-500">{{ $t('admin.company.companyNameHelp') }}</p>
        </div>

        <div class="pt-2 flex items-center justify-end gap-2 border-t border-slate-200/70">
          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
            :disabled="saving || name === data.name"
            @click="name = data.name"
          >
            {{ $t('admin.company.discard') }}
          </button>
          <button
            type="submit"
            class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 shadow-glass transition"
            :disabled="saving || !name || name === data.name"
          >
            {{ saving ? $t('common.saving') : $t('admin.company.saveChanges') }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
