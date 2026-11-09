<script setup lang="ts">
import { Application } from '@splinetool/runtime'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import type { FrameData } from '~/data/frames'
import { LANDING_FRAMES } from '~/data/frames'

if (import.meta.client) {
  gsap.registerPlugin(ScrollTrigger)
}

let lenis: Lenis | null = null
let lenisRaf: ((time: number) => void) | null = null

const SPLINE_SCENE_URL = 'https://prod.spline.design/DjxEijUZgTxdoWaw/scene.splinecode'
const SCROLL_HEIGHT_VH = 420

const WAYPOINT_NAMES = [
  'Camera_Beat_0_Outside',
  'Camera_Beat_1_Reception',
  'Camera_Beat_2_ReceptionGallery',
  'Camera_Beat_5_OfficeGallery',
  'Camera_Beat_5_OfficeGallery',
  'Camera_Beat_4_DoctorOffice',
]
const STOP_DURATIONS = [1.2, 1.5, 0.6, 3.0, 1.5]
const TAIL_DURATION = 0.5

const wrapEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const progress = ref(0)
const showFinalCta = ref(false)
const reducedMotion = ref(false)
const hasAdvanced = ref(false)
const sceneLoading = ref(true)
const sceneError = ref<string | null>(null)

const framesOrdered: FrameData[] = LANDING_FRAMES.slice()

const FRAME_PROGRESS_RANGES: Array<{ id: string, from: number, to: number }> = [
  { id: 'welcome', from: 0.06, to: 0.13 },
  { id: 'problem', from: 0.15, to: 0.19 },
  { id: 'solution', from: 0.19, to: 0.23 },
  { id: 'parallelism', from: 0.23, to: 0.27 },
  { id: 'arch', from: 0.27, to: 0.32 },
  { id: 'features-1', from: 0.40, to: 0.46 },
  { id: 'features-2', from: 0.46, to: 0.52 },
  { id: 'panel', from: 0.52, to: 0.58 },
  { id: 'implementation', from: 0.58, to: 0.63 },
  { id: 'impact', from: 0.63, to: 0.69 },
  { id: 'plan', from: 0.69, to: 0.76 },
]

const activeRangeIndex = computed(() => {
  const p = progress.value
  return FRAME_PROGRESS_RANGES.findIndex(r => p >= r.from && p < r.to)
})
const activeFrameData = computed<FrameData | null>(() => {
  const i = activeRangeIndex.value
  if (i === -1) return null
  const id = FRAME_PROGRESS_RANGES[i].id
  return framesOrdered.find(f => f.id === id) ?? null
})
const activeFrameNumber = computed(() => activeRangeIndex.value === -1 ? 0 : activeRangeIndex.value + 1)
const WHATSAPP_HREF = 'https://wa.me/593979798458?text=Hola,%20me%20interesa%20conocer%20más%20sobre%20LURVIAX'
const REGISTER_HREF = '/register'

const auth = useAuthStore()
const isAuthenticated = computed(() => auth.isAuthenticated)

interface SplineObject {
  name: string
  position: { x: number, y: number, z: number }
  rotation?: { x: number, y: number, z: number }
  quaternion?: { x: number, y: number, z: number, w: number }
  scale?: { x: number, y: number, z: number }
}

let splineApp: Application | null = null
let splineCamera: SplineObject | null = null
let waypoints: SplineObject[] = []
let scrollTimeline: gsap.core.Timeline | null = null
let scrollTrigger: ScrollTrigger | null = null

