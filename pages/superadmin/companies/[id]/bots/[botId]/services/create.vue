<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { CreateServiceInput } from '~/types/service'

definePageMeta({ layout: 'superadmin', middleware: 'superadmin-auth' })

const route = useRoute()
const router = useRouter()
const tenantId = String(route.params.id)
const botId = String(route.params.botId)
const services = useServices(tenantId)

const saving = ref(false)
const error = ref<string | null>(null)

async function onSubmit(input: CreateServiceInput): Promise<void> {
  saving.value = true
  error.value = null
  try {
    const created = await services.create(botId, input)
    await router.push(
      `/superadmin/companies/${tenantId}/bots/${botId}/services/${created.id}/edit`,
    )
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <NuxtLink :to="`/superadmin/companies/${tenantId}/bots/${botId}/services`" class="text-xs text-slate-500 hover:text-slate-900">
      ← {{ $t('admin.services.title') }}
    </NuxtLink>
    <h1 class="mt-2 text-2xl font-semibold tracking-tight">{{ $t('admin.services.createTitle') }}</h1>
    <p class="text-slate-500 text-sm mt-1">{{ $t('admin.services.createSubtitle') }}</p>
    <p v-if="error" class="mt-4 rounded-2xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>
    <div class="mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl p-5">
      <ServiceForm :saving="saving" @submit="onSubmit" />
    </div>
  </div>
</template>
