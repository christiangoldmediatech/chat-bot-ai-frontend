<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  BlockStatus,
  SecurityAuditEntry,
  SecurityStatus,
} from '~/types/security'

const props = defineProps<{
  conversationId: string
  mode: 'tenant' | 'superadmin'
  tenantId?: string
}>()

const { t } = useI18n()
const securityApi = useConversationSecurity(props.mode === 'superadmin' ? props.tenantId : undefined)

const status = ref<SecurityStatus | null>(null)
const audit = ref<SecurityAuditEntry[]>([])
const loading = ref(true)
const errorMsg = ref<string | null>(null)
const notification = ref<{ kind: 'success' | 'error'; text: string } | null>(null)

const showUnblockModal = ref(false)
const showBlockModal = ref(false)
const unblockReason = ref('')
const blockReason = ref('')
const mutating = ref(false)

async function load(): Promise<void> {
  loading.value = true
  errorMsg.value = null
  try {
    const [s, a] = await Promise.all([
      securityApi.getStatus(props.conversationId),
      securityApi.listAudit(props.conversationId).catch(() => [] as SecurityAuditEntry[]),
    ])
    status.value = s
    audit.value = a
  } catch (err) {
    const e = err as ApiError
    if (e.statusCode === 404) {
      status.value = null
      audit.value = []
      errorMsg.value = null
    } else {
      errorMsg.value = t('conversations.security.toast.errorLoading')
    }
  } finally {
    loading.value = false
  }
}

function notify(kind: 'success' | 'error', text: string): void {
  notification.value = { kind, text }
  setTimeout(() => {
    notification.value = null
  }, 2500)
}

async function confirmUnblock(): Promise<void> {
  mutating.value = true
  try {
    const reason = unblockReason.value.trim() || undefined
    await securityApi.unblock(props.conversationId, reason)
    showUnblockModal.value = false
    unblockReason.value = ''
    await load()
    notify('success', t('conversations.security.toast.unblocked'))
  } catch {
    notify('error', t('conversations.security.toast.errorUnblock'))
  } finally {
    mutating.value = false
  }
}

async function confirmBlock(): Promise<void> {
  mutating.value = true
  try {
    const reason = blockReason.value.trim() || undefined
    await securityApi.block(props.conversationId, reason)
    showBlockModal.value = false
    blockReason.value = ''
    await load()
    notify('success', t('conversations.security.toast.blocked'))
  } catch {
    notify('error', t('conversations.security.toast.errorBlock'))
  } finally {
    mutating.value = false
  }
}

const canUnblock = computed(() => {
  const s = status.value
  if (!s) return false
  if (s.blockStatus === 'NONE' && s.suspiciousScore === 0 && s.suspiciousCount === 0) return false
  return true
})

const canBlock = computed(() => {
  if (props.mode !== 'superadmin') return false
  const s = status.value
  if (!s) return true
  return s.blockStatus !== 'MANUAL_BLOCKED'
})

function badgeClass(s: BlockStatus): string {
  return {
    NONE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    AUTO_BLOCKED: 'bg-amber-50 text-amber-800 ring-amber-200',
    MANUAL_BLOCKED: 'bg-danger-50 text-danger-700 ring-danger-200',
    MANUAL_UNBLOCKED: 'bg-sky-50 text-sky-700 ring-sky-200',
  }[s]
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleString()
}

function actionLabel(action: SecurityAuditEntry['action']): string {
  return t(`conversations.security.audit.action.${action}`)
}

