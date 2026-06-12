<script setup lang="ts">
type Tone = 'default' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky'
type IconKey = 'bots' | 'conversations' | 'humans' | 'customers' | 'messages' | 'clock'

const props = withDefaults(defineProps<{
  label: string
  value: string | number
  hint?: string
  tone?: Tone
  icon?: IconKey
  to?: string
}>(), {
  tone: 'default',
})

/**
 * Per-tone visual recipe. We layer:
 *  - `card`     — full-card gradient tint (visible color on white bg).
 *  - `ring`     — colored border so the card edge picks up the tone.
 *  - `shadow`   — soft ambient shadow that wraps around the card (top + bottom)
 *                 with a faint tone-tint, plus a deeper neutral drop shadow.
 *  - `glow`     — radial halo behind the icon corner for depth.
 *  - `iconBg`   — solid gradient pill so the icon pops over the white text area.
 *  - `value`    — color of the big number (subtle tint, not full saturation).
 */
const toneClasses = computed<Record<Tone, {
  card: string
  ring: string
  ringHover: string
  shadow: string
  shadowHover: string
  glow: string
  iconBg: string
  value: string
  label: string
}>>(() => ({
  default: {
    card: 'bg-gradient-to-br from-slate-50 via-white to-white',
    ring: 'ring-slate-200/70',
    ringHover: 'hover:ring-slate-300',
    shadow: 'shadow-[0_8px_28px_-12px_rgba(15,23,42,0.16),0_4px_10px_-6px_rgba(15,23,42,0.08),0_-2px_8px_-4px_rgba(15,23,42,0.04)]',
    shadowHover: 'hover:shadow-[0_18px_40px_-16px_rgba(15,23,42,0.22),0_6px_14px_-6px_rgba(15,23,42,0.12),0_-2px_10px_-4px_rgba(15,23,42,0.05)]',
    glow: 'bg-slate-300/30',
    iconBg: 'bg-gradient-to-br from-slate-500 to-slate-700 ring-slate-300/50',
    value: 'text-slate-900',
    label: 'text-slate-500',
  },
  indigo: {
    card: 'bg-gradient-to-br from-indigo-50 via-white to-white',
    ring: 'ring-indigo-200/70',
    ringHover: 'hover:ring-indigo-300',
    shadow: 'shadow-[0_8px_28px_-12px_rgba(79,70,229,0.25),0_4px_10px_-6px_rgba(79,70,229,0.12),0_-2px_8px_-4px_rgba(79,70,229,0.06)]',
    shadowHover: 'hover:shadow-[0_18px_40px_-16px_rgba(79,70,229,0.32),0_6px_14px_-6px_rgba(79,70,229,0.16),0_-2px_10px_-4px_rgba(79,70,229,0.08)]',
    glow: 'bg-indigo-300/40',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600 ring-indigo-300/60',
    value: 'text-indigo-900',
    label: 'text-indigo-700/80',
  },
  emerald: {
    card: 'bg-gradient-to-br from-emerald-50 via-white to-white',
    ring: 'ring-emerald-200/70',
    ringHover: 'hover:ring-emerald-300',
    shadow: 'shadow-[0_8px_28px_-12px_rgba(16,185,129,0.28),0_4px_10px_-6px_rgba(16,185,129,0.14),0_-2px_8px_-4px_rgba(16,185,129,0.06)]',
    shadowHover: 'hover:shadow-[0_18px_40px_-16px_rgba(16,185,129,0.34),0_6px_14px_-6px_rgba(16,185,129,0.18),0_-2px_10px_-4px_rgba(16,185,129,0.08)]',
    glow: 'bg-emerald-300/40',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-emerald-300/60',
    value: 'text-emerald-900',
    label: 'text-emerald-700/80',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-50 via-white to-white',
    ring: 'ring-amber-200/70',
    ringHover: 'hover:ring-amber-300',
    shadow: 'shadow-[0_8px_28px_-12px_rgba(245,158,11,0.30),0_4px_10px_-6px_rgba(245,158,11,0.15),0_-2px_8px_-4px_rgba(245,158,11,0.07)]',
    shadowHover: 'hover:shadow-[0_18px_40px_-16px_rgba(245,158,11,0.36),0_6px_14px_-6px_rgba(245,158,11,0.18),0_-2px_10px_-4px_rgba(245,158,11,0.08)]',
    glow: 'bg-amber-300/40',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500 ring-amber-300/60',
    value: 'text-amber-900',
    label: 'text-amber-700/80',
  },
  rose: {
    card: 'bg-gradient-to-br from-rose-50 via-white to-white',
    ring: 'ring-rose-200/70',
    ringHover: 'hover:ring-rose-300',
    shadow: 'shadow-[0_8px_28px_-12px_rgba(244,63,94,0.28),0_4px_10px_-6px_rgba(244,63,94,0.14),0_-2px_8px_-4px_rgba(244,63,94,0.06)]',
    shadowHover: 'hover:shadow-[0_18px_40px_-16px_rgba(244,63,94,0.34),0_6px_14px_-6px_rgba(244,63,94,0.18),0_-2px_10px_-4px_rgba(244,63,94,0.08)]',
    glow: 'bg-rose-300/40',
    iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600 ring-rose-300/60',
    value: 'text-rose-900',
    label: 'text-rose-700/80',
  },
  sky: {
    card: 'bg-gradient-to-br from-sky-50 via-white to-white',
    ring: 'ring-sky-200/70',
    ringHover: 'hover:ring-sky-300',
    shadow: 'shadow-[0_8px_28px_-12px_rgba(14,165,233,0.28),0_4px_10px_-6px_rgba(14,165,233,0.14),0_-2px_8px_-4px_rgba(14,165,233,0.06)]',
    shadowHover: 'hover:shadow-[0_18px_40px_-16px_rgba(14,165,233,0.34),0_6px_14px_-6px_rgba(14,165,233,0.18),0_-2px_10px_-4px_rgba(14,165,233,0.08)]',
    glow: 'bg-sky-300/40',
    iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600 ring-sky-300/60',
    value: 'text-sky-900',
    label: 'text-sky-700/80',
  },
}))

