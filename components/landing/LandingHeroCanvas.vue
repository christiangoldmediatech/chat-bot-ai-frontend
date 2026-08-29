<script setup lang="ts">
/**
 * Fondo animado del landing (LURVIAX — dark commit).
 *
 * Un `<canvas>` 2D a pantalla completa que dibuja tres "hebras" sinusoidales
 * horizontales cerca del centro vertical. Cada hebra combina tres frecuencias
 * distintas y se pinta con un gradiente cyan → mint → cyan a lo largo del
 * eje X. El scroll inyecta un `boost` de amplitud proporcional al delta →
 * las hebras "reaccionan" al desplazamiento y luego decaen.
 *
 * Es mucho más liviano que la escena Three.js anterior (sin WebGL, sin
 * geometrías/materiales) y se lee como una firma minimal, tipo signal
 * flowing across the void — encaja con el motif del arte de marca.
 *
 * - `prefers-reduced-motion` renderiza un solo frame estático.
 * - El rAF se pausa al ocultar la pestaña y se libera en unmount.
 * - `position: fixed` en el canvas — vive detrás de todo el landing.
 */

const canvas = ref<HTMLCanvasElement | null>(null)

let ctx: CanvasRenderingContext2D | null = null
let dpr = 1
let w = 0
let h = 0

let rafId = 0
let running = false
let reducedMotion = false
let t0 = 0
let boost = 0
let lastScrollY = 0

// Tres hebras con amp/velocidad/opacidad distintas para que ninguna se
// solape rítmicamente con las otras.
const STRANDS = [
  { amp: 34, width: 1.4, alpha: 0.40, speed: 0.55, offset: 0, f1: 0.0030, f2: 0.0079 },
  { amp: 26, width: 1.1, alpha: 0.26, speed: 0.78, offset: 26, f1: 0.0042, f2: 0.0061 },
  { amp: 44, width: 0.9, alpha: 0.16, speed: 0.38, offset: -34, f1: 0.0021, f2: 0.0093 },
]

function size() {
  if (!canvas.value || !ctx) return
  w = window.innerWidth
  h = window.innerHeight
  canvas.value.width = w * dpr
  canvas.value.height = h * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function onResize() { size() }

function onScroll() {
  const d = Math.abs(window.scrollY - lastScrollY)
  lastScrollY = window.scrollY
  boost = Math.min(boost + d * 0.012, 2.2)
}

function onVisibility() {
  if (document.hidden) stopLoop()
  else startLoop()
}

function startLoop() {
  if (running || reducedMotion || !ctx) return
  running = true
  rafId = requestAnimationFrame(frame)
}

function stopLoop() {
  running = false
  cancelAnimationFrame(rafId)
}

function frame(now: number) {
  if (!running || !ctx) return
  const t = (now - t0) / 1000
  boost *= 0.94 // decae exponencialmente hacia 0 cuando el usuario frena
  ctx.clearRect(0, 0, w, h)
  const cy = h * 0.58

  for (let s = 0; s < STRANDS.length; s++) {
    const S = STRANDS[s]!
    const g = ctx.createLinearGradient(0, 0, w, 0)
    // Gradiente lateral: cyan invisible en los bordes, halo brillante al
    // centro. Multiplicamos la alpha central por 1.5 para el pop.
    g.addColorStop(0, 'rgba(91,233,236,0)')
    g.addColorStop(0.28, `rgba(7,125,220,${S.alpha})`)
    g.addColorStop(0.55, `rgba(91,233,236,${S.alpha * 1.5})`)
    g.addColorStop(0.78, `rgba(7,125,220,${S.alpha})`)
    g.addColorStop(1, 'rgba(91,233,236,0)')
    ctx.strokeStyle = g
    ctx.lineWidth = S.width
    ctx.beginPath()
    for (let x = 0; x <= w; x += 6) {
      // Envolvente sinusoidal → la hebra tiene 0 amplitud en los bordes.
      const env = Math.sin(Math.PI * (x / w))
      const amp = S.amp * (1 + boost * 0.6)
      const y = cy + S.offset + env * amp * (
        Math.sin(x * S.f1 + t * S.speed + s * 1.7) * 0.62
        + Math.sin(x * S.f2 - t * (S.speed * 1.6) + s * 0.6) * 0.28
        + Math.sin(x * 0.0013 + t * 0.24) * 0.34
      )
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  rafId = requestAnimationFrame(frame)
}

onMounted(() => {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')
  if (!ctx) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  size()
  lastScrollY = window.scrollY
  t0 = performance.now()

  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)

  if (reducedMotion) {
    // Un frame estático para dejar la firma visible sin bucle.
    frame(t0)
  }
  else {
    startLoop()
  }
})

onBeforeUnmount(() => {
  stopLoop()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('visibilitychange', onVisibility)
  ctx = null
})
</script>

<template>
  <canvas
    ref="canvas"
    class="fixed inset-0 z-[1] w-full h-full pointer-events-none"
    aria-hidden="true"
  />
</template>
