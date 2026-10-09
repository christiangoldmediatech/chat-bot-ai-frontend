<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Case } from '~/types/case'
import type { ConversationStatus } from '~/types/conversation'

const props = defineProps<{
  conversationId: string
  botId: string
  customerPhone: string
  conversationStatus: ConversationStatus
  /** Increment to force a refetch (hooked to the parent polling tick). */
  refreshSignal?: number
}>()

const { t, locale } = useI18n()
const casesApi = useCases()

const items = ref<Case[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const panelOpen = ref(true)
const expandedId = ref<string | null>(null)

const resolveTarget = ref<Case | null>(null)
const resolveNote = ref('')
const resolving = ref(false)
const resolveError = ref<string | null>(null)

const toast = ref<{ kind: 'success' | 'error', text: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(kind: 'success' | 'error', text: string): void {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { kind, text }
  toastTimer = setTimeout(() => { toast.value = null }, 3500)
}

const openCount = computed(() => items.value.length)
const canResolve = computed(() => props.conversationStatus === 'HUMAN')

async function load(options: { silent?: boolean } = {}): Promise<void> {
  if (!options.silent) loading.value = true
  loadError.value = null
  try {
    const list = await casesApi.byConversation(props.conversationId, props.botId)
    const sorted = [...list].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    const previousIds = new Set(items.value.map(c => c.id))
    items.value = sorted
    if (options.silent) {
      const incoming = sorted.find(c => !previousIds.has(c.id))
      if (incoming && previousIds.size > 0) {
        showToast('success', t('conversations.detail.cases.newCaseToast'))
      }
    }
  }
  catch (err) {
    loadError.value = (err as ApiError).message
  }
  finally {
    loading.value = false
  }
}

function toggleCase(id: string): void {
  expandedId.value = expandedId.value === id ? null : id
}

function openResolve(c: Case): void {
  resolveTarget.value = c
  resolveNote.value = ''
  resolveError.value = null
}

async function submitResolve(): Promise<void> {
  const target = resolveTarget.value
  if (!target) return
  resolving.value = true
  resolveError.value = null
  const removedIndex = items.value.findIndex(c => c.id === target.id)
  const snapshot = removedIndex >= 0 ? items.value[removedIndex] : null
  if (removedIndex >= 0) items.value.splice(removedIndex, 1)
  try {
    await casesApi.markResolved(target.id, resolveNote.value.trim() || undefined)
    resolveTarget.value = null
    showToast('success', t('conversations.detail.cases.resolve.success'))
  }
  catch (err) {
    if (snapshot && removedIndex >= 0) {
      items.value.splice(removedIndex, 0, snapshot)
    }
    resolveError.value = (err as ApiError).message || t('conversations.detail.cases.resolve.error')
    showToast('error', resolveError.value)
  }
  finally {
    resolving.value = false
  }
}

function priorityDot(p: Case['priority']): string {
  if (p === 'HIGH') return 'bg-rose-500'
  if (p === 'LOW') return 'bg-slate-400'
  return 'bg-amber-500'
}

function statusChipClass(s: Case['status']): string {
  if (s === 'ATTENDED') return 'bg-sky-50 text-sky-700 ring-sky-200'
  return 'bg-rose-50 text-rose-700 ring-rose-200'
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(locale.value, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

watch(() => props.conversationId, () => { void load() }, { immediate: true })
watch(() => props.refreshSignal, (v, prev) => {
  if (v === undefined || v === prev) return
  void load({ silent: true })
})

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<template>
  <section
    role="region"
    :aria-label="t('conversations.detail.cases.title')"
    class="rounded-2xl bg-white ring-1 ring-slate-200 shadow-glass"
  >
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      :aria-expanded="panelOpen"
      :aria-controls="`cases-panel-${conversationId}`"
      :aria-label="t('conversations.detail.cases.toggleAria')"
      @click="panelOpen = !panelOpen"
    >
      <div class="flex items-center gap-2 min-w-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 shrink-0 text-rose-500" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
        <h3 class="text-sm font-semibold text-slate-900 truncate">
          {{ t('conversations.detail.cases.title') }}
        </h3>
        <span
          v-if="openCount > 0"
          class="inline-flex items-center justify-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200"
          :aria-label="t('conversations.detail.cases.badgeAria', { n: openCount }, openCount)"
        >
          {{ openCount }}
        </span>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-4 shrink-0 text-slate-400 transition"
        :class="panelOpen ? 'rotate-180' : ''"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <div
      v-show="panelOpen"
      :id="`cases-panel-${conversationId}`"
      class="border-t border-slate-100 px-4 py-3"
    >
      <div v-if="loading" class="space-y-2" aria-busy="true" :aria-label="t('conversations.detail.cases.loading')">
        <div v-for="n in 2" :key="n" class="h-14 animate-pulse rounded-lg bg-slate-100" />
      </div>

      <div
        v-else-if="loadError"
        class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
      >
        <p class="font-semibold">{{ t('conversations.detail.cases.errorTitle') }}</p>
        <p class="mt-1 break-words">{{ loadError }}</p>
        <button
          type="button"
          class="mt-2 rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
          @click="load()"
        >
          {{ t('conversations.detail.cases.retry') }}
        </button>
      </div>

      <div v-else-if="!items.length" class="py-4 text-center">
        <div class="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-emerald-600" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p class="mt-2 text-sm font-medium text-slate-800">
          {{ t('conversations.detail.cases.empty.title') }}
        </p>
        <p class="mt-1 text-xs text-slate-500">
          {{ t('conversations.detail.cases.empty.hint') }}
        </p>
      </div>

      <TransitionGroup
        v-else
        tag="ul"
        name="case-row"
        class="space-y-2"
      >
        <li
          v-for="c in items"
          :key="c.id"
          class="rounded-lg border border-slate-200 bg-slate-50/60 overflow-hidden"
        >
          <button
            type="button"
            class="flex w-full items-start gap-2 px-3 py-2 text-left"
            :aria-expanded="expandedId === c.id"
            :aria-label="t('conversations.detail.cases.toggleCaseAria')"
            @click="toggleCase(c.id)"
          >
            <span
              class="mt-1 size-2 shrink-0 rounded-full"
              :class="priorityDot(c.priority)"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <p class="text-xs text-slate-800 line-clamp-1">{{ c.summary }}</p>
              <div class="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 font-medium uppercase tracking-wide ring-1"
                  :class="statusChipClass(c.status)"
                >
                  {{ t(`cases.status.${c.status}`) }}
                </span>
                <span class="text-slate-500">{{ formatDate(c.createdAt) }}</span>
                <span v-if="c.followupCount > 0" class="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-amber-200">
                  {{ t('cases.list.followupBadge') }}
                </span>
              </div>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-3.5 shrink-0 text-slate-400 transition"
              :class="expandedId === c.id ? 'rotate-180' : ''"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div v-if="expandedId === c.id" class="border-t border-slate-200 bg-white px-3 py-3 text-xs">
            <p class="whitespace-pre-wrap text-slate-800">{{ c.summary }}</p>
            <dl class="mt-3 grid grid-cols-1 gap-y-1 text-slate-600">
              <div class="flex justify-between gap-2">
                <dt class="shrink-0 font-medium text-slate-500">{{ t('conversations.detail.cases.fields.created') }}</dt>
                <dd class="truncate text-right">{{ formatDate(c.createdAt) }}</dd>
              </div>
              <div v-if="c.attendedAt" class="flex justify-between gap-2">
                <dt class="shrink-0 font-medium text-slate-500">{{ t('conversations.detail.cases.fields.attended') }}</dt>
                <dd class="truncate text-right">{{ formatDate(c.attendedAt) }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="shrink-0 font-medium text-slate-500">{{ t('conversations.detail.cases.fields.advisor') }}</dt>
                <dd class="truncate text-right font-mono text-[11px]">{{ c.advisorEmail }}</dd>
              </div>
              <div v-if="c.followupSentAt" class="flex justify-between gap-2">
                <dt class="shrink-0 font-medium text-slate-500">{{ t('conversations.detail.cases.fields.followup') }}</dt>
                <dd class="truncate text-right">{{ formatDate(c.followupSentAt) }} · {{ c.followupCount }}</dd>
              </div>
            </dl>

            <div class="mt-3 flex items-center justify-between gap-2">
              <a
                v-if="c.crmLeadUrl"
                :href="c.crmLeadUrl"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
              >
                {{ t('cases.list.crmBadge') }}
              </a>
              <span v-else class="text-[11px] text-slate-400" />

              <button
                v-if="canResolve"
                type="button"
                class="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition"
                @click="openResolve(c)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {{ t('conversations.detail.cases.resolve.action') }}
              </button>
            </div>
          </div>
        </li>
      </TransitionGroup>

      <div v-if="!canResolve && items.length > 0" class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
        {{ t('conversations.detail.cases.requiresHuman.hint') }}
      </div>

      <div class="mt-3 flex items-center justify-end">
        <NuxtLink
          :to="`/admin/customers/${encodeURIComponent(customerPhone)}`"
          class="text-[11px] font-medium text-slate-500 hover:text-slate-700"
        >
          {{ t('conversations.detail.cases.viewHistory') }} →
        </NuxtLink>
      </div>
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-if="toast"
          role="status"
          class="fixed bottom-6 right-6 z-[150] rounded-xl px-4 py-2 text-sm font-medium shadow-lg ring-1"
          :class="toast.kind === 'success'
            ? 'bg-emerald-600 text-white ring-emerald-700/30'
            : 'bg-rose-600 text-white ring-rose-700/30'"
        >
          {{ toast.text }}
        </div>
      </Transition>
    </Teleport>

    <Modal
      :open="resolveTarget !== null"
      :title="t('conversations.detail.cases.resolve.modalTitle')"
      size="md"
      @close="resolveTarget = null"
    >
      <div v-if="resolveTarget" class="space-y-3 text-sm">
        <p class="text-slate-700">
          {{ t('conversations.detail.cases.resolve.modalBody') }}
          <span class="font-semibold text-emerald-700">{{ t('conversations.detail.cases.resolve.modalEmph') }}</span>.
        </p>
        <div class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <p class="line-clamp-3">{{ resolveTarget.summary }}</p>
        </div>
        <label class="block">
          <span class="sr-only">{{ t('conversations.detail.cases.resolve.placeholder') }}</span>
          <textarea
            v-model="resolveNote"
            rows="3"
            :placeholder="t('conversations.detail.cases.resolve.placeholder')"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
          />
        </label>
        <div v-if="resolveError" class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {{ resolveError }}
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            @click="resolveTarget = null"
          >
            {{ t('conversations.detail.cases.resolve.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            :disabled="resolving"
            @click="submitResolve"
          >
            {{ t('conversations.detail.cases.resolve.submit') }}
          </button>
        </div>
      </template>
    </Modal>
  </section>
</template>

<style scoped>
.case-row-enter-active,
.case-row-leave-active {
  transition: all 220ms ease;
}
.case-row-enter-from,
.case-row-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
.case-row-leave-active {
  position: absolute;
  width: 100%;
}
</style>
