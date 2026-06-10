<script setup lang="ts">
import type { Message, MessageMediaType } from '~/types/conversation'

const props = defineProps<{
  message: Message
  /** Bot owning this conversation — required to lazy-fetch outbound asset URLs. */
  botId: string
  /** When set, fetches use the superadmin route variant. */
  tenantId?: string
}>()

const { t } = useI18n()
const assets = useMediaAssets(props.tenantId)

// Treat NULL as TEXT for legacy rows.
const kind = computed<MessageMediaType>(() => props.message.mediaType ?? 'TEXT')

const isUser = computed(() => props.message.role === 'USER')

// ── Lazy-fetched preview URL for outbound media ─────────────────────────────
const previewUrl = ref<string | null>(null)
const previewError = ref<string | null>(null)
const fetchingPreview = ref(false)

async function loadPreviewUrl(): Promise<void> {
  if (previewUrl.value || fetchingPreview.value) return
  if (!props.message.mediaRef) return
  // Only assistant-outbound rows have a MediaAsset.id in mediaRef; user-inbound
  // rows carry Meta's media_id which needs a different endpoint (out of scope
  // for F7 — surface a placeholder for now).
  if (props.message.role !== 'ASSISTANT') return
  if (kind.value === 'LOCATION' || kind.value === 'TEXT') return

  fetchingPreview.value = true
  previewError.value = null
  try {
    const res = await assets.getDownloadUrl(props.botId, props.message.mediaRef)
    previewUrl.value = res.url
  } catch (err) {
    previewError.value = (err as { message?: string }).message ?? t('admin.chat.failedToLoad')
  } finally {
    fetchingPreview.value = false
  }
}

onMounted(() => {
  void loadPreviewUrl()
})

// ── Helpers ─────────────────────────────────────────────────────────────────
const locationCoords = computed<{ lat: number; lng: number } | null>(() => {
  if (kind.value !== 'LOCATION') return null
  const m = props.message.metadata ?? {}
  const lat = (m as { latitude?: number }).latitude
  const lng = (m as { longitude?: number }).longitude
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return { lat, lng }
})

const locationLabel = computed<string | null>(() => {
  const m = props.message.metadata ?? {}
  const name = (m as { name?: string }).name
  const address = (m as { address?: string }).address
  if (name && address) return `${name} — ${address}`
  return name ?? address ?? null
})

const googleMapsHref = computed<string | null>(() => {
  const c = locationCoords.value
  if (!c) return null
  return `https://www.google.com/maps?q=${c.lat},${c.lng}`
})

const sizeBytes = computed<number | null>(() => {
  const raw = (props.message.metadata ?? {}) as { sizeBytes?: number }
  return typeof raw.sizeBytes === 'number' ? raw.sizeBytes : null
})

const filename = computed<string | null>(() => {
  const raw = (props.message.metadata ?? {}) as { filename?: string; resourceKey?: string }
  return raw.filename ?? raw.resourceKey ?? null
})

const mimeType = computed<string | null>(() => {
  const raw = (props.message.metadata ?? {}) as { mimeType?: string }
  return raw.mimeType ?? null
})

const audioTranscript = computed<string | null>(() => {
  const raw = (props.message.metadata ?? {}) as { transcript?: string }
  return raw.transcript ?? null
})

function formatBytes(b: number): string {
  if (b === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)))
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

// ── Image lightbox ──────────────────────────────────────────────────────────
const lightboxOpen = ref(false)
function openLightbox(): void {
  if (previewUrl.value) lightboxOpen.value = true
}
function closeLightbox(): void {
  lightboxOpen.value = false
}
</script>