async function initSpline() {
  if (!canvasEl.value) return
  sceneLoading.value = true
  sceneError.value = null

  splineApp = new Application(canvasEl.value)

  try {
    await splineApp.load(SPLINE_SCENE_URL)
    sceneLoading.value = false

    const anyApp = splineApp as unknown as {
      findObjectByName?: (name: string) => SplineObject | undefined
    }
    const internal = splineApp as unknown as {
      _camera?: SplineObject
      _controls?: { enabled?: boolean, update?: () => void }
      pauseGameControls?: () => void
    }

    internal.pauseGameControls?.()

    if (internal._controls) {
      internal._controls.enabled = false
      if (typeof internal._controls.update === 'function') {
        internal._controls.update = () => {}
      }
    }

    splineCamera = internal._camera ?? null
    if (!splineCamera) {
      console.warn('[clinic-journey] no render camera available')
      return
    }

    waypoints = []
    for (const name of WAYPOINT_NAMES) {
      const obj = anyApp.findObjectByName?.(name)
      if (obj) waypoints.push(obj)
      else console.warn('[clinic-journey] waypoint missing:', name)
    }
    if (waypoints.length !== WAYPOINT_NAMES.length) {
      sceneError.value = `Missing waypoints (${waypoints.length}/${WAYPOINT_NAMES.length})`
      return
    }

    buildScrollTimeline()
  }
  catch (err) {
    console.error('[clinic-journey] Spline load failed', err)
    sceneError.value = (err as Error).message ?? 'Spline scene failed to load'
    sceneLoading.value = false
  }
}

function buildScrollTimeline() {
  if (!splineCamera || waypoints.length < 2 || !wrapEl.value) return

  scrollTimeline?.kill()
  scrollTrigger?.kill()

  const internal = splineApp as unknown as { requestRender?: () => void }

  scrollTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: wrapEl.value,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,
      onUpdate: (self) => {
        progress.value = self.progress
        updateActiveFromProgress()
        internal.requestRender?.()
      },
    },
    defaults: { duration: 1, ease: 'power1.inOut' },
  })

  scrollTrigger = scrollTimeline.scrollTrigger as ScrollTrigger

  const stops = waypoints.slice(1)
  stops.forEach((s, idx) => {
    const dur = STOP_DURATIONS[idx] ?? 1
    scrollTimeline!.to(splineCamera!.position, { x: s.position.x, y: s.position.y, z: s.position.z, duration: dur })
    if (s.rotation && splineCamera!.rotation) {
      scrollTimeline!.to(splineCamera!.rotation, { x: s.rotation.x, y: s.rotation.y, z: s.rotation.z, duration: dur }, '<')
    }
  })
  scrollTimeline!.to({}, { duration: TAIL_DURATION })
}

function updateActiveFromProgress() {
  showFinalCta.value = progress.value >= 0.95
}

function onScroll() {
  if (scrollTrigger || !wrapEl.value) return
  const rect = wrapEl.value.getBoundingClientRect()
  const totalScroll = rect.height - window.innerHeight
  const scrolled = -rect.top
  const p = Math.max(0, Math.min(1, scrolled / Math.max(1, totalScroll)))
  progress.value = p
  updateActiveFromProgress()
}

function onResize() {}

function scrollToProgress(p: number) {
  if (!wrapEl.value) return
  const clamped = Math.max(0, Math.min(1, p))
  const rect = wrapEl.value.getBoundingClientRect()
  const totalScroll = rect.height - window.innerHeight
  const targetScrollTop = window.scrollY + rect.top + totalScroll * clamped
  if (lenis) {
    lenis.scrollTo(targetScrollTop, { duration: 1.2 })
  }
  else {
    window.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
  }
}

function scrollToRange(i: number) {
  const r = FRAME_PROGRESS_RANGES[i]
  if (!r) return
  scrollToProgress((r.from + r.to) / 2)
}

function nextFrame() {
  hasAdvanced.value = true
  const i = activeRangeIndex.value
  if (i === -1) {
    const next = FRAME_PROGRESS_RANGES.findIndex(r => r.from > progress.value)
    if (next !== -1) scrollToRange(next)
    else scrollToProgress(1)
    return
  }
  if (i + 1 < FRAME_PROGRESS_RANGES.length) scrollToRange(i + 1)
  else scrollToProgress(1)
}

