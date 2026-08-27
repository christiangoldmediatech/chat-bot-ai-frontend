<script setup lang="ts">
// ALIA brand mark. Cuatro variantes comparten el wordmark geométrico de
// cuatro trazos (A · L · I · A). Sin serifas, sólo líneas rectas — el
// espíritu "dark commit" del arte de marca.
//
//   • mark     — tile cuadrado con la letra A (avatar / favicon).
//   • wordmark — ALIA completo, sin tagline.
//   • full     — ALIA + "ASISTENTE INTELIGENTE" debajo.
//   • wordmark-draw — igual que wordmark, pero al montar se dibujan los
//     trazos usando stroke-dasharray/dashoffset (efecto pluma sobre papel).
//
// Tone `mono` usa currentColor para el trazo; el default `pearl` usa el
// blanco perlado #E9F6F2 del token pearl.

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
  alt: 'ALIA',
  rounded: 'rounded-xl',
  tone: 'pearl',
})

const dimension = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size,
)

const strokeColor = computed(() => {
  if (props.tone === 'mono') return 'currentColor'
  if (props.tone === 'mist') return '#8AAFA7'
  return '#E9F6F2'
})

// Suffix estable por instancia para el id del gradient del mark — evita
// colisiones cuando hay más de un logo en la misma página.
const gradId = `alia-grad-${Math.random().toString(36).slice(2, 8)}`

// Refs a los paths del wordmark-draw para animar el trazo al montar.
const drawPaths = ref<SVGPathElement[]>([])

onMounted(() => {
  if (props.variant !== 'wordmark-draw') return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  drawPaths.value.forEach((p, i) => {
    if (!p) return
    const len = p.getTotalLength()
    p.style.strokeDasharray = String(len)
    p.style.strokeDashoffset = reduce ? '0' : String(len)
    if (!reduce) {
      p.style.transition = `stroke-dashoffset 1.15s cubic-bezier(.55,.06,.24,1) ${0.18 + i * 0.19}s`
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          p.style.strokeDashoffset = '0'
        })
      })
    }
  })
})
</script>

<template>
  <!-- MARK: tile cuadrado con letra A. Drop-in para avatar / favicon. -->
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
        <stop offset="0%" stop-color="#58F0CE" />
        <stop offset="100%" stop-color="#2FB99B" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="64" height="64" rx="14" :fill="`url(#${gradId})`" />
    <!-- Letra A: dos trazos que replican el wordmark, escalados al tile. -->
    <g fill="none" stroke="#04100E" stroke-width="5" stroke-linecap="butt" stroke-linejoin="miter">
      <path d="M14 48 L32 16 L50 48" />
    </g>
  </svg>

  <!-- WORDMARK: ALIA completo, sin animación. -->
  <svg
    v-else-if="variant === 'wordmark'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 450 140"
    :height="dimension"
    :style="{ height: dimension }"
    class="shrink-0 select-none"
    role="img"
    :aria-label="alt"
  >
    <g fill="none" :stroke="strokeColor" stroke-width="7" stroke-linecap="butt">
      <path d="M5 120 L50 20 L95 120" />
      <path d="M155 20 L155 120 L235 120" />
      <path d="M295 20 L295 120" />
      <path d="M355 120 L400 20 L445 120" />
    </g>
  </svg>

  <!-- WORDMARK-DRAW: wordmark que se dibuja solo al montar (stroke-dasharray). -->
  <svg
    v-else-if="variant === 'wordmark-draw'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 450 150"
    :height="dimension"
    :style="{ height: dimension }"
    class="alia-mark shrink-0 select-none overflow-visible"
    role="img"
    :aria-label="alt"
  >
    <g fill="none" :stroke="strokeColor" stroke-width="4.2" stroke-linecap="butt" stroke-linejoin="miter">
      <path :ref="el => { if (el) drawPaths[0] = el as SVGPathElement }" d="M5 120 L50 20 L95 120" />
      <path :ref="el => { if (el) drawPaths[1] = el as SVGPathElement }" d="M155 20 L155 120 L235 120" />
      <path :ref="el => { if (el) drawPaths[2] = el as SVGPathElement }" d="M295 20 L295 120" />
      <path :ref="el => { if (el) drawPaths[3] = el as SVGPathElement }" d="M355 120 L400 20 L445 120" />
    </g>
  </svg>

  <!-- FULL: wordmark + tagline debajo. -->
  <svg
    v-else
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 450 190"
    :height="dimension"
    :style="{ height: dimension }"
    class="shrink-0 select-none"
    role="img"
    :aria-label="alt"
  >
    <g fill="none" :stroke="strokeColor" stroke-width="7" stroke-linecap="butt">
      <path d="M5 120 L50 20 L95 120" />
      <path d="M155 20 L155 120 L235 120" />
      <path d="M295 20 L295 120" />
      <path d="M355 120 L400 20 L445 120" />
    </g>
    <text
      x="225"
      y="170"
      text-anchor="middle"
      font-family='"Chivo Mono", ui-monospace, monospace'
      font-size="14"
      font-weight="500"
      letter-spacing="7"
      :fill="strokeColor"
      opacity="0.7"
    >ASISTENTE INTELIGENTE</text>
  </svg>
</template>
