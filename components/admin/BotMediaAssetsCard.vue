<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { MediaAsset, MediaType } from '~/types/media-asset'

const props = defineProps<{
  botId: string
  tenantId?: string
}>()

const assets = useMediaAssets(props.tenantId)

const items = ref<MediaAsset[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const removing = ref<string | null>(null)

// File upload form
const uploadOpen = ref(false)
const uploading = ref(false)
const uploadError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const fileKey = ref('')
const fileDescription = ref('')

// Location form
const locationOpen = ref(false)
const creatingLocation = ref(false)
const locationError = ref<string | null>(null)
const locKey = ref('')
const locDescription = ref('')
const locLatitude = ref<number | null>(null)
const locLongitude = ref<number | null>(null)
const locName = ref('')
const locAddress = ref('')

const isSuperadmin = computed(() => Boolean(props.tenantId))

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    items.value = await assets.listForBot(props.botId)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

function suggestKeyFromFilename(name: string): string {
  // lowercase, replace non-allowed chars with dash, collapse repeats.
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function onFilePick(ev: Event): void {
  const target = ev.target as HTMLInputElement
  const picked = target.files?.[0] ?? null
  file.value = picked
  if (picked && !fileKey.value) {
    fileKey.value = suggestKeyFromFilename(picked.name)
  }
}

function resetUploadForm(): void {
  file.value = null
  fileKey.value = ''
  fileDescription.value = ''
  uploadError.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function resetLocationForm(): void {
  locKey.value = ''
  locDescription.value = ''
  locLatitude.value = null
  locLongitude.value = null
  locName.value = ''
  locAddress.value = ''
  locationError.value = null
}

async function onUpload(): Promise<void> {
  if (!file.value) {
    uploadError.value = 'Pick a file first.'
    return
  }
  if (!fileKey.value.trim() || !fileDescription.value.trim()) {
    uploadError.value = 'Key and description are required.'
    return
  }
  uploading.value = true
  uploadError.value = null
  try {
    const created = await assets.uploadFile(props.botId, file.value, {
      key: fileKey.value.trim(),
      description: fileDescription.value.trim(),
    })
    items.value = [created, ...items.value]
    resetUploadForm()
    uploadOpen.value = false
  } catch (err) {
    uploadError.value = (err as ApiError).message
  } finally {
    uploading.value = false
  }
}

async function onCreateLocation(): Promise<void> {
  if (!locKey.value.trim() || !locDescription.value.trim()) {
    locationError.value = 'Key and description are required.'
    return
  }
  if (locLatitude.value === null || locLongitude.value === null) {
    locationError.value = 'Latitude and longitude are required.'
    return
  }
  creatingLocation.value = true
  locationError.value = null
  try {
    const created = await assets.createLocation(props.botId, {
      key: locKey.value.trim(),
      description: locDescription.value.trim(),
      latitude: locLatitude.value,
      longitude: locLongitude.value,
      ...(locName.value.trim() ? { name: locName.value.trim() } : {}),
      ...(locAddress.value.trim() ? { address: locAddress.value.trim() } : {}),
    })
    items.value = [created, ...items.value]
    resetLocationForm()
    locationOpen.value = false
  } catch (err) {
    locationError.value = (err as ApiError).message
  } finally {
    creatingLocation.value = false
  }
}

async function onRemove(asset: MediaAsset): Promise<void> {
  removing.value = asset.id
  try {
    await assets.remove(props.botId, asset.id)
    items.value = items.value.filter((a) => a.id !== asset.id)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    removing.value = null
  }
}

function formatBytes(b: number): string {
  if (b === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)))
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function typePill(t: MediaType): { label: string; classes: string } {
  switch (t) {
    case 'IMAGE':
      return { label: 'Imagen', classes: 'bg-sky-50 text-sky-700 ring-sky-200' }
    case 'DOCUMENT':
      return { label: 'Documento', classes: 'bg-amber-50 text-amber-700 ring-amber-200' }
    case 'VIDEO':
      return { label: 'Video', classes: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200' }
    case 'AUDIO':
      return { label: 'Audio', classes: 'bg-teal-50 text-teal-700 ring-teal-200' }
    case 'VOICE':
      return { label: 'Nota de voz', classes: 'bg-teal-50 text-teal-700 ring-teal-200' }
    case 'STICKER':
      return { label: 'Sticker', classes: 'bg-pink-50 text-pink-700 ring-pink-200' }
    case 'LOCATION':
      return { label: 'Ubicación', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
  }
}

function locationCoords(asset: MediaAsset): string | null {
  const m = asset.metadata ?? {}
  const lat = (m as { latitude?: number }).latitude
  const lng = (m as { longitude?: number }).longitude
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-slate-900">Recursos multimedia</h2>
        <p class="text-xs text-slate-500 mt-1">
          Sube imágenes, PDFs, videos, audios o registra ubicaciones que el bot puede mandar de forma nativa por WhatsApp.
          El modelo elige por <code class="font-mono bg-slate-100 px-1 rounded">key</code> según la descripción.
        </p>
      </div>
      <button
        v-if="!loading"
        type="button"
        class="shrink-0 text-xs text-slate-500 hover:text-slate-700"
        @click="load"
      >
        Recargar
      </button>
    </div>

    <p v-if="error" class="mt-3 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
      {{ error }}
    </p>

    <!-- Action buttons -->
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 transition shadow-glass"
        @click="uploadOpen = !uploadOpen; if (uploadOpen) locationOpen = false"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
          <path d="M12 5v14" /><path d="M5 12h14" />
        </svg>
        Subir archivo
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        @click="locationOpen = !locationOpen; if (locationOpen) uploadOpen = false"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        Agregar ubicación
      </button>
      <span class="text-xs text-slate-500 ml-auto">
        Imágenes ≤ 5&nbsp;MB · PDFs ≤ 100&nbsp;MB · Audio/Video ≤ 16&nbsp;MB
      </span>
    </div>

    <!-- Upload file form -->
    <div
      v-if="uploadOpen"
      class="mt-4 rounded-2xl bg-white/80 ring-1 ring-slate-200/70 p-4 space-y-3"
    >
      <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Nuevo archivo</h3>

      <div>
        <label class="block text-xs font-medium text-slate-600 mb-1">Archivo</label>
        <input
          ref="fileInput"
          type="file"
          class="block w-full text-sm text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-800 file:cursor-pointer"
          accept="image/*,video/*,audio/*,application/pdf,.pdf"
          @change="onFilePick"
        >
        <p v-if="file" class="mt-1 text-xs text-slate-500">
          {{ file.name }} · {{ file.type || 'tipo desconocido' }} · {{ formatBytes(file.size) }}
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Key (identificador único)</label>
          <input
            v-model="fileKey"
            type="text"
            placeholder="ej. catalogo-primavera.pdf"
            class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
          <p class="mt-1 text-[11px] text-slate-500">Solo a-z, 0-9, punto, guion. El bot lo usa para referenciar este recurso.</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Descripción para el bot</label>
          <input
            v-model="fileDescription"
            type="text"
            placeholder="ej. Catálogo completo de productos primavera 2026"
            class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
          <p class="mt-1 text-[11px] text-slate-500">Esta línea le dice al bot cuándo usar este recurso.</p>
        </div>
      </div>

      <p v-if="uploadError" class="rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
        {{ uploadError }}
      </p>

      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          :disabled="uploading"
          @click="uploadOpen = false; resetUploadForm()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
          :disabled="uploading || !file"
          @click="onUpload"
        >
          <SpinnerInline v-if="uploading" class="!size-4" />
          {{ uploading ? 'Subiendo…' : 'Subir' }}
        </button>
      </div>
    </div>

    <!-- Location form -->
    <div
      v-if="locationOpen"
      class="mt-4 rounded-2xl bg-white/80 ring-1 ring-slate-200/70 p-4 space-y-3"
    >
      <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Nueva ubicación</h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Key</label>
          <input
            v-model="locKey"
            type="text"
            placeholder="ej. tienda-principal"
            class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Descripción para el bot</label>
          <input
            v-model="locDescription"
            type="text"
            placeholder="ej. Sucursal centro"
            class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Latitud</label>
          <input
            v-model.number="locLatitude"
            type="number"
            step="any"
            placeholder="-2.90055"
            class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Longitud</label>
          <input
            v-model.number="locLongitude"
            type="number"
            step="any"
            placeholder="-79.00453"
            class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Nombre del lugar (opcional)</label>
          <input
            v-model="locName"
            type="text"
            placeholder="ej. Tienda Centro"
            class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Dirección (opcional)</label>
          <input
            v-model="locAddress"
            type="text"
            placeholder="ej. Av. 9 de Octubre 123, Cuenca"
            class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
        </div>
      </div>

      <p v-if="locationError" class="rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
        {{ locationError }}
      </p>

      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          :disabled="creatingLocation"
          @click="locationOpen = false; resetLocationForm()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
          :disabled="creatingLocation"
          @click="onCreateLocation"
        >
          <SpinnerInline v-if="creatingLocation" class="!size-4" />
          {{ creatingLocation ? 'Guardando…' : 'Guardar ubicación' }}
        </button>
      </div>
    </div>

    <!-- List -->
    <SpinnerInline v-if="loading" class="mt-5" />

    <div v-else-if="items.length === 0" class="mt-5 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/70 p-6 text-center">
      <div class="mx-auto flex size-10 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-slate-400" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <p class="mt-3 text-sm font-medium text-slate-700">Sin recursos aún</p>
      <p class="mt-1 text-xs text-slate-500">Sube tu primer archivo o registra una ubicación para que el bot pueda enviar contenido nativo.</p>
    </div>

    <ul v-else class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <li
        v-for="a in items"
        :key="a.id"
        class="rounded-xl bg-white/90 ring-1 ring-slate-200/70 p-3 flex items-start gap-3 hover:ring-slate-300 transition"
      >
        <!-- Type chip with mini icon -->
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-lg ring-1"
          :class="typePill(a.mediaType).classes"
        >
          <!-- Icon switcher -->
          <svg v-if="a.mediaType === 'IMAGE' || a.mediaType === 'STICKER'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
          <svg v-else-if="a.mediaType === 'DOCUMENT'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          <svg v-else-if="a.mediaType === 'VIDEO'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
          <svg v-else-if="a.mediaType === 'AUDIO' || a.mediaType === 'VOICE'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
          <svg v-else-if="a.mediaType === 'LOCATION'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <code class="text-sm font-mono font-medium text-slate-900 truncate">{{ a.key }}</code>
            <span
              class="inline-flex items-center rounded-full ring-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              :class="typePill(a.mediaType).classes"
            >
              {{ typePill(a.mediaType).label }}
            </span>
            <span
              v-if="a.hasMetaCache"
              class="inline-flex items-center gap-1 rounded-full bg-success-50 ring-1 ring-success-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success-700"
              title="Meta tiene el archivo cacheado — el siguiente envío es instantáneo"
            >
              <span class="size-1.5 rounded-full bg-success-500" />
              Listo en Meta
            </span>
          </div>
          <p class="mt-1 text-xs text-slate-600 line-clamp-2">{{ a.description }}</p>
          <p class="mt-1 text-[11px] text-slate-400">
            <template v-if="a.mediaType === 'LOCATION'">
              {{ locationCoords(a) ?? '—' }}
            </template>
            <template v-else>
              {{ a.mimeType }} · {{ formatBytes(a.sizeBytes) }}
              <span v-if="a.originalFilename"> · {{ a.originalFilename }}</span>
            </template>
          </p>
        </div>

        <button
          type="button"
          class="shrink-0 text-xs text-danger-600 hover:text-danger-700 disabled:opacity-50"
          :disabled="removing === a.id"
          @click="onRemove(a)"
        >
          {{ removing === a.id ? '…' : 'Eliminar' }}
        </button>
      </li>
    </ul>

    <p v-if="isSuperadmin" class="mt-4 text-[11px] text-slate-400">
      Estás administrando los recursos de un bot ajeno como super-admin.
    </p>
  </section>
</template>
