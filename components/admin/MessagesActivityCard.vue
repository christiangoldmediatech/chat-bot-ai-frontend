<script setup lang="ts">
import type { MessagesActivity, MessagesActivityRange } from '~/types/dashboard'

const props = withDefaults(defineProps<{
  data: MessagesActivity
  loading: boolean
  error: string | null
  /** Card heading: 'Daily', 'Weekly', 'Monthly'. */
  title: string
  /** Short description below the title. */
  subtitle: string
  /** Visual accent. */
  tone?: 'primary' | 'success' | 'amber'
  /** Surface theme — `light` for tenant panel, `dark` for superadmin. */
  theme?: 'light' | 'dark'
}>(), {
  theme: 'light',
})

const themeClasses = computed(() => {
  if (props.theme === 'dark') {
    return {
      card: 'bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg',
      title: 'text-slate-100',
      subtitle: 'text-slate-500',
      latestLabel: 'text-slate-500',
      latestValue: 'text-slate-100',
      latestSub: 'text-slate-500',
      skel: 'bg-slate-800/70',
      skelSm: 'bg-slate-800/50',
      footer: 'border-slate-800 text-slate-500',
      footerStrong: 'text-slate-200',
      empty: 'bg-slate-700',
    }
  }
  return {
    card: 'bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass',
    title: 'text-slate-900',
    subtitle: 'text-slate-500',
    latestLabel: 'text-slate-500',
    latestValue: 'text-slate-900',
    latestSub: 'text-slate-500',
    skel: 'bg-slate-200/70',
    skelSm: 'bg-slate-200/60',
    footer: 'border-slate-100 text-slate-500',
    footerStrong: 'text-slate-700',
    empty: 'bg-slate-300',
  }
})

const toneClasses = computed(() => {
  switch (props.tone) {
    case 'success':
      return {
        iconBg: 'bg-success-50 ring-success-100',
        icon: 'text-success-600',
        bar: 'fill-success-500',
        barReceived: 'fill-success-300',
        legendBar: 'bg-success-500',
        legendReceived: 'bg-success-300',
      }
    case 'amber':
      return {
        iconBg: 'bg-amber-50 ring-amber-100',
        icon: 'text-amber-600',
        bar: 'fill-amber-500',
        barReceived: 'fill-amber-300',
        legendBar: 'bg-amber-500',
        legendReceived: 'bg-amber-300',
      }
    case 'primary':
    default:
      return {
        iconBg: 'bg-primary-50 ring-primary-100',
        icon: 'text-primary-600',
        bar: 'fill-primary-500',
        barReceived: 'fill-primary-300',
        legendBar: 'bg-primary-500',
        legendReceived: 'bg-primary-300',
      }
  }
})

// Chart geometry. Compact mini-bars optimised to fit inside a card without
// pulling in a chart library.
const CHART_W = 100
const CHART_H = 60
const GAP_RATIO = 0.25

const maxValue = computed(() => {
  if (!props.data?.series.length) return 1
  return Math.max(1, ...props.data.series.map(b => b.total))
})

const bars = computed(() => {
  const series = props.data?.series ?? []
  if (series.length === 0) return []
  const slot = CHART_W / series.length
  const barWidth = slot * (1 - GAP_RATIO)
  return series.map((b, i) => {
    const totalH = (b.total / maxValue.value) * CHART_H
    const sentH = (b.sent / maxValue.value) * CHART_H
    const x = i * slot + (slot - barWidth) / 2
    return {
      bucket: b.bucket,
      received: b.received,
      sent: b.sent,
      total: b.total,
      x,
      barWidth,
      totalH,
      // Sent stacks on top of received.
      receivedY: CHART_H - (totalH - sentH),
      receivedH: totalH - sentH,
      sentY: CHART_H - totalH,
      sentH,
    }
  })
})

// Latest bucket = the most recent period (today / this week / this month).
const latest = computed(() => {
  const series = props.data?.series ?? []
  return series[series.length - 1] ?? null
})

// Previous bucket — used for the trend arrow vs. the latest one.
const previous = computed(() => {
  const series = props.data?.series ?? []
  return series.length >= 2 ? series[series.length - 2] : null
})

const trendPct = computed<number | null>(() => {
  if (!latest.value || !previous.value) return null
  if (previous.value.total === 0) {
    return latest.value.total > 0 ? 100 : 0
  }
  return Math.round(((latest.value.total - previous.value.total) / previous.value.total) * 100)
})

