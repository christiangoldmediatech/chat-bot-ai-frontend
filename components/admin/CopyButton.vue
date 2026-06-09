<script setup lang="ts">
const props = withDefaults(defineProps<{
  /** Value to copy to clipboard. */
  value: string
  /** Visual tone: 'light' for glass cards, 'dark' for slate-900 cards. */
  tone?: 'light' | 'dark'
  /** Show a text label next to the icon. */
  label?: string
  /** A11y label for icon-only mode. */
  ariaLabel?: string
}>(), {
  tone: 'light',
  ariaLabel: 'Copy to clipboard',
})

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function onCopy(): Promise<void> {
  if (!import.meta.client || !props.value) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.value)
    } else {
      // Fallback for older browsers / non-secure contexts.
      const el = document.createElement('textarea')
      el.value = props.value
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { copied.value = false }, 1800)
  } catch {
    // Silent fail — user can fall back to manual selection.
  }
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
    :class="tone === 'dark'
      ? (copied ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 ring-1 ring-slate-700 focus-visible:ring-indigo-500 focus-visible:ring-offset-slate-900')
      : (copied ? 'bg-success-100 text-success-700 ring-1 ring-success-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 ring-1 ring-slate-200 focus-visible:ring-primary-500')"
    :aria-label="ariaLabel"
    :title="copied ? 'Copied!' : ariaLabel"
    @click="onCopy"
  >
    <!-- Check icon (copied state) -->
    <svg v-if="copied" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
    <!-- Copy icon -->
    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
    <span v-if="label || copied">{{ copied ? 'Copied' : label }}</span>
  </button>
</template>