<template>
  <!-- TEXT (legacy and explicit) — preserves existing behavior -->
  <div v-if="kind === 'TEXT'" class="whitespace-pre-wrap">{{ message.content }}</div>

  <!-- IMAGE / STICKER -->
  <div v-else-if="kind === 'IMAGE' || kind === 'STICKER'" class="space-y-2">
    <button
      v-if="previewUrl"
      type="button"
      class="block overflow-hidden rounded-xl ring-1 ring-black/5 max-w-[280px] hover:ring-black/20 transition cursor-zoom-in"
      :aria-label="message.content || $t('admin.chat.image')"
      @click="openLightbox"
    >
      <img :src="previewUrl" class="block w-full h-auto" alt="">
    </button>
    <div
      v-else
      class="flex items-center gap-2 rounded-xl bg-black/5 ring-1 ring-black/5 px-3 py-2 text-xs max-w-[280px]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
      <span>{{ fetchingPreview ? $t('admin.chat.loadingImage') : previewError ? previewError : $t('admin.chat.image') }}</span>
    </div>
    <p v-if="message.content" class="whitespace-pre-wrap">{{ message.content }}</p>
  </div>

  <!-- DOCUMENT -->
  <div v-else-if="kind === 'DOCUMENT'" class="space-y-2">
    <a
      v-if="previewUrl"
      :href="previewUrl"
      target="_blank"
      rel="noopener"
      class="flex items-center gap-3 rounded-xl bg-black/5 ring-1 ring-black/5 hover:ring-black/20 transition px-3 py-2 max-w-[320px]"
    >
      <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-xs font-medium">{{ filename ?? $t('admin.chat.document') }}</p>
        <p class="text-[10px] opacity-70">
          {{ mimeType ?? $t('admin.chat.file') }}<template v-if="sizeBytes"> · {{ formatBytes(sizeBytes) }}</template>
        </p>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 opacity-60" aria-hidden="true">
        <path d="M7 17L17 7" /><polyline points="7 7 17 7 17 17" />
      </svg>
    </a>
    <div
      v-else
      class="flex items-center gap-3 rounded-xl bg-black/5 ring-1 ring-black/5 px-3 py-2 max-w-[320px]"
    >
      <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-xs font-medium">{{ filename ?? $t('admin.chat.document') }}</p>
        <p class="text-[10px] opacity-70">{{ fetchingPreview ? $t('admin.chat.loading') : previewError ?? mimeType ?? $t('admin.chat.file') }}</p>
      </div>
    </div>
    <p v-if="message.content" class="whitespace-pre-wrap">{{ message.content }}</p>
  </div>

  <!-- VIDEO -->
  <div v-else-if="kind === 'VIDEO'" class="space-y-2">
    <video
      v-if="previewUrl"
      :src="previewUrl"
      controls
      class="block max-w-[320px] rounded-xl ring-1 ring-black/5"
    />
    <div
      v-else
      class="flex items-center gap-3 rounded-xl bg-black/5 ring-1 ring-black/5 px-3 py-2 max-w-[320px]"
    >
      <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-700">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium">{{ isUser ? $t('admin.chat.customerVideo') : $t('admin.chat.video') }}</p>
        <p class="text-[10px] opacity-70">
          {{ fetchingPreview ? $t('admin.chat.loading') : previewError ?? (isUser ? $t('admin.chat.receivedViaWhatsapp') : (mimeType ?? $t('admin.chat.video').toLowerCase())) }}
        </p>
      </div>
    </div>
    <p v-if="message.content && !isUser" class="whitespace-pre-wrap">{{ message.content }}</p>
  </div>

  <!-- AUDIO / VOICE -->
  <div v-else-if="kind === 'AUDIO' || kind === 'VOICE'" class="space-y-2">
    <audio
      v-if="previewUrl"
      :src="previewUrl"
      controls
      class="block max-w-[280px] w-full"
    />
    <div
      v-else
      class="flex items-center gap-3 rounded-xl bg-black/5 ring-1 ring-black/5 px-3 py-2 max-w-[280px]"
    >
      <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium">{{ kind === 'VOICE' ? $t('admin.chat.voiceNote') : $t('admin.chat.audio') }}</p>
        <p class="text-[10px] opacity-70">
          {{ fetchingPreview ? $t('admin.chat.loading') : previewError ?? (isUser ? $t('admin.chat.receivedViaWhatsapp') : (mimeType ?? $t('admin.chat.audio').toLowerCase())) }}
        </p>
      </div>
    </div>
    <p
      v-if="audioTranscript"
      class="text-xs italic opacity-90 rounded-lg bg-black/5 ring-1 ring-black/5 px-2 py-1.5 max-w-[280px]"
    >
      "{{ audioTranscript }}"
    </p>
    <p v-else-if="message.content && !audioTranscript" class="whitespace-pre-wrap">{{ message.content }}</p>
  </div>

  <!-- LOCATION -->
  <a
    v-else-if="kind === 'LOCATION' && googleMapsHref"
    :href="googleMapsHref"
    target="_blank"
    rel="noopener"
    class="block max-w-[320px] rounded-xl bg-black/5 ring-1 ring-black/5 hover:ring-black/20 transition overflow-hidden"
  >
    <div class="flex items-center gap-3 px-3 py-2">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-xs font-medium">{{ locationLabel ?? $t('admin.chat.location') }}</p>
        <p class="font-mono text-[10px] opacity-70">
          {{ locationCoords!.lat.toFixed(5) }}, {{ locationCoords!.lng.toFixed(5) }}
        </p>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 opacity-60" aria-hidden="true">
        <path d="M7 17L17 7" /><polyline points="7 7 17 7 17 17" />
      </svg>
    </div>
  </a>

  <!-- Fallback: unknown discriminator → render content as text -->
  <div v-else class="whitespace-pre-wrap">{{ message.content || `[${kind}]` }}</div>

  <!-- Image lightbox (teleported to escape parent backdrop-filter) -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="lightboxOpen && previewUrl"
        class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('admin.chat.imageFullView')"
        @click="closeLightbox"
      >
        <button
          type="button"
          class="absolute top-4 right-4 flex size-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          :aria-label="$t('admin.chat.closeEsc')"
          @click.stop="closeLightbox"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <img
          :src="previewUrl"
          class="max-w-full max-h-full rounded-xl shadow-2xl"
          alt=""
          @click.stop
        >
      </div>
    </Transition>
  </Teleport>
</template>
