import type { Ref } from 'vue'

interface MagneticOptions {
  radius?: number
  strength?: number
  lerpAmount?: number
}

export function useMagnetic(target: Ref<HTMLElement | null>, options: MagneticOptions = {}) {
  const radius = options.radius ?? 120
  const strength = options.strength ?? 0.32
  const lerpAmount = options.lerpAmount ?? 0.18

  let rafId = 0
  let currentX = 0
  let currentY = 0
  let targetX = 0
  let targetY = 0
  let running = false
  let enabled = true

  function animate() {
    if (!running) return
    currentX += (targetX - currentX) * lerpAmount
    currentY += (targetY - currentY) * lerpAmount
    const el = target.value
    if (el) el.style.transform = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px)`
    if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
      rafId = requestAnimationFrame(animate)
    }
    else {
      running = false
      if (el && targetX === 0 && targetY === 0) el.style.transform = ''
    }
  }

  function kick() {
    if (running) return
    running = true
    rafId = requestAnimationFrame(animate)
  }

  function onPointerMove(ev: PointerEvent) {
    if (!enabled) return
    const el = target.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = ev.clientX - cx
    const dy = ev.clientY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < radius) {
      const pull = 1 - dist / radius
      targetX = dx * strength * pull
      targetY = dy * strength * pull
      kick()
    }
    else if (targetX !== 0 || targetY !== 0) {
      targetX = 0
      targetY = 0
      kick()
    }
  }

  function onPointerLeave() {
    targetX = 0
    targetY = 0
    kick()
  }

  onMounted(() => {
    enabled = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!enabled) return
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave, { passive: true })
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId)
    running = false
    if (enabled) {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
    }
  })
}
