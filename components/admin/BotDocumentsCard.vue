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

    <!-- Viewer modal: shows the document's reconstructed text. -->
    <div
      v-if="viewingMeta"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      @click.self="closeViewer"
    >
      <div class="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 flex flex-col">
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-slate-900 truncate">{{ viewingMeta.fileName }}</h3>
            <p class="mt-1 text-xs text-slate-500">
              {{ viewingMeta.fileType }}
              <span v-if="viewing"> · {{ viewing.chunkCount }} chunks · {{ viewing.content.length.toLocaleString() }} characters</span>
            </p>
          </div>
          <button
            type="button"
            class="text-sm text-slate-500 hover:text-slate-900"
            aria-label="Close"
            @click="closeViewer"
          >
            ✕
          </button>
        </header>
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <p v-if="viewError" class="rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
            {{ viewError }}
          </p>
          <SpinnerInline v-else-if="fetchingContent" />
          <pre v-else-if="viewing" class="whitespace-pre-wrap font-mono text-xs text-slate-700 leading-relaxed">{{ viewing.content }}</pre>
        </div>
      </div>
    </div>
  </section>
</template>