function formatBucketLabel(iso: string, range: MessagesActivityRange): string {
  const d = new Date(iso)
  if (range === 'day') {
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
  }
  if (range === 'week') {
    return `W ${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}`
  }
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

const latestLabel = computed(() => {
  if (!props.data) return ''
  switch (props.data.range) {
    case 'day': return 'Today'
    case 'week': return 'This week'
    case 'month': return 'This month'
  }
})
</script>

<template>
  <article class="rounded-2xl p-5 flex flex-col gap-4" :class="themeClasses.card">
    <header class="flex items-start gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl ring-1" :class="toneClasses.iconBg">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" :class="toneClasses.icon" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="text-sm font-semibold" :class="themeClasses.title">{{ title }}</h3>
        <p class="text-[11px]" :class="themeClasses.subtitle">{{ subtitle }}</p>
      </div>
    </header>

    <!-- Error -->
    <div v-if="error" class="rounded-xl border border-danger-200 bg-danger-50/80 px-3 py-2 text-xs text-danger-700">
      {{ error }}
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="space-y-3 animate-pulse">
      <div class="h-9 w-20 rounded-lg" :class="themeClasses.skel" />
      <div class="h-[60px] w-full rounded-lg" :class="themeClasses.skel" />
      <div class="h-4 w-32 rounded" :class="themeClasses.skelSm" />
    </div>

    <template v-else>
      <!-- Latest period number + trend -->
      <div class="flex items-end justify-between gap-2">
        <div>
          <p class="text-[10px] uppercase tracking-wider font-semibold" :class="themeClasses.latestLabel">{{ latestLabel }}</p>
          <p class="mt-0.5 text-3xl font-semibold tabular-nums leading-none" :class="themeClasses.latestValue">
            {{ latest?.total?.toLocaleString() ?? 0 }}
          </p>
          <p class="mt-1 text-[11px]" :class="themeClasses.latestSub">
            <span class="font-medium" :class="theme === 'dark' ? 'text-emerald-300' : 'text-success-600'">{{ latest?.sent ?? 0 }}</span> sent ·
            <span class="font-medium" :class="themeClasses.footerStrong">{{ latest?.received ?? 0 }}</span> received
          </p>
        </div>
        <span
          v-if="trendPct !== null"
          class="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1"
          :class="trendPct > 0
            ? 'bg-success-50 text-success-700 ring-success-100'
            : trendPct < 0
              ? 'bg-danger-50 text-danger-700 ring-danger-100'
              : 'bg-slate-100 text-slate-600 ring-slate-200'"
          :title="`vs. previous period`"
        >
          <svg v-if="trendPct > 0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
            <polyline points="6 9 12 3 18 9" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
          <svg v-else-if="trendPct < 0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-3" aria-hidden="true">
            <polyline points="6 15 12 21 18 15" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
          {{ trendPct > 0 ? '+' : '' }}{{ trendPct }}%
        </span>
      </div>

      <!-- Chart -->
      <div class="relative">
        <svg
          :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
          preserveAspectRatio="none"
          class="w-full h-[60px]"
          role="img"
          :aria-label="`${title} message activity chart`"
        >
          <g v-for="(b, i) in bars" :key="i">
            <title>
              {{ formatBucketLabel(b.bucket, data.range) }}: {{ b.total }} ({{ b.sent }} sent, {{ b.received }} received)
            </title>
            <!-- Received (lower part) -->
            <rect
              v-if="b.receivedH > 0"
              :x="b.x"
              :y="b.receivedY"
              :width="b.barWidth"
              :height="b.receivedH"
              :class="toneClasses.barReceived"
              rx="0.6"
            />
            <!-- Sent (upper part) -->
            <rect
              v-if="b.sentH > 0"
              :x="b.x"
              :y="b.sentY"
              :width="b.barWidth"
              :height="b.sentH"
              :class="toneClasses.bar"
              rx="0.6"
            />
            <!-- Empty placeholder bar so a zero bucket is still visible -->
            <rect
              v-if="b.total === 0"
              :x="b.x"
              :y="CHART_H - 1"
              :width="b.barWidth"
              height="1"
              :class="theme === 'dark' ? 'fill-slate-700' : 'fill-slate-300'"
              rx="0.4"
            />
          </g>
        </svg>
      </div>

      <!-- Footer totals -->
      <footer class="flex items-center justify-between pt-2 border-t text-[11px]" :class="themeClasses.footer">
        <div>
          <span class="font-medium tabular-nums" :class="themeClasses.footerStrong">{{ data.totals.total.toLocaleString() }}</span> total
        </div>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1">
            <span class="size-2 rounded-sm" :class="toneClasses.legendBar" />
            Sent
          </span>
          <span class="inline-flex items-center gap-1">
            <span class="size-2 rounded-sm" :class="toneClasses.legendReceived" />
            Received
          </span>
        </div>
      </footer>
    </template>
  </article>
</template>
