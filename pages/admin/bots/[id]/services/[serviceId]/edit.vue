<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { CreateServiceInput, Service } from '~/types/service'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const botId = String(route.params.id)
const serviceId = String(route.params.serviceId)
const services = useServices()

const service = ref<Service | null>(null)
const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    service.value = await services.get(botId, serviceId)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onSubmit(input: CreateServiceInput): Promise<void> {
  if (!service.value) return
  saving.value = true
  error.value = null
  try {
    service.value = await services.update(botId, service.value.id, input)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

async function onPickImage(): Promise<void> {
  fileInput.value?.click()
}

async function onFileChange(evt: Event): Promise<void> {
  const target = evt.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !service.value) return
  uploading.value = true
  error.value = null
  try {
    service.value = await services.uploadImage(botId, service.value.id, file)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    uploading.value = false
    target.value = ''
  }
}

async function onDelete(): Promise<void> {
  if (!service.value) return
  try {
    await services.remove(botId, service.value.id)
    await router.push(`/admin/bots/${botId}/services`)
  } catch (err) {
    error.value = (err as ApiError).message
  }
}

const confirmingDelete = ref(false)

await load()
</script>

<template>
  <div class="max-w-2xl">
    <NuxtLink :to="`/admin/bots/${botId}/services`" class="text-xs text-slate-500 hover:text-slate-900">
      ← {{ $t('admin.services.title') }}
    </NuxtLink>

    <div v-if="loading" class="mt-6 text-slate-500 text-sm">{{ $t('common.loading') }}…</div>

    <template v-else-if="service">
      <div class="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">{{ service.name }}</h1>
          <p class="text-xs font-mono text-slate-500 mt-1">{{ service.slug }}</p>
        </div>
        <button
          type="button"
          class="text-xs font-medium text-danger-600 hover:text-danger-800"
          @click="confirmingDelete = true"
        >
          {{ $t('common.delete') }}
        </button>
      </div>

      <p v-if="error" class="mt-4 rounded-2xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">
        {{ error }}
      </p>

      <div class="mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl p-5">
        <h2 class="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          {{ $t('admin.services.imageSection') }}
        </h2>
        <p class="text-xs text-slate-500 mt-1">{{ $t('admin.services.imageHint') }}</p>
        <div class="mt-3 flex items-center gap-3">
          <div class="size-24 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
            <span v-if="!service.mediaAssetId" class="text-[10px] text-slate-400 uppercase tracking-wider">{{ $t('admin.services.noImage') }}</span>
            <span v-else class="text-[10px] text-emerald-700 uppercase tracking-wider">{{ $t('admin.services.imageSet') }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <button
              type="button"
              class="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              :disabled="uploading"
              @click="onPickImage"
            >
              {{ uploading ? $t('common.uploading') : $t('admin.services.chooseImage') }}
            </button>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="onFileChange"
            >
            <span class="text-[10px] text-slate-400">jpeg / png / webp</span>
          </div>
        </div>
      </div>

      <div class="mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl p-5">
        <ServiceForm :initial="service" :saving="saving" @submit="onSubmit" />
      </div>

      <ConfirmDialog
        :open="confirmingDelete"
        :title="$t('admin.services.deleteTitle')"
        :message="$t('admin.services.deleteDescription', { name: service.name })"
        :confirm-label="$t('common.delete')"
        tone="danger"
        @cancel="confirmingDelete = false"
        @confirm="onDelete"
      />
    </template>
  </div>
</template>
