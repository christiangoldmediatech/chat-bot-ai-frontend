<script setup lang="ts">
import type { MeetingsByCustomerResponse } from '~/types/dashboard'

const props = defineProps<{
  data: MeetingsByCustomerResponse | null
  loading?: boolean
  sort: 'scheduled' | 'cancelled' | 'cancellationRate' | 'lastMeetingAt'
}>()

const emit = defineEmits<{
  'update:sort': [v: 'scheduled' | 'cancelled' | 'cancellationRate' | 'lastMeetingAt']
  'update:page': [v: number]
}>()

const { percent, day } = useDateFormat()

function highlight(rate: number, scheduled: number): string {
  // Only highlight when there's enough sample (3+ meetings) and > 40% cancellation.
  if (scheduled >= 3 && rate >= 0.4) return 'text-danger-700 font-semibold'
  return 'text-slate-700'
}

function nextPage(): void {
  if (!props.data) return
  const maxPage = Math.ceil(props.data.total / props.data.pageSize)
  if (props.data.page < maxPage) emit('update:page', props.data.page + 1)
}
function prevPage(): void {
  if (!props.data) return
  if (props.data.page > 1) emit('update:page', props.data.page - 1)
}
</script>

<template>
  <section class="rounded-2xl bg-white backdrop-blur-xl ring-1 ring-white/60 shadow-glass p-4">
    <header class="mb-3">
      <h3 class="text-sm font-semibold text-slate-900">{{ $t('admin.dashboard.meetings.byCustomerTitle') }}</h3>
      <p class="text-[11px] text-slate-500 mt-0.5 max-w-lg">
        {{ $t('admin.dashboard.meetings.byCustomerSubtitle') }}
      </p>
    </header>

    <div v-if="loading" class="h-40 rounded-xl bg-slate-100/60 animate-pulse" />

    <div v-else-if="data && data.rows.length > 0" class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="text-xs uppercase tracking-wider text-slate-600 font-medium">
          <tr class="border-b border-slate-100">
            <th class="text-left px-3 py-2">{{ $t('admin.dashboard.meetings.col.customer') }}</th>
            <th class="text-right px-3 py-2 cursor-pointer" @click="emit('update:sort', 'scheduled')">
              {{ $t('admin.dashboard.meetings.col.scheduled') }}
              <span v-if="sort === 'scheduled'">↓</span>
            </th>
            <th class="text-right px-3 py-2 cursor-pointer" @click="emit('update:sort', 'cancelled')">
              {{ $t('admin.dashboard.meetings.col.cancelled') }}
              <span v-if="sort === 'cancelled'">↓</span>
            </th>
            <th class="text-right px-3 py-2">{{ $t('admin.dashboard.meetings.col.noShow') }}</th>
            <th class="text-right px-3 py-2 cursor-pointer" @click="emit('update:sort', 'cancellationRate')">
              {{ $t('admin.dashboard.meetings.col.cancellationRate') }}
              <span v-if="sort === 'cancellationRate'">↓</span>
            </th>
            <th class="text-left px-3 py-2 cursor-pointer" @click="emit('update:sort', 'lastMeetingAt')">
              {{ $t('admin.dashboard.meetings.col.lastMeeting') }}
              <span v-if="sort === 'lastMeetingAt'">↓</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="r in data.rows" :key="r.customerPhone">
            <td class="px-3 py-2">
              <div class="font-medium text-slate-800">
                {{ r.customerName || $t('admin.dashboard.today.noName') }}
              </div>
              <div class="text-[11px] text-slate-500 font-mono">
                {{ r.customerPhone }}
              </div>
            </td>
            <td class="px-3 py-2 text-right font-mono tabular-nums text-slate-900 font-medium">{{ r.scheduled }}</td>
            <td class="px-3 py-2 text-right font-mono tabular-nums" :class="r.cancelled > 0 ? 'text-danger-700 font-medium' : 'text-slate-500'">{{ r.cancelled }}</td>
            <td class="px-3 py-2 text-right font-mono tabular-nums" :class="r.noShow > 0 ? 'text-amber-700 font-medium' : 'text-slate-500'">{{ r.noShow }}</td>
            <td class="px-3 py-2 text-right font-mono tabular-nums" :class="highlight(r.cancellationRate, r.scheduled)">
              {{ r.scheduled === 0 ? '—' : percent(r.cancellationRate, 0) }}
            </td>
            <td class="px-3 py-2 text-xs text-slate-700">
              {{ r.lastMeetingAt ? day(r.lastMeetingAt) : '—' }}
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="data.total > data.pageSize" class="flex items-center justify-between mt-3">
        <span class="text-xs text-slate-500">
          {{ $t('admin.dashboard.meetings.total', { total: data.total }) }}
        </span>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            :disabled="data.page <= 1"
            @click="prevPage()"
          >
            ←
          </button>
          <span class="text-xs text-slate-400 self-center">{{ data.page }}</span>
          <button
            type="button"
            class="rounded-lg px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            :disabled="data.page * data.pageSize >= data.total"
            @click="nextPage()"
          >
            →
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-xs text-slate-400 py-6 text-center">
      {{ $t('admin.dashboard.meetings.emptyByCustomer') }}
    </div>
  </section>
</template>