function prevFrame() {
  hasAdvanced.value = true
  const i = activeRangeIndex.value
  if (i === -1) {
    const prevs = FRAME_PROGRESS_RANGES.filter(r => r.to <= progress.value)
    if (prevs.length) scrollToProgress((prevs[prevs.length - 1].from + prevs[prevs.length - 1].to) / 2)
    else scrollToProgress(0)
    return
  }
  if (i - 1 >= 0) scrollToRange(i - 1)
  else scrollToProgress(0)
}

function advanceClick() {
  nextFrame()
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') nextFrame()
  if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') prevFrame()
}

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion.value) return

  lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  })
  lenis.on('scroll', ScrollTrigger.update)
  lenisRaf = (time: number) => lenis?.raf(time * 1000)
  gsap.ticker.add(lenisRaf)
  gsap.ticker.lagSmoothing(0)

  initSpline()

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeydown)
  onScroll()

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onKeydown)
    scrollTrigger?.kill()
    scrollTimeline?.kill()
    scrollTrigger = null
    scrollTimeline = null
    if (lenisRaf) gsap.ticker.remove(lenisRaf)
    lenis?.destroy()
    lenis = null
    lenisRaf = null
    splineApp?.dispose?.()
    splineApp = null
  })
})
</script>

<template>
  <section
    ref="wrapEl"
    class="clinic-journey"
    :class="{ 'clinic-journey--reduced': reducedMotion }"
    :style="reducedMotion ? undefined : { height: `${SCROLL_HEIGHT_VH}vh` }"
    :aria-label="$t('landing.frames.ariaFrame', { current: activeFrameNumber, total: FRAME_PROGRESS_RANGES.length, title: activeFrameData ? $t(activeFrameData.titleKey) : '' })"
  >
    <div v-if="!reducedMotion" class="clinic-journey__sticky">
      <canvas ref="canvasEl" class="clinic-journey__canvas" @click="advanceClick" />

      <Transition name="cj-fade">
        <div v-if="sceneLoading" class="clinic-journey__loader" aria-live="polite">
          <div class="clinic-journey__spinner" />
          <span>{{ $t('landing.frames.loading') }}</span>
        </div>
      </Transition>

      <Transition name="cj-fade">
        <div v-if="sceneError && !sceneLoading" class="clinic-journey__error">
          <p>{{ $t('landing.frames.loadError') }}</p>
          <small>{{ sceneError }}</small>
        </div>
      </Transition>

      <Transition name="cj-fade">
        <button
          v-if="!hasAdvanced && !showFinalCta && !sceneLoading"
          type="button"
          class="clinic-journey__hint"
          @click="advanceClick"
        >
          <span class="clinic-journey__hint-dot" />
          {{ $t('landing.frames.clickHint') }}
        </button>
      </Transition>

      <div class="clinic-journey__progress" aria-hidden="true">
        <button
          v-for="(r, i) in FRAME_PROGRESS_RANGES"
          :key="r.id"
          type="button"
          class="clinic-journey__dot"
          :class="{ 'clinic-journey__dot--active': i === activeRangeIndex, 'clinic-journey__dot--featured': framesOrdered.find(f => f.id === r.id)?.highlight === 'featured' }"
          :title="$t(framesOrdered.find(f => f.id === r.id)?.titleKey ?? 'landing.frames.ariaNext')"
          @click="scrollToRange(i)"
        />
      </div>

      <Transition name="cj-fade">
        <div v-if="activeFrameNumber > 0" class="clinic-journey__counter" aria-hidden="true">
          {{ $t('landing.frames.progress', { current: activeFrameNumber, total: FRAME_PROGRESS_RANGES.length }) }}
        </div>
      </Transition>

      <Transition name="cj-card">
        <aside v-if="activeFrameData && !showFinalCta" class="clinic-journey__card" :class="{ 'clinic-journey__card--featured': activeFrameData.highlight === 'featured' }">
          <p class="clinic-journey__card-eyebrow">
            <span class="clinic-journey__card-dot" />
            {{ $t('landing.frames.progress', { current: activeFrameNumber, total: FRAME_PROGRESS_RANGES.length }) }}
          </p>
          <h3 class="clinic-journey__card-title">{{ $t(activeFrameData.titleKey) }}</h3>
          <p v-if="activeFrameData.subtitleKey" class="clinic-journey__card-sub">{{ $t(activeFrameData.subtitleKey) }}</p>
          <ul v-if="activeFrameData.bulletKeys.length" class="clinic-journey__card-bullets">
            <li v-for="k in activeFrameData.bulletKeys" :key="k">{{ $t(k) }}</li>
          </ul>
          <a
            v-if="activeFrameData.cta"
            :href="activeFrameData.cta.href"
            target="_blank"
            rel="noreferrer noopener"
            class="clinic-journey__card-cta"
          >
            {{ $t(activeFrameData.cta.labelKey) }}
          </a>
        </aside>
      </Transition>

      <div class="clinic-journey__nav" aria-hidden="true">
        <button type="button" class="clinic-journey__nav-btn" :aria-label="$t('landing.frames.ariaPrev')" @click="prevFrame">‹</button>
        <button type="button" class="clinic-journey__nav-btn" :aria-label="$t('landing.frames.ariaNext')" @click="nextFrame">›</button>
      </div>

      <Transition name="cj-fade">
        <div v-if="showFinalCta" class="clinic-journey__final">
          <p class="clinic-journey__final-eyebrow">{{ $t('landing.frames.close.subtitle') }}</p>
          <h2 class="clinic-journey__final-title">{{ $t('landing.frames.close.title') }}</h2>
          <div class="clinic-journey__final-ctas">
            <a
              :href="WHATSAPP_HREF"
              target="_blank"
              rel="noreferrer noopener"
              class="clinic-journey__cta clinic-journey__cta--primary"
            >
              {{ $t('landing.frames.close.ctaLabel') }}
            </a>
            <NuxtLink
              :to="REGISTER_HREF"
              class="clinic-journey__cta clinic-journey__cta--ghost"
            >
              {{ isAuthenticated ? $t('landing.goToDashboard') : $t('landing.createAccount') }}
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </div>

    <div class="sr-only">
      <h2>{{ $t('landing.heroScene.claimA') }} {{ $t('landing.heroScene.claimEm') }} {{ $t('landing.heroScene.claimB') }}</h2>
      <ul>
        <li v-for="f in framesOrdered" :key="f.id">
          <h3>{{ $t(f.titleKey) }}</h3>
          <p v-if="f.subtitleKey">{{ $t(f.subtitleKey) }}</p>
          <ul v-if="f.bulletKeys.length">
            <li v-for="k in f.bulletKeys" :key="k">{{ $t(k) }}</li>
          </ul>
          <a v-if="f.cta" :href="f.cta.href">{{ $t(f.cta.labelKey) }}</a>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.clinic-journey {
  position: relative;
  width: 100%;
  background: #eef1f5;
}
.clinic-journey__sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}
.clinic-journey__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
}

