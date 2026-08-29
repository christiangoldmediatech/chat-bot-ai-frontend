<script setup lang="ts">
interface Props {
  variant?: 'mark' | 'wordmark' | 'full' | 'wordmark-draw'
  size?: number | string
  alt?: string
  rounded?: string
  tone?: 'pearl' | 'mono' | 'mist'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'mark',
  size: 36,
  alt: 'LURVIAX',
  rounded: 'rounded-xl',
  tone: 'pearl',
})

const dimension = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size,
)

const strokeColor = computed(() => {
  if (props.tone === 'mono') return 'currentColor'
  if (props.tone === 'mist') return 'rgba(255,255,255,0.72)'
  return '#ffffff'
})

const gradId = `lurviax-grad-${Math.random().toString(36).slice(2, 8)}`

const drawEl = ref<SVGTextElement | null>(null)

onMounted(() => {
  if (props.variant !== 'wordmark-draw' || !drawEl.value) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return
  const el = drawEl.value
  el.style.transition = 'letter-spacing 1.2s cubic-bezier(.2,.8,.3,1), opacity 900ms ease'
  el.style.letterSpacing = '1.4em'
  el.style.opacity = '0'
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.letterSpacing = '0.35em'
      el.style.opacity = '1'
    })
  })
})
</script>

<template>
  <svg
    v-if="variant === 'mark'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    :width="dimension"
    :height="dimension"
    :style="{ width: dimension, height: dimension }"
    :class="['shrink-0 select-none', rounded]"
    role="img"
    :aria-label="alt"
  >
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#5BE9EC" />
        <stop offset="100%" stop-color="#077DDC" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="64" height="64" rx="14" :fill="`url(#${gradId})`" />
    <g fill="#ffffff">
      <path d="M22 16 L30 16 L30 40 L46 40 L46 48 L22 48 Z" />
    </g>
  </svg>

  <svg
    v-else-if="variant === 'wordmark'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 620 140"
    :height="dimension"
    :style="{ height: dimension }"
    class="shrink-0 select-none"
    role="img"
    :aria-label="alt"
  >
    <text
      x="310"
      y="92"
      text-anchor="middle"
      font-family='Archivo, "Chivo", ui-sans-serif, system-ui, sans-serif'
      font-size="88"
      font-weight="200"
      letter-spacing="0.35em"
      :fill="strokeColor"
      style="font-variation-settings: 'wdth' 100, 'wght' 200;"
    >LURVIAX</text>
  </svg>

  <svg
    v-else-if="variant === 'wordmark-draw'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 620 150"
    :height="dimension"
    :style="{ height: dimension }"
    class="lurviax-mark shrink-0 select-none overflow-visible"
    role="img"
    :aria-label="alt"
  >
    <text
      ref="drawEl"
      x="310"
      y="100"
      text-anchor="middle"
      font-family='Archivo, "Chivo", ui-sans-serif, system-ui, sans-serif'
      font-size="88"
      font-weight="200"
      letter-spacing="0.35em"
      :fill="strokeColor"
      style="font-variation-settings: 'wdth' 100, 'wght' 200;"
    >LURVIAX</text>
  </svg>

  <svg
    v-else
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 620 190"
    :height="dimension"
    :style="{ height: dimension }"
    class="shrink-0 select-none"
    role="img"
    :aria-label="alt"
  >
    <text
      x="310"
      y="92"
      text-anchor="middle"
      font-family='Archivo, "Chivo", ui-sans-serif, system-ui, sans-serif'
      font-size="88"
      font-weight="200"
      letter-spacing="0.35em"
      :fill="strokeColor"
      style="font-variation-settings: 'wdth' 100, 'wght' 200;"
    >LURVIAX</text>
    <text
      x="310"
      y="150"
      text-anchor="middle"
      font-family='"Chivo Mono", ui-monospace, monospace'
      font-size="14"
      font-weight="500"
      letter-spacing="8"
      :fill="strokeColor"
      opacity="0.75"
    >PLATAFORMA DE ASISTENTES INTELIGENTES</text>
  </svg>
</template>
