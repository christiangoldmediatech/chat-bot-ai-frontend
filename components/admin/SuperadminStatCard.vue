<script setup lang="ts">
type Tone = 'default' | 'indigo' | 'emerald' | 'amber' | 'rose'

const props = withDefaults(defineProps<{
  label: string
  value: string | number
  hint?: string
  icon?: 'companies' | 'users' | 'bots' | 'conversations' | 'documents'
  tone?: Tone
}>(), {
  tone: 'default',
})

const toneClasses = computed<Record<Tone, { ring: string, bg: string, icon: string }>>(() => ({
  default: { ring: 'ring-slate-700', bg: 'bg-slate-800/60', icon: 'text-slate-300' },
  indigo: { ring: 'ring-indigo-500/30', bg: 'bg-indigo-500/10', icon: 'text-indigo-300' },
  emerald: { ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10', icon: 'text-emerald-300' },
  amber: { ring: 'ring-amber-500/30', bg: 'bg-amber-500/10', icon: 'text-amber-300' },
  rose: { ring: 'ring-rose-500/30', bg: 'bg-rose-500/10', icon: 'text-rose-300' },
}))

const palette = computed(() => toneClasses.value[props.tone])
</script>

<template>
  <div class="rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-[11px] uppercase tracking-wider text-slate-400 font-medium">{{ label }}</div>
        <div class="mt-2 text-3xl font-semibold text-slate-100 tabular-nums tracking-tight">{{ value }}</div>
      </div>
      <div
        v-if="icon"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl ring-1"
        :class="[palette.bg, palette.ring]"
      >
        <svg v-if="icon === 'companies'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" :class="palette.icon" aria-hidden="true">
          <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
          <line x1="9" y1="9" x2="9" y2="9" />
          <line x1="9" y1="13" x2="9" y2="13" />
          <line x1="9" y1="17" x2="9" y2="17" />
        </svg>
        <svg v-else-if="icon === 'users'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" :class="palette.icon" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <svg v-else-if="icon === 'bots'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" :class="palette.icon" aria-hidden="true">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" />
          <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
        <svg v-else-if="icon === 'conversations'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" :class="palette.icon" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <svg v-else-if="icon === 'documents'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" :class="palette.icon" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      </div>
    </div>
    <div v-if="hint" class="mt-2 text-xs text-slate-500">{{ hint }}</div>
  </div>
</template>
