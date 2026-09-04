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

const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const SUPPORTED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024

function onPickFile(): void {
  fileInput.value?.click()
}

function onFileChange(evt: Event): void {
  const target = evt.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  if (!SUPPORTED_MIMES.has(file.type)) {
    error.value = 'Formato no soportado. Usa jpeg, png o webp.'
    return
  }
  if (file.size > MAX_BYTES) {
    error.value = 'La imagen supera los 5 MB.'
    return
  }
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  error.value = null
}

function clearImage(): void {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = null
  imageFile.value = null
}

onBeforeUnmount(() => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
})

async function onSubmit(input: CreateServiceInput): Promise<void> {
  saving.value = true
  error.value = null
  try {
    const created = await services.create(botId, input)
    if (imageFile.value) {
      try {
        await services.uploadImage(botId, created.id, imageFile.value)
      } catch (uploadErr) {
        error.value = (uploadErr as ApiError).message
      }
    }
    await router.push(`/superadmin/companies/${tenantId}/bots/${botId}/services`)
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
          <img
            v-if="imagePreview"
            :src="imagePreview"
            alt=""
            class="size-full object-cover"
          >
          <span v-else class="text-[10px] text-slate-400 uppercase tracking-wider text-center px-1">
            {{ $t('admin.services.noImage') }}
          </span>
        </div>
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              @click="onPickFile"
            >
              {{ imageFile ? $t('admin.services.replaceImage') : $t('admin.services.chooseImage') }}
            </button>
            <button
              v-if="imageFile"
              type="button"
              class="text-xs text-slate-500 hover:text-slate-700"
              @click="clearImage"
            >
              {{ $t('common.cancel') }}
            </button>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="onFileChange"
          >
          <span class="text-[10px] text-slate-400">jpeg / png / webp — máx 5 MB</span>
          <span v-if="imageFile" class="text-[10px] text-emerald-700">
            ✓ {{ $t('admin.services.pendingUpload') }}
          </span>
        </div>
      </div>
    </div>

    <div class="mt-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl p-5">
      <ServiceForm :saving="saving" @submit="onSubmit" />
    </div>
  </div>
</template>