.clinic-journey__loader {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  gap: 16px;
  background: #eef1f5;
  color: #1a9bb8;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  z-index: 20;
}
.clinic-journey__loader > span {
  display: block;
  text-align: center;
}
.clinic-journey__spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(26, 155, 184, 0.2);
  border-top-color: #1a9bb8;
  margin: 0 auto;
  animation: cj-spin 1s linear infinite;
}
@keyframes cj-spin { to { transform: rotate(360deg); } }

.clinic-journey__error {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 32px;
  text-align: center;
  background: #fef4f4;
  color: #8a2a2a;
  z-index: 21;
}
.clinic-journey__error small {
  display: block;
  margin-top: 8px;
  font-family: monospace;
  opacity: 0.7;
  font-size: 0.75rem;
}

.clinic-journey__hint {
  all: unset;
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 24px;
  border-radius: 999px;
  background: rgba(1, 20, 42, 0.78);
  backdrop-filter: blur(10px);
  color: #ffffff;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  z-index: 11;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 20px 48px -20px rgba(1, 20, 42, 0.6);
  animation: hint-float 2.6s ease-in-out infinite;
}
.clinic-journey__hint-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5BE9EC;
  box-shadow: 0 0 10px #5BE9EC;
  animation: hint-pulse 1.4s ease-in-out infinite;
}
@keyframes hint-float {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-4px); }
}
@keyframes hint-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.clinic-journey__progress {
  position: absolute;
  top: 50%;
  right: clamp(16px, 2.5vw, 32px);
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
}
.clinic-journey__dot {
  all: unset;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(26, 155, 184, 0.45);
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}
.clinic-journey__dot:hover { transform: scale(1.3); background: rgba(26, 155, 184, 0.3); }
.clinic-journey__dot--active {
  background: #1a9bb8;
  box-shadow: 0 0 12px rgba(26, 155, 184, 0.7);
  transform: scale(1.4);
}
.clinic-journey__dot--featured { border-color: rgba(201, 154, 85, 0.65); }
.clinic-journey__dot--featured.clinic-journey__dot--active {
  background: #d9a856;
  box-shadow: 0 0 14px rgba(217, 168, 86, 0.9);
}

