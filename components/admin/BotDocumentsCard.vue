<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { DocumentContent, DocumentItem, DocumentStatus } from '~/types/document'

const props = defineProps<{
  botId: string
  tenantId?: string
}>()

const { t } = useI18n()
const docs = useDocuments(props.tenantId)
const tenant = useTenant()
const companies = useCompanies()

const items = ref<DocumentItem[]>([])
const loading = ref(true)
const uploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const removing = ref<string | null>(null)
const confirmingRemove = ref<DocumentItem | null>(null)

// El tope por bot lo dicta el backend (`planDetails.limits.documentsPerBot`).
// Empieza en `null` (= aún no sabemos) y se llena en `loadDocsLimit()`. Mientras
// es null no bloqueamos la UI — el backend sigue siendo el guardia final con
// HTTP 409 si se intenta pasar del cap. `null` también puede significar "sin
// cap" si en algún momento se introduce un plan ilimitado.
const maxDocuments = ref<number | null>(null)
const atLimit = computed(() =>
  maxDocuments.value === null ? false : items.value.length >= maxDocuments.value,
)
const viewing = ref<DocumentContent | null>(null)
const viewingMeta = ref<DocumentItem | null>(null)
const fetchingContent = ref<string | null>(null)
const viewError = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    items.value = await docs.listForBot(props.botId)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onFileChange(ev: Event): Promise<void> {
  const target = ev.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (atLimit.value) {
    // Doble guarda — el label ya está deshabilitado, pero si llegase a
    // dispararse igual (drag&drop futuro, etc.) mostramos el motivo.
    error.value = t('admin.documents.limitReached', { max: maxDocuments.value })
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  uploading.value = true
  error.value = null
  try {
    const created = await docs.upload(props.botId, file)
    items.value = [created, ...items.value]
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function askRemove(doc: DocumentItem): void {
  confirmingRemove.value = doc
}

async function onConfirmRemove(): Promise<void> {
  const doc = confirmingRemove.value
  if (!doc) return
  confirmingRemove.value = null
  removing.value = doc.id
  try {
    await docs.remove(doc.id, props.botId)
    items.value = items.value.filter((d) => d.id !== doc.id)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    removing.value = null
  }
}

async function onView(doc: DocumentItem): Promise<void> {
  if (doc.status !== 'READY') {
    viewError.value = t('admin.documents.stillProcessing', { status: doc.status.toLowerCase() })
    viewingMeta.value = doc
    viewing.value = null
    return
  }
  fetchingContent.value = doc.id
  viewError.value = null
  viewingMeta.value = doc
  viewing.value = null
  try {
    viewing.value = await docs.getContent(doc.id, props.botId)
  } catch (err) {
    viewError.value = (err as ApiError).message
  } finally {
    fetchingContent.value = null
  }
}

function closeViewer(): void {
  viewing.value = null
  viewingMeta.value = null
  viewError.value = null
}

// Lock body scroll while the viewer modal is open, and restore on close.
const isViewerOpen = computed(() => Boolean(viewingMeta.value))
watch(isViewerOpen, (open) => {
  if (!import.meta.client) return
  document.body.style.overflow = open ? 'hidden' : ''
})
onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

// Esc closes the modal.
onMounted(() => {
  if (!import.meta.client) return
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && isViewerOpen.value) closeViewer()
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})

function statusClass(s: DocumentStatus): string {
  return {
    PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
    READY: 'bg-success-50 text-success-700 border-success-200',
    ERROR: 'bg-danger-50 text-danger-700 border-danger-200',
  }[s]
}

// Trae el tope `documentsPerBot` del plan del tenant desde el backend. En la
// vista de admin (sin `tenantId` prop) consulta `/tenants/me`; en superadmin,
// baja por `/superadmin/companies/:id`. El frontend NO conoce los números —
// son responsabilidad del catálogo de planes en el backend (`plans.constants.ts`).
// Si la llamada falla mantenemos `null` (UI permisiva) y dejamos que el
// backend rechace con 409 si corresponde.
async function loadDocsLimit(): Promise<void> {
  try {
    const planDetails = props.tenantId
      ? (await companies.get(props.tenantId)).planDetails
      : (await tenant.me()).planDetails
    maxDocuments.value = planDetails?.limits?.documentsPerBot ?? null
  } catch {
    // No hard-fail: el backend sigue siendo la guardia dura.
  }
}

// Load inside onMounted (not top-level await) so the card UI shows up
// immediately with a spinner — even if the backend is unreachable or slow,
// the upload button and the empty-state remain visible and the user gets a
// clear error banner instead of a missing component.
onMounted(() => {
  void load()
  void loadDocsLimit()
})
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-sm font-semibold text-slate-900">{{ $t('admin.documents.cardTitle') }}</h2>
        <p class="text-xs text-slate-500 mt-1">
          {{ $t('admin.documents.cardDescription') }}
        </p>
      </div>
      <button
        v-if="!loading"
        type="button"
        class="text-xs text-slate-500 hover:text-slate-700"
        @click="load"
      >
        {{ $t('common.reload') }}
      </button>
    </div>

    <p v-if="error" class="mt-3 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
      {{ error }}
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <label
        class="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 shadow-glass transition"
        :class="(uploading || atLimit) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'"
        :aria-disabled="uploading || atLimit"
        :title="atLimit ? $t('admin.documents.limitReached', { max: maxDocuments }) : undefined"
      >
        <SpinnerInline v-if="uploading" class="!size-4" />
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
          <path d="M12 5v14" /><path d="M5 12h14" />
        </svg>
        <span>{{ uploading ? $t('common.uploading') : items.length === 0 ? $t('admin.documents.uploadButton') : $t('admin.documents.addAnotherButton') }}</span>
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          :disabled="uploading || atLimit"
          @change="onFileChange"
        >
      </label>

      <!-- Count pill -->
      <span
        class="inline-flex items-center gap-1 rounded-full bg-slate-100 ring-1 ring-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600"
      >
        <template v-if="maxDocuments !== null">
          {{ $t('admin.documents.countOfMax', { count: items.length, max: maxDocuments }) }}
        </template>
        <template v-else>
          {{ $t('admin.documents.countOnly', { count: items.length }) }}
        </template>
      </span>

      <span
        v-if="atLimit && maxDocuments !== null"
        class="inline-flex items-center gap-1 rounded-full bg-amber-50 ring-1 ring-amber-200 px-2.5 py-1 text-[11px] font-medium text-amber-700"
      >
        {{ $t('admin.documents.limitReached', { max: maxDocuments }) }}
      </span>
      <span
        v-else-if="items.length > 0"
        class="text-[11px] text-slate-500 ml-auto"
      >
        {{ $t('admin.documents.moreEqualsBetter') }}
      </span>
    </div>

    <SpinnerInline v-if="loading" class="mt-5" />

    <!-- Empty state matching the Media card aesthetic -->
    <div
      v-else-if="items.length === 0"
      class="mt-5 rounded-2xl bg-slate-50/80 ring-1 ring-slate-200/70 p-6 text-center"
    >
      <div class="mx-auto flex size-10 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-amber-600" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <p class="mt-3 text-sm font-medium text-slate-700">{{ $t('admin.documents.noDocuments') }}</p>
      <p class="mt-1 text-xs text-slate-500">{{ $t('admin.documents.cardDescription') }}</p>
    </div>

    <ul v-else class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <li
        v-for="d in items"
        :key="d.id"
        class="group rounded-xl bg-white/90 ring-1 ring-slate-200/70 p-3 flex items-start gap-3 hover:ring-slate-300 transition"
      >
        <!-- Document icon tile -->
        <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 ring-1 ring-amber-100 text-amber-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="13" y2="17" />
          </svg>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-slate-900 truncate">{{ d.fileName }}</span>
            <span
              class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              :class="statusClass(d.status)"
            >
              <span
                class="size-1.5 rounded-full"
                :class="{
                  'bg-blue-500 animate-pulse': d.status === 'PROCESSING',
                  'bg-success-500': d.status === 'READY',
                  'bg-danger-500': d.status === 'ERROR',
                }"
              />
              {{ d.status }}
            </span>
          </div>
          <p class="mt-1 text-[11px] text-slate-500">
            {{ d.fileType }} · {{ new Date(d.createdAt).toLocaleString() }}
            <span v-if="typeof d.chunkCount === 'number'"> · {{ d.chunkCount }} {{ $t('admin.documents.chunksLabel') }}</span>
          </p>
        </div>

        <!-- Icon-only actions -->
        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            class="inline-flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 transition"
            :disabled="fetchingContent === d.id"
            :title="fetchingContent === d.id ? $t('common.loading') : $t('admin.documents.view')"
            :aria-label="$t('admin.documents.view')"
            @click="onView(d)"
          >
            <SpinnerInline v-if="fetchingContent === d.id" class="!size-3.5" />
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            type="button"
            class="inline-flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-600 disabled:opacity-50 transition"
            :disabled="removing === d.id"
            :title="removing === d.id ? $t('common.deleting') : $t('common.delete')"
            :aria-label="$t('common.delete')"
            @click="askRemove(d)"
          >
            <SpinnerInline v-if="removing === d.id" class="!size-3.5" />
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </li>
    </ul>

    <!-- Viewer modal: full-screen dark reader for the document's reconstructed text.
         Teleported to <body> so it escapes ancestors with `backdrop-filter`
         (the parent card uses `backdrop-blur-xl`, which creates a containing
         block that would otherwise trap `position: fixed`). -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="viewingMeta"
          class="fixed inset-0 z-[100] bg-mist-light text-slate-900 flex flex-col"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('admin.documents.viewingAria', { filename: viewingMeta.fileName })"
        >
        <!-- Header (glass, matches the platform's admin header) -->
        <header class="shrink-0 border-b border-white/60 bg-white/70 backdrop-blur-xl">
          <div class="mx-auto flex max-w-5xl items-start justify-between gap-4 px-4 sm:px-6 py-4">
            <div class="flex items-start gap-3 min-w-0">
              <!-- File type icon -->
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-amber-600" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="13" y2="17" />
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="text-base sm:text-lg font-semibold text-slate-900 truncate">{{ viewingMeta.fileName }}</h3>
                <div class="mt-1 flex flex-wrap items-center gap-1.5">
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600 ring-1 ring-slate-200">
                    {{ viewingMeta.fileType }}
                  </span>
                  <span
                    v-if="viewingMeta.status === 'READY'"
                    class="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success-700 ring-1 ring-success-200"
                  >
                    <span class="size-1.5 rounded-full bg-success-500" />
                    {{ $t('admin.documents.statusReady') }}
                  </span>
                  <span
                    v-else-if="viewingMeta.status === 'PROCESSING'"
                    class="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-700 ring-1 ring-blue-200"
                  >
                    {{ $t('admin.documents.statusProcessing') }}
                  </span>
                  <span
                    v-else-if="viewingMeta.status === 'ERROR'"
                    class="inline-flex items-center rounded-full bg-danger-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-danger-700 ring-1 ring-danger-200"
                  >
                    {{ $t('admin.documents.statusError') }}
                  </span>
                  <span v-if="viewing" class="text-[11px] text-slate-500">
                    · {{ viewing.chunkCount }} {{ $t('admin.documents.chunksLabel') }} · {{ viewing.content.length.toLocaleString() }} {{ $t('admin.documents.charsLabel') }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <CopyButton
                v-if="viewing?.content"
                :value="viewing.content"
                :label="$t('common.copy')"
                :aria-label="$t('admin.documents.copyDocumentText')"
              />
              <button
                type="button"
                class="flex size-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/80 hover:text-slate-900 transition"
                :aria-label="$t('admin.chat.closeEsc')"
                :title="$t('admin.chat.closeEsc')"
                @click="closeViewer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <!-- Body: single scroll container with min-h-0 so flex-1 can shrink and
             the inner content scrolls instead of pushing the modal out. -->
        <div class="flex-1 min-h-0 overflow-y-auto">
          <div class="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
            <!-- Error state -->
            <div v-if="viewError" class="rounded-xl border border-danger-200 bg-danger-50/80 p-4 text-sm text-danger-700 flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 mt-0.5 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{{ viewError }}</p>
            </div>

            <!-- Loading state -->
            <div v-else-if="fetchingContent" class="flex flex-col items-center justify-center py-16 text-center">
              <SpinnerInline />
              <p class="mt-3 text-xs text-slate-500">{{ $t('admin.documents.reconstructing') }}</p>
            </div>

            <!-- Empty content -->
            <div v-else-if="viewing && !viewing.content" class="text-center py-16">
              <p class="text-sm text-slate-500">{{ $t('admin.documents.noTextContent') }}</p>
            </div>

            <!-- Content: glass card with high-contrast text for comfortable reading -->
            <article v-else-if="viewing" class="rounded-2xl bg-white/90 backdrop-blur-xl ring-1 ring-white/60 shadow-glass">
              <pre class="whitespace-pre-wrap break-words font-mono text-sm sm:text-[15px] text-slate-800 leading-7 select-all p-5 sm:p-8">{{ viewing.content }}</pre>
            </article>
          </div>
        </div>

        <!-- Footer (only shows when content is loaded) -->
        <footer v-if="viewing?.content" class="shrink-0 border-t border-white/60 bg-white/70 backdrop-blur-xl">
          <div class="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 sm:px-6 py-3">
            <p class="text-xs text-slate-500">
              {{ viewing.content.length.toLocaleString() }} {{ $t('admin.documents.characters') }}
              <span v-if="viewing.chunkCount"> · {{ viewing.chunkCount }} {{ $t('admin.documents.chunksLabel') }}</span>
            </p>
            <div class="flex items-center gap-2">
              <CopyButton :value="viewing.content" :label="$t('admin.documents.copyText')" />
              <button
                type="button"
                class="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 shadow-glass transition"
                @click="closeViewer"
              >
                {{ $t('common.close') }}
              </button>
            </div>
          </div>
        </footer>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      :open="!!confirmingRemove"
      :title="$t('admin.documents.deleteConfirmTitle')"
      :message="$t('admin.documents.deleteConfirmMessage', { name: confirmingRemove?.fileName ?? '' })"
      :confirm-label="$t('common.delete')"
      tone="danger"
      @cancel="confirmingRemove = null"
      @confirm="onConfirmRemove"
    />
  </section>
</template>
