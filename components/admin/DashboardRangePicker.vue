<script setup lang="ts">
type Preset = 'today' | '7d' | '30d' | '90d' | 'custom'

const props = defineProps<{
  modelValue: { from: string; to: string }
}>()
const emit = defineEmits<{
  'update:modelValue': [v: { from: string; to: string }]
}>()

const route = useRoute()
const router = useRouter()

const preset = ref<Preset>((route.query.preset as Preset) || '30d')
const customFrom = ref('')
const customTo = ref('')

function toIsoStart(d: Date): string {
  const dd = new Date(d)
  dd.setHours(0, 0, 0, 0)
  return dd.toISOString()
}
function toIsoEnd(d: Date): string {
  const dd = new Date(d)
  dd.setHours(23, 59, 59, 999)
  return dd.toISOString()
}
function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

/**
 * Parse a YYYY-MM-DD string (the value emitted by `<input type="date">`) as a
 * local-time Date at midnight. We cannot use `new Date("2026-10-08")` because
 * the HTML spec says date-only ISO strings are interpreted as UTC — which
 * shifts the day backward for every tenant west of UTC. Building the Date
 * through `new Date(y, m-1, d)` honors the browser's local timezone, matching
 * what the user picked in the UI.
 */
function parseLocalDate(ymd: string): Date | null {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/**
 * Format a Date as YYYY-MM-DD using the browser's local timezone so we can
 * hydrate the two <input type="date"> values from the URL without the same
 * UTC-shift bug.
 */
function toYmdLocal(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function computeRange(p: Preset): { from: string; to: string } {
  const now = new Date()
  switch (p) {
    case 'today':
      return { from: toIsoStart(now), to: toIsoEnd(now) }
    case '7d':
      return { from: toIsoStart(daysAgo(6)), to: toIsoEnd(now) }
    case '30d':
      return { from: toIsoStart(daysAgo(29)), to: toIsoEnd(now) }
    case '90d':
      return { from: toIsoStart(daysAgo(89)), to: toIsoEnd(now) }
    case 'custom': {
      const fromDate = customFrom.value ? parseLocalDate(customFrom.value) : null
      const toDate = customTo.value ? parseLocalDate(customTo.value) : null
      return {
        from: fromDate ? toIsoStart(fromDate) : props.modelValue.from,
        to: toDate ? toIsoEnd(toDate) : props.modelValue.to,
      }
    }
  }
}

function apply(p: Preset): void {
  preset.value = p
  const range = computeRange(p)
  emit('update:modelValue', { from: range.from, to: range.to })
  router.replace({
    query: {
      ...route.query,
      preset: p,
      from: range.from,
      to: range.to,
    },
  })
}

onMounted(() => {
  const q = route.query
  if (q.from && q.to) {
    const fromIso = String(q.from)
    const toIso = String(q.to)
    emit('update:modelValue', { from: fromIso, to: toIso })
    // Prefill the custom inputs so the user keeps editing the same range
    // instead of starting from blank fields when they arrive via a direct link.
    if (preset.value === 'custom') {
      customFrom.value = toYmdLocal(fromIso)
      customTo.value = toYmdLocal(toIso)
    }
  } else {
    apply(preset.value)
  }
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="inline-flex rounded-xl border border-slate-200 bg-white backdrop-blur-md p-1 text-xs">
      <button
        v-for="p in (['today', '7d', '30d', '90d'] as Preset[])"
        :key="p"
        type="button"
        class="px-3 py-1.5 rounded-lg transition font-medium"
        :class="preset === p
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100'"
        @click="apply(p)"
      >
        {{ p === 'today' ? $t('admin.dashboard.range.today')
          : p === '7d' ? $t('admin.dashboard.range.d7')
          : p === '30d' ? $t('admin.dashboard.range.d30')
          : $t('admin.dashboard.range.d90') }}
      </button>
    </div>
    <div class="flex items-center gap-1">
      <input
        v-model="customFrom"
        type="date"
        class="rounded-lg border border-slate-200 bg-white backdrop-blur-md px-2 py-1.5 text-xs"
      >
      <span class="text-xs text-white/60">→</span>
      <input
        v-model="customTo"
        type="date"
        class="rounded-lg border border-slate-200 bg-white backdrop-blur-md px-2 py-1.5 text-xs"
      >
      <button
        type="button"
        class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
        :disabled="!customFrom || !customTo"
        @click="apply('custom')"
      >
        {{ $t('admin.dashboard.range.apply') }}
      </button>
    </div>
  </div>
</template>
