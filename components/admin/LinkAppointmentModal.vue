<script setup lang="ts">
import type { CandidateAppointment } from '~/composables/useSales'
import type { CalendarEventStatus, Sale } from '~/types/sale'

const props = defineProps<{
  botId: string
  sale: Sale
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'linked', sale: Sale): void
  (e: 'unlinked', sale: Sale): void
}>()

const { t, locale } = useI18n()
const sales = useSales()

const loading = ref(false)
const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const candidates = ref<CandidateAppointment[]>([])

async function load() {
  if (!props.open) return
  loading.value = true
  errorMessage.value = null
  try {
    candidates.value = await sales.listCandidateAppointments(
      props.botId,
      props.sale.id,
    )
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) load()
})

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(locale.value, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: CalendarEventStatus): string {
  return t(`admin.sales.linkAppointment.statusLabel.${status}`)
}

async function pick(candidate: CandidateAppointment) {
  submitting.value = true
  errorMessage.value = null
  try {
    const updated = await sales.linkAppointment(
      props.botId,
      props.sale.id,
      candidate.id,
    )
    emit('linked', updated)
    emit('close')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err)
  } finally {
    submitting.value = false
  }
}

async function unlink() {
  if (!confirm(t('admin.sales.linkAppointment.confirmUnlink'))) return
  submitting.value = true
  errorMessage.value = null
  try {
    const updated = await sales.unlinkAppointment(props.botId, props.sale.id)
    emit('unlinked', updated)
    emit('close')
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white ring-1 ring-slate-200 shadow-xl overflow-hidden">
        <header class="px-6 py-4 border-b border-slate-200">
          <h2 class="text-base font-semibold text-slate-900">
            {{ t('admin.sales.linkAppointment.title') }}
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            {{ t('admin.sales.linkAppointment.subtitle') }}
          </p>
        </header>

        <div class="px-6 py-4 max-h-96 overflow-y-auto">
          <p v-if="loading" class="text-sm text-slate-500">
            {{ t('admin.sales.linkAppointment.loading') }}
          </p>
          <p
            v-else-if="candidates.length === 0"
            class="text-sm text-slate-500"
          >
            {{ t('admin.sales.linkAppointment.empty') }}
          </p>
          <ul v-else class="divide-y divide-slate-100">
            <li
              v-for="candidate in candidates"
              :key="candidate.id"
              class="flex items-start gap-3 py-3"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-900">
                  {{ fmt(candidate.startTime) }}
                </p>
                <p class="text-xs text-slate-500 truncate">
                  {{ candidate.topic ?? '—' }}
                </p>
                <p class="text-[11px] mt-1">
                  <span
                    class="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5"
                  >
                    {{ statusLabel(candidate.status) }}
                  </span>
                </p>
              </div>
              <button
                type="button"
                class="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
                :disabled="submitting || candidate.id === sale.appointmentId"
                @click="pick(candidate)"
              >
                {{ candidate.id === sale.appointmentId
                    ? '✓'
                    : t('admin.sales.linkAppointment.select') }}
              </button>
            </li>
          </ul>

          <p
            v-if="errorMessage"
            class="text-xs text-danger-700 mt-3"
          >
            {{ t('admin.sales.linkAppointment.error') }}: {{ errorMessage }}
          </p>
        </div>

        <footer class="px-6 py-3 flex items-center justify-between border-t border-slate-200 bg-slate-50">
          <button
            v-if="sale.appointmentId"
            type="button"
            class="text-xs text-danger-700 hover:text-danger-800 disabled:opacity-50"
            :disabled="submitting"
            @click="unlink"
          >
            {{ t('admin.sales.linkAppointment.unlinkAction') }}
          </button>
          <span v-else />
          <button
            type="button"
            class="text-xs font-medium px-3 py-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-slate-700 hover:bg-slate-100"
            :disabled="submitting"
            @click="emit('close')"
          >
            {{ t('admin.sales.linkAppointment.cancel') }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
