<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { DocumentItem, DocumentStatus } from '~/types/document'

const props = defineProps<{
  botId: string
}>()

const docs = useDocuments()

const items = ref<DocumentItem[]>([])
const loading = ref(true)
const uploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const removing = ref<string | null>(null)

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
    await docs.remove(doc.id)
    items.value = items.value.filter((d) => d.id !== doc.id)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    removing.value = null
  }
}

function statusClass(s: DocumentStatus): string {
  return {
    PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
    READY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ERROR: 'bg-red-50 text-red-700 border-red-200',
  }[s]
}

await load()
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-sm font-semibold text-slate-900">Documentos (RAG)</h2>
        <p class="text-xs text-slate-500 mt-1">
          PDFs, TXT o Markdown. El backend los chunkea, embebe y los usa como contexto en cada respuesta.
        </p>
      </div>
      <button
        v-if="!loading"
        type="button"
        class="text-xs text-slate-500 hover:text-slate-700"
        @click="load"
      >
        Recargar
      </button>
    </div>

    <p v-if="error" class="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {{ error }}
    </p>

    <div class="mt-3">
      <label
        class="inline-flex cursor-pointer items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        :class="uploading && 'opacity-60 cursor-not-allowed'"
      >
        <span>{{ uploading ? 'Subiendo…' : '+ Subir documento' }}</span>
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept=".pdf,.txt,.md,.markdown"
          :disabled="uploading"
          @change="onFileChange"
        >
      </label>
    </div>

    <div v-if="loading" class="mt-4 text-sm text-slate-500">Cargando…</div>

    <p
      v-else-if="items.length === 0"
      class="mt-4 text-sm text-slate-500"
    >
      Sin documentos cargados todavía.
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
            class="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
            :disabled="removing === d.id"
            @click="onRemove(d)"
          >
            Eliminar
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