.clinic-journey__counter {
  position: absolute;
  bottom: clamp(20px, 3vw, 36px);
  left: clamp(20px, 3vw, 36px);
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(13, 122, 147, 0.95);
  background: rgba(255, 255, 255, 0.78);
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(26, 155, 184, 0.25);
  backdrop-filter: blur(8px);
  z-index: 10;
}

.clinic-journey__nav {
  position: absolute;
  bottom: clamp(20px, 3vw, 36px);
  right: clamp(20px, 3vw, 36px);
  display: flex;
  gap: 8px;
  z-index: 10;
}
.clinic-journey__nav-btn {
  all: unset;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(26, 155, 184, 0.3);
  backdrop-filter: blur(8px);
  color: #0a1420;
  font-size: 1.4rem;
  cursor: pointer;
  transition: all 0.25s ease;
}
.clinic-journey__nav-btn:hover {
  border-color: #1a9bb8;
  background: rgba(26, 155, 184, 0.14);
}

.clinic-journey__final {
  position: absolute;
  left: 50%;
  bottom: clamp(32px, 6vh, 64px);
  transform: translateX(-50%);
  max-width: min(680px, 90vw);
  padding: clamp(24px, 3vw, 36px) clamp(28px, 4vw, 48px);
  text-align: center;
  z-index: 15;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(26, 155, 184, 0.22);
  backdrop-filter: blur(16px);
  border-radius: 24px;
  box-shadow: 0 40px 96px -40px rgba(10, 20, 32, 0.45), 0 1px 0 rgba(255, 255, 255, 0.6) inset;
}
.clinic-journey__final-eyebrow {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #1a9bb8;
  margin-bottom: 12px;
}
.clinic-journey__final-title {
  font-family: Archivo, system-ui, sans-serif;
  font-weight: 500;
  font-size: clamp(1.4rem, 3vw, 2.2rem);
  line-height: 1.15;
  color: #0a1420;
  max-width: 24ch;
  margin: 0 auto 22px;
}
.clinic-journey__final-ctas {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}
.clinic-journey__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 26px;
  border-radius: 999px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.82rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.25s ease, background 0.25s ease;
}
.clinic-journey__cta--primary {
  background: linear-gradient(120deg, #25D366 0%, #1a9e4b 100%);
  color: #ffffff;
  box-shadow: 0 16px 36px -16px rgba(37, 211, 102, 0.55);
}
.clinic-journey__cta--primary:hover { transform: translateY(-2px); box-shadow: 0 18px 44px -14px rgba(37, 211, 102, 0.75); }
.clinic-journey__cta--ghost {
  background: rgba(255, 255, 255, 0.85);
  color: #0a1420;
  border: 1px solid rgba(26, 155, 184, 0.45);
}
.clinic-journey__cta--ghost:hover { border-color: #1a9bb8; background: rgba(26, 155, 184, 0.1); }

.cj-fade-enter-active, .cj-fade-leave-active { transition: opacity 0.5s ease; }
.cj-fade-enter-from, .cj-fade-leave-to { opacity: 0; }

.clinic-journey__card {
  position: absolute;
  top: clamp(24px, 6vh, 56px);
  left: clamp(20px, 4vw, 48px);
  width: min(380px, 38vw);
  padding: 28px 28px 26px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(26, 155, 184, 0.18);
  backdrop-filter: blur(14px);
  box-shadow: 0 32px 72px -32px rgba(10, 20, 32, 0.35), 0 1px 0 rgba(255, 255, 255, 0.6) inset;
  z-index: 12;
  pointer-events: auto;
}
.clinic-journey__card--featured {
  border-color: rgba(217, 168, 86, 0.55);
  box-shadow: 0 32px 72px -28px rgba(217, 168, 86, 0.4), 0 0 0 1px rgba(217, 168, 86, 0.25);
}
.clinic-journey__card-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #0d7a93;
}
.clinic-journey__card-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #1a9bb8;
  box-shadow: 0 0 10px rgba(26, 155, 184, 0.6);
}
.clinic-journey__card--featured .clinic-journey__card-dot {
  background: #d9a856;
  box-shadow: 0 0 10px rgba(217, 168, 86, 0.6);
}
.clinic-journey__card-title {
  margin: 0 0 10px;
  font-family: Archivo, system-ui, sans-serif;
  font-weight: 500;
  font-size: clamp(1.25rem, 1.6vw, 1.55rem);
  line-height: 1.2;
  color: #0a1420;
  letter-spacing: -0.01em;
}
.clinic-journey__card-sub {
  margin: 0 0 14px;
  color: #3d4a5c;
  font-size: 0.92rem;
  line-height: 1.45;
}
.clinic-journey__card-bullets {
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.clinic-journey__card-bullets li {
  position: relative;
  padding-left: 18px;
  font-size: 0.86rem;
  line-height: 1.45;
  color: #263448;
}
.clinic-journey__card-bullets li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1a9bb8;
}
.clinic-journey__card--featured .clinic-journey__card-bullets li::before {
  background: #d9a856;
}
.clinic-journey__card-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  background: linear-gradient(120deg, #25D366, #1a9e4b);
  color: #ffffff;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.74rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.25s ease;
}
.clinic-journey__card-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px -12px rgba(37, 211, 102, 0.55);
}

.cj-card-enter-active, .cj-card-leave-active {
  transition: opacity 0.45s ease, transform 0.55s cubic-bezier(0.23, 1, 0.32, 1);
}
.cj-card-enter-from { opacity: 0; transform: translateX(-24px); }
.cj-card-leave-to { opacity: 0; transform: translateX(-16px); }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.clinic-journey--reduced {
  min-height: auto;
  height: auto;
}

@media (max-width: 720px) {
  .clinic-journey__progress { display: none; }
  .clinic-journey__counter { font-size: 0.7rem; }
  .clinic-journey__card {
    top: auto;
    bottom: 80px;
    left: 12px;
    right: 12px;
    width: auto;
    padding: 20px 20px 18px;
    border-radius: 16px;
  }
  .clinic-journey__card-title { font-size: 1.1rem; }
  .clinic-journey__card-sub, .clinic-journey__card-bullets li { font-size: 0.82rem; }
}
</style>
