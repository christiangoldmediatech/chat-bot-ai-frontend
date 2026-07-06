/**
 * Directiva `v-tilt` — inclinación 3D que sigue al cursor + glow radial.
 *
 * El elemento debe llevar la clase `tilt-card` (y opcionalmente un hijo
 * `.tilt-glow`); aquí solo se actualizan las CSS vars --rx/--ry/--mx/--my.
 * Se desactiva en dispositivos sin hover (táctiles) y con
 * prefers-reduced-motion, donde el layout queda estático.
 */
export default defineNuxtPlugin((nuxtApp) => {
  type TiltEl = HTMLElement & { _tiltMove?: (e: PointerEvent) => void, _tiltLeave?: () => void }

  const MAX_DEG = 7

  nuxtApp.vueApp.directive('tilt', {
    mounted(el: TiltEl) {
      const canTilt = window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches
      if (!canTilt) return

      const onMove = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect()
        const px = (e.clientX - rect.left) / rect.width
        const py = (e.clientY - rect.top) / rect.height
        el.style.setProperty('--ry', `${(px - 0.5) * 2 * MAX_DEG}deg`)
        el.style.setProperty('--rx', `${(0.5 - py) * 2 * MAX_DEG}deg`)
        el.style.setProperty('--mx', `${px * 100}%`)
        el.style.setProperty('--my', `${py * 100}%`)
      }

      const onLeave = () => {
        el.style.setProperty('--rx', '0deg')
        el.style.setProperty('--ry', '0deg')
      }

      el.addEventListener('pointermove', onMove, { passive: true })
      el.addEventListener('pointerleave', onLeave)
      el._tiltMove = onMove
      el._tiltLeave = onLeave
    },
    unmounted(el: TiltEl) {
      if (el._tiltMove) el.removeEventListener('pointermove', el._tiltMove)
      if (el._tiltLeave) el.removeEventListener('pointerleave', el._tiltLeave)
    },
  })
})
