<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  BusinessHoursConfig,
  BusinessHoursRule,
  ReplaceBusinessHoursPayload,
} from '~/types/schedule'

const props = defineProps<{
  botId: string
  tenantId?: string
}>()

interface RangeState {
  startTime: string
  endTime: string
}

interface DayState {
  dayOfWeek: number
  isOpen: boolean
  ranges: RangeState[]
}

const { t } = useI18n()
const bh = useBusinessHours(props.tenantId)

const ISO_DAYS: Array<{ dayOfWeek: number, key: string }> = [
  { dayOfWeek: 1, key: 'mon' },
  { dayOfWeek: 2, key: 'tue' },
  { dayOfWeek: 3, key: 'wed' },
  { dayOfWeek: 4, key: 'thu' },
  { dayOfWeek: 5, key: 'fri' },
  { dayOfWeek: 6, key: 'sat' },
  { dayOfWeek: 7, key: 'sun' },
]

const DEFAULT_RANGE: RangeState = { startTime: '08:00', endTime: '18:00' }

function emptyDays(): DayState[] {
  return ISO_DAYS.map(d => ({
    dayOfWeek: d.dayOfWeek,
    isOpen: false,
    ranges: [],
  }))
}

const days = ref<DayState[]>(emptyDays())
const settings = reactive({
  slotGranularityMinutes: 30,
  bufferMinutes: 0,
  minNoticeHours: 0,
  maxAdvanceDays: 365,
  defaultDurationMinutes: 30,
})
const timezone = ref('')

const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const notConnected = ref(false)