function actorLabel(row: SecurityAuditEntry): string {
  if (row.performedByPlatformAdminId) return t('conversations.security.audit.actorPlatformAdmin')
  return t('conversations.security.audit.actorUser')
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-slate-900">
          {{ $t('conversations.security.cardTitle') }}
        </h3>
        <p class="mt-0.5 text-xs text-slate-500">
          {{ $t('conversations.security.cardSubtitle') }}
        </p>
      </div>
      <button
        type="button"
        class="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
        :disabled="loading"
        @click="load"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" :class="loading ? 'animate-spin' : ''" aria-hidden="true">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        {{ $t('conversations.security.actions.refresh') }}
      </button>
    </div>

    <p
      v-if="errorMsg"
      class="mt-3 rounded-md border border-danger-200 bg-danger-50 p-2 text-xs text-danger-700"
    >
      {{ errorMsg }}
    </p>

    <SpinnerInline v-if="loading" class="mt-4" />

    <template v-else>
      <div class="mt-3">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1"
          :class="badgeClass(status?.blockStatus ?? 'NONE')"
        >
          {{ $t(`conversations.security.badge.${status?.blockStatus ?? 'NONE'}`) }}
        </span>
      </div>

      <dl v-if="status" class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <dt class="text-slate-500">{{ $t('conversations.security.score') }}</dt>
        <dd class="text-slate-900 font-mono">{{ status.suspiciousScore }}</dd>

        <dt class="text-slate-500">{{ $t('conversations.security.count') }}</dt>
        <dd class="text-slate-900 font-mono">{{ status.suspiciousCount }}</dd>

        <template v-if="status.blockedUntil">
          <dt class="text-slate-500">{{ $t('conversations.security.blockedUntil') }}</dt>
          <dd class="text-slate-900">{{ formatDate(status.blockedUntil) }}</dd>
        </template>

        <template v-if="status.blockedAt">
          <dt class="text-slate-500">{{ $t('conversations.security.blockedAt') }}</dt>
          <dd class="text-slate-900">{{ formatDate(status.blockedAt) }}</dd>
        </template>

        <template v-if="status.unblockedAt">
          <dt class="text-slate-500">{{ $t('conversations.security.unblockedAt') }}</dt>
          <dd class="text-slate-900">{{ formatDate(status.unblockedAt) }}</dd>
        </template>

        <template v-if="status.lastSuspiciousReason">
          <dt class="text-slate-500 col-span-1">{{ $t('conversations.security.lastReason') }}</dt>
          <dd class="text-slate-700 col-span-1 truncate" :title="status.lastSuspiciousReason">
            {{ status.lastSuspiciousReason }}
          </dd>
        </template>
      </dl>

      <div class="mt-4 flex flex-col gap-2">
        <button
          v-if="canUnblock"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-100"
          @click="showUnblockModal = true"
        >
          {{ $t('conversations.security.actions.unblock') }}
        </button>
        <button
          v-if="canBlock"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-danger-200 bg-danger-50 px-3 py-1.5 text-sm font-medium text-danger-700 hover:bg-danger-100"
          @click="showBlockModal = true"
        >
          {{ $t('conversations.security.actions.block') }}
        </button>
      </div>

      <div class="mt-5">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {{ $t('conversations.security.audit.title') }}
        </h4>
        <p v-if="audit.length === 0" class="mt-2 text-xs text-slate-400 italic">
          {{ $t('conversations.security.audit.empty') }}
        </p>
        <ul v-else class="mt-2 space-y-2">
          <li
            v-for="row in audit"
            :key="row.id"
            class="rounded-lg border border-slate-200 bg-white/60 p-2 text-xs"
          >
            <div class="flex items-center justify-between gap-2">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1"
                :class="row.action === 'MANUAL_BLOCK' ? 'bg-danger-50 text-danger-700 ring-danger-200' : 'bg-sky-50 text-sky-700 ring-sky-200'"
              >
                {{ actionLabel(row.action) }}
              </span>
              <span class="text-[11px] text-slate-500">{{ formatDate(row.createdAt) }}</span>
            </div>
            <div class="mt-1.5 text-slate-700">
              <span class="font-medium">{{ actorLabel(row) }}</span>
              <span class="text-slate-400 mx-1">·</span>
              <span class="font-mono text-slate-500">{{ row.performedByRole }}</span>
            </div>
            <p v-if="row.reason" class="mt-1 text-slate-600">{{ row.reason }}</p>
          </li>
        </ul>
      </div>
    </template>

    <p
      v-if="notification"
      class="mt-3 rounded-md p-2 text-xs"
      :class="notification.kind === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-danger-200 bg-danger-50 text-danger-700'"
    >
      {{ notification.text }}
    </p>

    <Teleport to="body">
      <div
        v-if="showUnblockModal"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        @click.self="showUnblockModal = false"
      >
        <div class="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
          <div class="h-1 w-full bg-sky-500" aria-hidden="true" />
          <div class="p-6">
            <h3 class="text-base font-semibold text-slate-900">{{ $t('conversations.security.unblockModal.title') }}</h3>
            <p class="mt-1.5 text-sm text-slate-600">{{ $t('conversations.security.unblockModal.message') }}</p>
            <label class="mt-4 block text-xs font-medium text-slate-600">
              {{ $t('conversations.security.unblockModal.reasonLabel') }}
            </label>
            <textarea
              v-model="unblockReason"
              rows="3"
              maxlength="500"
              :placeholder="$t('conversations.security.unblockModal.reasonPlaceholder')"
              class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <div class="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                :disabled="mutating"
                @click="showUnblockModal = false"
              >
                {{ $t('conversations.security.unblockModal.cancel') }}
              </button>
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50"
                :disabled="mutating"
                @click="confirmUnblock"
              >
                {{ mutating ? $t('conversations.security.unblockModal.loading') : $t('conversations.security.unblockModal.confirm') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="showBlockModal"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        @click.self="showBlockModal = false"
      >
        <div class="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
          <div class="h-1 w-full bg-danger-500" aria-hidden="true" />
          <div class="p-6">
            <h3 class="text-base font-semibold text-slate-900">{{ $t('conversations.security.blockModal.title') }}</h3>
            <p class="mt-1.5 text-sm text-slate-600">{{ $t('conversations.security.blockModal.message') }}</p>
            <label class="mt-4 block text-xs font-medium text-slate-600">
              {{ $t('conversations.security.blockModal.reasonLabel') }}
            </label>
            <textarea
              v-model="blockReason"
              rows="3"
              maxlength="500"
              :placeholder="$t('conversations.security.blockModal.reasonPlaceholder')"
              class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 px-3 py-2 text-sm focus:border-danger-500 focus:outline-none focus:ring-1 focus:ring-danger-500"
            />
            <div class="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                :disabled="mutating"
                @click="showBlockModal = false"
              >
                {{ $t('conversations.security.blockModal.cancel') }}
              </button>
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 disabled:opacity-50"
                :disabled="mutating"
                @click="confirmBlock"
              >
                {{ mutating ? $t('conversations.security.blockModal.loading') : $t('conversations.security.blockModal.confirm') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
