<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { CompanyBot, CompanyDetail, CompanyUser } from '~/types/company'

definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const companiesApi = useCompanies()
const id = route.params.id as string
const bots = useBots(id)

const data = ref<CompanyDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const confirmingDelete = ref(false)
const confirmingDeleteBot = ref<CompanyBot | null>(null)
const resettingPasswordFor = ref<CompanyUser | null>(null)
const resetPasswordLoading = ref(false)
const resetPasswordError = ref<string | null>(null)
const resetPasswordSuccess = ref<string | null>(null)

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

async function onConfirmDelete(): Promise<void> {
  try {
    await companiesApi.remove(id)
    await router.replace('/superadmin/companies')
  } catch (err) {
    error.value = (err as ApiError).message
    confirmingDelete.value = false
  }
}

async function onConfirmDeleteBot(): Promise<void> {
  const target = confirmingDeleteBot.value
  if (!target || !data.value) return
  try {
    await bots.remove(target.id)
    data.value.bots = data.value.bots.filter((b) => b.id !== target.id)
    data.value.botCount = data.value.bots.length
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    confirmingDeleteBot.value = null
  }
}

async function onConfirmResetPassword(newPassword: string): Promise<void> {
  const target = resettingPasswordFor.value
  if (!target) return
  resetPasswordLoading.value = true
  resetPasswordError.value = null
  try {
    await companiesApi.resetUserPassword(id, target.id, newPassword)
    resetPasswordSuccess.value = t('superadmin.companyDetail.users.passwordUpdated', { email: target.email })
    resettingPasswordFor.value = null
    setTimeout(() => {
      resetPasswordSuccess.value = null
    }, 4000)
  } catch (err) {
    resetPasswordError.value = (err as ApiError).message
  } finally {
    resetPasswordLoading.value = false
  }
}

function onCancelResetPassword(): void {
  if (resetPasswordLoading.value) return
  resettingPasswordFor.value = null
  resetPasswordError.value = null
}

await load()
</script>