function hydrate(cfg: BusinessHoursConfig): void {
  timezone.value = cfg.timezone
  settings.slotGranularityMinutes = cfg.slotGranularityMinutes
  settings.bufferMinutes = cfg.bufferMinutes
  settings.minNoticeHours = cfg.minNoticeHours
  settings.maxAdvanceDays = cfg.maxAdvanceDays
  settings.defaultDurationMinutes = cfg.defaultDurationMinutes

  const fresh = emptyDays()
  for (const rule of cfg.rules) {
    if (!rule.isActive) continue
    const day = fresh.find(d => d.dayOfWeek === rule.dayOfWeek)
    if (!day) continue
    day.isOpen = true
    day.ranges.push({ startTime: rule.startTime, endTime: rule.endTime })
  }
  for (const day of fresh) {
    day.ranges.sort((a, b) => a.startTime.localeCompare(b.startTime))
  }
  days.value = fresh
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  notConnected.value = false
  try {
    const cfg = await bh.get(props.botId)
    if (!cfg) {
      notConnected.value = true
      return
    }
    hydrate(cfg)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

function toggleDay(day: DayState): void {
  if (day.isOpen) {
    day.isOpen = false
    day.ranges = []
  } else {
    day.isOpen = true
    if (day.ranges.length === 0) {
      day.ranges.push({ ...DEFAULT_RANGE })
    }
  }
}

function addRange(day: DayState): void {
  day.ranges.push({ ...DEFAULT_RANGE })
}

function removeRange(day: DayState, index: number): void {
  day.ranges.splice(index, 1)
  if (day.ranges.length === 0) day.isOpen = false
}

function applyPresetMonFri(): void {
  const fresh = emptyDays()
  for (const day of fresh) {
    if (day.dayOfWeek >= 1 && day.dayOfWeek <= 5) {
      day.isOpen = true
      day.ranges = [{ ...DEFAULT_RANGE }]
    }
  }
  days.value = fresh
}

function applyPresetMonSat(): void {
  const fresh = emptyDays()
  for (const day of fresh) {
    if (day.dayOfWeek >= 1 && day.dayOfWeek <= 6) {
      day.isOpen = true
      day.ranges = [{ ...DEFAULT_RANGE }]
    }
  }
  days.value = fresh
}

function applyPresetAllWeek(): void {
  const fresh = emptyDays()
  for (const day of fresh) {
    day.isOpen = true
    day.ranges = [{ ...DEFAULT_RANGE }]
  }
  days.value = fresh
}

function copyMondayToAll(): void {
  const monday = days.value.find(d => d.dayOfWeek === 1)
  if (!monday || !monday.isOpen || monday.ranges.length === 0) return
  for (const day of days.value) {
    if (day.dayOfWeek === 1) continue
    day.isOpen = true
    day.ranges = monday.ranges.map(r => ({ ...r }))
  }
}

function parseHHMM(v: string): number {
  const [h, m] = v.split(':').map(Number)
  return h * 60 + m
}

const dayErrors = computed<Record<number, string[]>>(() => {
  const result: Record<number, string[]> = {}
  for (const day of days.value) {
    const errors: string[] = []
    if (day.isOpen) {
      const spans: Array<[number, number]> = []
      for (const [i, r] of day.ranges.entries()) {
        if (!/^\d{2}:\d{2}$/.test(r.startTime) || !/^\d{2}:\d{2}$/.test(r.endTime)) {
          errors.push(t('admin.businessHours.errors.invalidFormat', { n: i + 1 }))
          continue
        }
        const s = parseHHMM(r.startTime)
        const e = parseHHMM(r.endTime)
        if (e <= s) {
          errors.push(t('admin.businessHours.errors.rangeInverted', { n: i + 1 }))
        } else {
          spans.push([s, e])
        }
      }
      spans.sort((a, b) => a[0] - b[0])
      for (let i = 1; i < spans.length; i += 1) {
        if (spans[i][0] < spans[i - 1][1]) {
          errors.push(t('admin.businessHours.errors.overlap'))
          break
        }
      }
    }
    if (errors.length > 0) result[day.dayOfWeek] = errors
  }
  return result
})

const hasErrors = computed(() => Object.keys(dayErrors.value).length > 0)

function buildPayload(): ReplaceBusinessHoursPayload {
  const rules: ReplaceBusinessHoursPayload['rules'] = []
  for (const day of days.value) {
    if (!day.isOpen) continue
    for (const r of day.ranges) {
      rules.push({
        dayOfWeek: day.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        isActive: true,
      })
    }
  }
  return {
    rules,
    slotGranularityMinutes: settings.slotGranularityMinutes,
    bufferMinutes: settings.bufferMinutes,
    minNoticeHours: settings.minNoticeHours,
    maxAdvanceDays: settings.maxAdvanceDays,
    defaultDurationMinutes: settings.defaultDurationMinutes,
  }
}

async function onSave(): Promise<void> {
  if (hasErrors.value) return
  saving.value = true
  error.value = null
  success.value = null
  try {
    const updated = await bh.replace(props.botId, buildPayload())
    hydrate(updated)
    success.value = t('admin.businessHours.saved')
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

onMounted(load)
watch(() => props.botId, () => { void load() })
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-6 space-y-5">
    <header class="flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-100">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-amber-600" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <div class="flex-1">
        <h2 class="text-base font-semibold text-slate-900">{{ $t('admin.businessHours.title') }}</h2>
        <p class="text-xs text-slate-500 mt-0.5">{{ $t('admin.businessHours.subtitle') }}</p>
        <p v-if="timezone" class="text-[11px] text-slate-500 mt-1">{{ $t('admin.businessHours.timezoneLabel') }}: <span class="font-mono">{{ timezone }}</span></p>
      </div>
    </header>

    <SpinnerInline v-if="loading" />

    <div v-else-if="notConnected" class="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
      {{ $t('admin.businessHours.notConnected') }}
    </div>

    <template v-else>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300 transition" @click="applyPresetMonFri">
          {{ $t('admin.businessHours.presets.monFri') }}
        </button>
        <button type="button" class="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300 transition" @click="applyPresetMonSat">
          {{ $t('admin.businessHours.presets.monSat') }}
        </button>
        <button type="button" class="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300 transition" @click="applyPresetAllWeek">
          {{ $t('admin.businessHours.presets.allWeek') }}
        </button>
        <button type="button" class="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200 hover:ring-primary-300 transition" @click="copyMondayToAll">
          {{ $t('admin.businessHours.presets.copyMonday') }}
        </button>
      </div>

      <div class="space-y-2">
        <div v-for="day in days" :key="day.dayOfWeek" class="rounded-xl bg-white/60 ring-1 ring-slate-200/80 p-3">
          <div class="flex items-center gap-3">
            <label class="inline-flex items-center gap-2 min-w-[110px]">
              <input type="checkbox" :checked="day.isOpen" class="size-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" @change="toggleDay(day)">
              <span class="text-sm font-medium text-slate-900 capitalize">{{ $t(`admin.businessHours.days.${ISO_DAYS[day.dayOfWeek - 1].key}`) }}</span>
            </label>

            <div v-if="!day.isOpen" class="text-xs text-slate-500 italic">{{ $t('admin.businessHours.closed') }}</div>

            <div v-else class="flex-1 space-y-1.5">
              <div v-for="(range, idx) in day.ranges" :key="idx" class="flex items-center gap-2">
                <input v-model="range.startTime" type="time" step="900" class="rounded-lg border border-slate-200 bg-white/90 px-2 py-1 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <span class="text-xs text-slate-400">–</span>
                <input v-model="range.endTime" type="time" step="900" class="rounded-lg border border-slate-200 bg-white/90 px-2 py-1 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <button v-if="day.ranges.length > 1" type="button" class="ml-auto text-xs text-danger-600 hover:text-danger-700" @click="removeRange(day, idx)">
                  {{ $t('admin.businessHours.removeBlock') }}
                </button>
              </div>
              <button v-if="day.ranges.length < 3" type="button" class="text-xs font-medium text-primary-700 hover:text-primary-800" @click="addRange(day)">
                {{ $t('admin.businessHours.addSecondBlock') }}
              </button>
            </div>
          </div>
          <ul v-if="dayErrors[day.dayOfWeek]" class="mt-2 space-y-0.5 pl-[125px] text-xs text-danger-700">
            <li v-for="(msg, i) in dayErrors[day.dayOfWeek]" :key="i">{{ msg }}</li>
          </ul>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.businessHours.settings.slotGranularity') }}</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model.number="settings.slotGranularityMinutes" type="number" min="5" max="240" step="5" class="w-24 rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <span class="text-xs text-slate-500">{{ $t('admin.businessHours.settings.minutes') }}</span>
          </div>
          <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.businessHours.settings.slotGranularityHelp') }}</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.businessHours.settings.buffer') }}</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model.number="settings.bufferMinutes" type="number" min="0" max="240" step="5" class="w-24 rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <span class="text-xs text-slate-500">{{ $t('admin.businessHours.settings.minutes') }}</span>
          </div>
          <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.businessHours.settings.bufferHelp') }}</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.businessHours.settings.defaultDuration') }}</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model.number="settings.defaultDurationMinutes" type="number" min="5" max="480" step="5" class="w-24 rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <span class="text-xs text-slate-500">{{ $t('admin.businessHours.settings.minutes') }}</span>
          </div>
          <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.businessHours.settings.defaultDurationHelp') }}</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.businessHours.settings.minNotice') }}</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model.number="settings.minNoticeHours" type="number" min="0" max="168" step="1" class="w-24 rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <span class="text-xs text-slate-500">{{ $t('admin.businessHours.settings.hours') }}</span>
          </div>
          <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.businessHours.settings.minNoticeHelp') }}</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700">{{ $t('admin.businessHours.settings.maxAdvance') }}</label>
          <div class="mt-1 flex items-center gap-2">
            <input v-model.number="settings.maxAdvanceDays" type="number" min="1" max="730" step="1" class="w-24 rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <span class="text-xs text-slate-500">{{ $t('admin.businessHours.settings.days') }}</span>
          </div>
          <p class="mt-1 text-[11px] text-slate-500">{{ $t('admin.businessHours.settings.maxAdvanceHelp') }}</p>
        </div>
      </div>

      <p v-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 p-3 text-sm text-danger-700">{{ error }}</p>
      <p v-if="success" class="rounded-xl border border-success-200 bg-success-50/80 p-3 text-sm text-success-700">{{ success }}</p>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button type="button" :disabled="saving || hasErrors" class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 shadow-glass transition" @click="onSave">
          {{ saving ? $t('common.saving') : $t('admin.businessHours.save') }}
        </button>
      </div>
    </template>
  </section>
</template>