const palette = computed(() => toneClasses.value[props.tone])
</script>

<template>
  <!-- Two paths según haya `to`. Antes usábamos <component :is="to ? 'NuxtLink' : 'div'">
       pero el resolver por string ocasionalmente no engancha a NuxtLink en
       producción (queda como <nuxtlink>) y el click no navega. Con v-if/v-else
       el componente real se importa siempre. -->
  <NuxtLink
    v-if="to"
    :to="to"
    class="group relative block overflow-hidden rounded-2xl ring-1 p-5 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 no-underline"
    :class="[palette.card, palette.ring, palette.shadow, palette.ringHover, palette.shadowHover]"
  >
    <!-- Soft halo behind the icon corner -->
    <span
      :class="['pointer-events-none absolute -top-10 -right-10 size-32 rounded-full blur-3xl opacity-70', palette.glow]"
      aria-hidden="true"
    />

    <div class="relative flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-[11px] uppercase tracking-wider font-semibold" :class="palette.label">{{ label }}</div>
        <div class="mt-2 text-3xl font-bold tabular-nums tracking-tight" :class="palette.value">{{ value }}</div>
        <div v-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</div>
      </div>
      <div
        v-if="icon"
        class="flex size-11 shrink-0 items-center justify-center rounded-xl text-white ring-1 shadow-sm"
        :class="palette.iconBg"
      >
        <svg v-if="icon === 'bots'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" />
          <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
        <svg v-else-if="icon === 'conversations'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <svg v-else-if="icon === 'humans'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <svg v-else-if="icon === 'customers'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <svg v-else-if="icon === 'messages'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <svg v-else-if="icon === 'clock'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
    </div>
  </NuxtLink>

  <div
    v-else
    class="group relative overflow-hidden rounded-2xl ring-1 p-5 transition-all duration-200"
    :class="[palette.card, palette.ring, palette.shadow]"
  >
    <span
      :class="['pointer-events-none absolute -top-10 -right-10 size-32 rounded-full blur-3xl opacity-70', palette.glow]"
      aria-hidden="true"
    />
    <div class="relative flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-[11px] uppercase tracking-wider font-semibold" :class="palette.label">{{ label }}</div>
        <div class="mt-2 text-3xl font-bold tabular-nums tracking-tight" :class="palette.value">{{ value }}</div>
        <div v-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</div>
      </div>
      <div
        v-if="icon"
        class="flex size-11 shrink-0 items-center justify-center rounded-xl text-white ring-1 shadow-sm"
        :class="palette.iconBg"
      >
        <svg v-if="icon === 'bots'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" />
          <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
        <svg v-else-if="icon === 'conversations'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <svg v-else-if="icon === 'humans'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <svg v-else-if="icon === 'customers'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <svg v-else-if="icon === 'messages'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <svg v-else-if="icon === 'clock'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
    </div>
  </div>
</template>