<template>
  <div>
    <NuxtLink to="/superadmin/companies" class="text-sm text-slate-400 hover:text-slate-200">{{ $t('superadmin.companyDetail.back') }}</NuxtLink>

    <p v-if="error" class="mt-4 rounded-md border border-danger-800 bg-danger-950 p-3 text-sm text-danger-300">
      {{ error }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" tone="dark" />

    <template v-else-if="data">
      <header class="mt-2 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            {{ data.name }}
            <span
              class="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
              :class="
                data.status === 'ACTIVE'
                  ? 'bg-success-950 text-success-300 border-success-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              "
            >
              {{ data.status }}
            </span>
          </h1>
          <p class="mt-1 text-sm text-slate-500 font-mono">{{ data.slug }}</p>
        </div>

        <div class="flex gap-2">
          <NuxtLink
            :to="`/superadmin/companies/${data.id}/customers`"
            class="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            {{ $t('superadmin.companyDetail.sections.navCustomers') }}
          </NuxtLink>
          <NuxtLink
            :to="`/superadmin/companies/${data.id}/meetings`"
            class="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            {{ $t('superadmin.companyDetail.sections.navMeetings') }}
          </NuxtLink>
          <NuxtLink
            :to="`/superadmin/companies/${data.id}/cases`"
            class="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            {{ $t('superadmin.companyDetail.sections.navCases') }}
          </NuxtLink>
          <NuxtLink
            :to="`/superadmin/companies/${data.id}/edit`"
            class="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            {{ $t('common.edit') }}
          </NuxtLink>
          <button
            type="button"
            class="rounded-md border border-danger-800 px-3 py-1.5 text-sm text-danger-300 hover:bg-danger-950"
            @click="confirmingDelete = true"
          >
            {{ $t('common.delete') }}
          </button>
        </div>
      </header>

      <div class="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SuperadminStatCard :label="$t('superadmin.companyDetail.stats.plan')" :value="data.planDetails.displayName" />
        <SuperadminStatCard :label="$t('superadmin.companyDetail.stats.users')" :value="data.userCount" />
        <SuperadminStatCard :label="$t('superadmin.companyDetail.stats.bots')" :value="data.botCount" />
        <SuperadminStatCard :label="$t('superadmin.companyDetail.stats.conversations')" :value="data.conversationCount" />
      </div>

      <!-- Plan details card: features + price, read-only snapshot here.
           Edition lives in /edit. -->
      <div class="mt-6 max-w-2xl">
        <PlanCard :plan="data.planDetails" dark />
      </div>

      <section class="mt-8">
        <h2 class="text-base font-semibold text-slate-200">{{ $t('superadmin.companyDetail.users.title') }}</h2>
        <p
          v-if="resetPasswordSuccess"
          class="mt-2 rounded-md border border-success-800 bg-success-950 px-3 py-2 text-xs text-success-300"
        >
          {{ resetPasswordSuccess }}
        </p>
        <div class="mt-3 overflow-x-auto rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg">
          <table class="w-full text-sm">
            <thead class="bg-slate-950 text-slate-400">
              <tr>
                <th class="text-left font-medium px-4 py-3">{{ $t('superadmin.companyDetail.users.tableEmail') }}</th>
                <th class="text-left font-medium px-4 py-3">{{ $t('superadmin.companyDetail.users.tableRole') }}</th>
                <th class="text-left font-medium px-4 py-3">{{ $t('superadmin.companyDetail.users.tableCreated') }}</th>
                <th class="text-right font-medium px-4 py-3">{{ $t('superadmin.companyDetail.users.tableActions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="data.users.length === 0">
                <td colspan="4" class="px-4 py-6 text-center text-slate-500">{{ $t('superadmin.companyDetail.noUsers') }}</td>
              </tr>
              <tr
                v-for="u in data.users"
                v-else
                :key="u.id"
                class="border-t border-slate-800"
              >
                <td class="px-4 py-3 text-slate-100">{{ u.email }}</td>
                <td class="px-4 py-3 text-slate-300">{{ u.role }}</td>
                <td class="px-4 py-3 text-slate-400 text-xs">{{ new Date(u.createdAt).toLocaleString() }}</td>
                <td class="px-4 py-3 text-right">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-md border border-amber-700/60 bg-amber-500/5 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/10 hover:border-amber-600 transition"
                    @click="resettingPasswordFor = u; resetPasswordError = null"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {{ $t('superadmin.companyDetail.users.resetPassword') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="mt-6">
        <div class="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 class="text-base font-semibold text-slate-200">{{ $t('superadmin.companyDetail.bots.title') }}</h2>
            <p class="text-xs text-slate-500 mt-1 max-w-xl">
              {{ $t('superadmin.companyDetail.bots.description') }}
              <span class="font-medium text-emerald-400">{{ $t('superadmin.companyDetail.bots.descWhatsapp') }}</span>,
              <span class="font-medium text-indigo-300">{{ $t('superadmin.companyDetail.bots.descAgent') }}</span>,
              <span class="font-medium text-amber-300">{{ $t('superadmin.companyDetail.bots.descDocuments') }}</span>,
              <span class="font-medium text-sky-300">{{ $t('superadmin.companyDetail.bots.descCalendar') }}</span>.
            </p>
          </div>
          <NuxtLink
            :to="`/superadmin/companies/${id}/bots/create`"
            class="rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-100 transition"
          >
            {{ $t('superadmin.companyDetail.addBot') }}
          </NuxtLink>
        </div>

        <!-- Empty state -->
        <div v-if="data.bots.length === 0" class="mt-3 rounded-2xl bg-slate-900/70 ring-1 ring-slate-700/50 p-8 text-center">
          <p class="text-sm text-slate-400">{{ $t('superadmin.companyDetail.noBots') }}</p>
        </div>

        <!-- Cards grid: two clearly-labeled config entry points per bot. -->
        <div v-else class="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <article
            v-for="b in data.bots"
            :key="b.id"
            class="group relative flex flex-col rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5 hover:ring-slate-600 transition"
          >
            <!-- Header: avatar + name + status -->
            <header class="flex items-start gap-3">
              <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-semibold text-base ring-1 ring-slate-700 shadow-inner">
                {{ b.name.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <NuxtLink
                  :to="`/superadmin/companies/${id}/bots/${b.id}`"
                  class="block font-semibold text-slate-100 hover:underline truncate"
                >
                  {{ b.name }}
                </NuxtLink>
                <p v-if="b.phoneNumber" class="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3 text-emerald-400" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span class="font-mono">{{ b.phoneNumber }}</span>
                </p>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ $t('superadmin.companyDetail.bots.createdOn', { date: new Date(b.createdAt).toLocaleDateString() }) }}
                </p>
              </div>
              <span
                class="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1"
                :class="b.isActive
                  ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 ring-slate-700'"
              >
                <span class="size-1.5 rounded-full" :class="b.isActive ? 'bg-emerald-400' : 'bg-slate-500'" />
                {{ b.isActive ? $t('superadmin.companyDetail.bots.active') : $t('superadmin.companyDetail.bots.inactive') }}
              </span>
            </header>

            <!-- Four config panels: deep-link straight into each setting bucket. -->
            <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- WhatsApp connection card -->
              <NuxtLink
                :to="`/superadmin/companies/${id}/bots/${b.id}/edit`"
                class="group/card flex items-start gap-3 rounded-xl bg-emerald-500/5 ring-1 ring-emerald-500/20 p-3 hover:bg-emerald-500/10 hover:ring-emerald-500/40 transition"
              >
                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 ring-1 ring-emerald-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4 text-emerald-400" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] uppercase tracking-wider font-semibold text-emerald-300">{{ $t('superadmin.companyDetail.bots.panels.whatsappLabel') }}</p>
                  <p class="mt-0.5 text-xs text-slate-300">{{ $t('superadmin.companyDetail.bots.panels.whatsappTitle') }}</p>
                  <p class="mt-0.5 text-[11px] text-slate-500">{{ $t('superadmin.companyDetail.bots.panels.whatsappHint') }}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-emerald-400 opacity-0 group-hover/card:opacity-100 self-center transition" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </NuxtLink>

              <!-- Agent behavior card -->
              <NuxtLink
                :to="`/superadmin/companies/${id}/bots/${b.id}/config`"
                class="group/card flex items-start gap-3 rounded-xl bg-indigo-500/5 ring-1 ring-indigo-500/20 p-3 hover:bg-indigo-500/10 hover:ring-indigo-500/40 transition"
              >
                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 ring-1 ring-indigo-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-indigo-300" aria-hidden="true">
                    <path d="M12 2a3 3 0 0 1 3 3v1.5a4.5 4.5 0 0 1 4.5 4.5V13a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4v-2a4.5 4.5 0 0 1 4.5-4.5V5a3 3 0 0 1 3-3z" />
                    <line x1="9" y1="13" x2="9" y2="13" />
                    <line x1="15" y1="13" x2="15" y2="13" />
                    <path d="M9 21v-4M15 21v-4" />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] uppercase tracking-wider font-semibold text-indigo-300">{{ $t('superadmin.companyDetail.bots.panels.agentLabel') }}</p>
                  <p class="mt-0.5 text-xs text-slate-300">{{ $t('superadmin.companyDetail.bots.panels.agentTitle') }}</p>
                  <p class="mt-0.5 text-[11px] text-slate-500">{{ $t('superadmin.companyDetail.bots.panels.agentHint') }}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-indigo-300 opacity-0 group-hover/card:opacity-100 self-center transition" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </NuxtLink>

              <!-- Documents (RAG) card -->
              <NuxtLink
                :to="`/superadmin/companies/${id}/bots/${b.id}#documents`"
                class="group/card flex items-start gap-3 rounded-xl bg-amber-500/5 ring-1 ring-amber-500/20 p-3 hover:bg-amber-500/10 hover:ring-amber-500/40 transition"
              >
                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 ring-1 ring-amber-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-amber-300" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="8" y1="13" x2="16" y2="13" />
                    <line x1="8" y1="17" x2="13" y2="17" />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] uppercase tracking-wider font-semibold text-amber-300">{{ $t('superadmin.companyDetail.bots.panels.documentsLabel') }}</p>
                  <p class="mt-0.5 text-xs text-slate-300">{{ $t('superadmin.companyDetail.bots.panels.documentsTitle') }}</p>
                  <p class="mt-0.5 text-[11px] text-slate-500">{{ $t('superadmin.companyDetail.bots.panels.documentsHint') }}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-amber-300 opacity-0 group-hover/card:opacity-100 self-center transition" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </NuxtLink>

              <!-- Google Calendar card -->
              <NuxtLink
                :to="`/superadmin/companies/${id}/bots/${b.id}#calendar`"
                class="group/card flex items-start gap-3 rounded-xl bg-sky-500/5 ring-1 ring-sky-500/20 p-3 hover:bg-sky-500/10 hover:ring-sky-500/40 transition"
              >
                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 ring-1 ring-sky-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-sky-300" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-[11px] uppercase tracking-wider font-semibold text-sky-300">{{ $t('superadmin.companyDetail.bots.panels.calendarLabel') }}</p>
                  <p class="mt-0.5 text-xs text-slate-300">{{ $t('superadmin.companyDetail.bots.panels.calendarTitle') }}</p>
                  <p class="mt-0.5 text-[11px] text-slate-500">{{ $t('superadmin.companyDetail.bots.panels.calendarHint') }}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-sky-300 opacity-0 group-hover/card:opacity-100 self-center transition" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </NuxtLink>
            </div>

            <!-- Footer actions -->
            <footer class="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-sm">
              <NuxtLink
                :to="`/superadmin/companies/${id}/bots/${b.id}`"
                class="inline-flex items-center gap-1.5 font-medium text-slate-200 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {{ $t('superadmin.companyDetail.bots.openDashboard') }}
              </NuxtLink>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-danger-400 hover:text-danger-300"
                @click="confirmingDeleteBot = b"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {{ $t('common.delete') }}
              </button>
            </footer>
          </article>
        </div>
      </section>

      <ConfirmDialog
        :open="confirmingDelete"
        :title="$t('superadmin.companyDetail.deleteCompanyConfirmTitle', { name: data.name })"
        :message="$t('superadmin.companyDetail.deleteCompanyConfirmMessage')"
        @cancel="confirmingDelete = false"
        @confirm="onConfirmDelete"
      />

      <ResetPasswordDialog
        :open="!!resettingPasswordFor"
        :user-email="resettingPasswordFor?.email ?? ''"
        :loading="resetPasswordLoading"
        :error="resetPasswordError"
        @cancel="onCancelResetPassword"
        @confirm="onConfirmResetPassword"
      />

      <ConfirmDialog
        :open="!!confirmingDeleteBot"
        :title="$t('superadmin.companyDetail.deleteBotConfirmTitle', { name: confirmingDeleteBot?.name ?? '' })"
        :message="$t('superadmin.companyDetail.deleteBotConfirmMessage')"
        :require-typed="confirmingDeleteBot?.name"
        :require-typed-label="$t('superadmin.companyDetail.deleteBotConfirmTyped')"
        :confirm-label="$t('superadmin.companyDetail.deleteBotConfirmAction')"
        @cancel="confirmingDeleteBot = null"
        @confirm="onConfirmDeleteBot"
      />
    </template>
  </div>
</template>
