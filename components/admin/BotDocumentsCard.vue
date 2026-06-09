<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { DocumentContent, DocumentItem, DocumentStatus } from '~/types/document'

const props = defineProps<{
  botId: string
  tenantId?: string
}>()

const docs = useDocuments(props.tenantId)

const items = ref<DocumentItem[]>([])
const loading = ref(true)
const uploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const removing = ref<string | null>(null)
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

async function onRemove(doc: DocumentItem): Promise<void> {
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
    viewError.value = `Document is still ${doc.status.toLowerCase()}. Try again once it shows READY.`
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

// Load inside onMounted (not top-level await) so the card UI shows up
// immediately with a spinner — even if the backend is unreachable or slow,
// the upload button and the empty-state remain visible and the user gets a
// clear error banner instead of a missing component.
onMounted(() => {
  void load()
})
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-sm font-semibold text-slate-900">Documents (RAG)</h2>
        <p class="text-xs text-slate-500 mt-1">
          Plain text (.txt) or Markdown (.md), up to 5&nbsp;MB. The backend chunks them, embeds them, and uses them as context in every response.
        </p>
      </div>
      <button
        v-if="!loading"
        type="button"
        class="text-xs text-slate-500 hover:text-slate-700"
        @click="load"
      >
        Reload
      </button>
    </div>

    <p v-if="error" class="mt-3 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
      {{ error }}
    </p>

    <div class="mt-3 flex items-center gap-3">
      <label
        class="inline-flex cursor-pointer items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        :class="uploading && 'opacity-60 cursor-not-allowed'"
      >
        <span>{{ uploading ? 'Uploading…' : items.length === 0 ? '+ Upload document' : '+ Add another document' }}</span>
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          :disabled="uploading"
          @change="onFileChange"
        >
      </label>
      <span v-if="items.length > 0" class="text-xs text-slate-500">
        More documents = better answers.
      </span>
    </div>

    <SpinnerInline v-if="loading" class="mt-4" />

    <p
      v-else-if="items.length === 0"
      class="mt-4 text-sm text-slate-500"
    >
      No documents uploaded yet.
    </p>

    <ul v-else class="mt-4 divide-y divide-slate-100">
      <li
        v-for="d in items"
        :key="d.id"
        class="flex items-center justify-between py-2 gap-3"
      >
        <div class="min-w-0">
          <div class="text-sm font-medium text-slate-900 truncate">{{ d.fileName }}</div>
          <div class="text-xs text-slate-500">
            {{ d.fileType }} · {{ new Date(d.createdAt).toLocaleString() }}
            <span v-if="typeof d.chunkCount === 'number'"> · {{ d.chunkCount }} chunks</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
            :class="statusClass(d.status)"
          >
            {{ d.status }}
          </span>
          <button
            type="button"
            class="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50"
            :disabled="fetchingContent === d.id"
            @click="onView(d)"
          >
            {{ fetchingContent === d.id ? 'Loading…' : 'View' }}
          </button>
          <button
            type="button"
            class="text-xs text-danger-600 hover:text-danger-700 disabled:opacity-50"
            :disabled="removing === d.id"
            @click="onRemove(d)"
          >
            Delete
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
          :aria-label="`Viewing ${viewingMeta.fileName}`"
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
                    Ready
                  </span>
                  <span
                    v-else-if="viewingMeta.status === 'PROCESSING'"
                    class="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-700 ring-1 ring-blue-200"
                  >
                    Processing
                  </span>
                  <span
                    v-else-if="viewingMeta.status === 'ERROR'"
                    class="inline-flex items-center rounded-full bg-danger-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-danger-700 ring-1 ring-danger-200"
                  >
                    Error
                  </span>
                  <span v-if="viewing" class="text-[11px] text-slate-500">
                    · {{ viewing.chunkCount }} chunks · {{ viewing.content.length.toLocaleString() }} chars
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <CopyButton
                v-if="viewing?.content"
                :value="viewing.content"
                label="Copy"
                aria-label="Copy document text"
              />
              <button
                type="button"
                class="flex size-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/80 hover:text-slate-900 transition"
                aria-label="Close (Esc)"
                title="Close (Esc)"
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
              <p class="mt-3 text-xs text-slate-500">Reconstructing document from chunks…</p>
            </div>

            <!-- Empty content -->
            <div v-else-if="viewing && !viewing.content" class="text-center py-16">
              <p class="text-sm text-slate-500">This document has no extractable text content.</p>
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
              {{ viewing.content.length.toLocaleString() }} characters
              <span v-if="viewing.chunkCount"> · {{ viewing.chunkCount }} chunks</span>
            </p>
            <div class="flex items-center gap-2">
              <CopyButton :value="viewing.content" label="Copy text" />
              <button
                type="button"
                class="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 shadow-glass transition"
                @click="closeViewer"
              >
                Close
              </button>
            </div>
          </div>
        </footer>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
