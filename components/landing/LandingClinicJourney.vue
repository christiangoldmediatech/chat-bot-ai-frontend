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
          <span class="clinic-journey__card-corner clinic-journey__card-corner--tl" />
          <span class="clinic-journey__card-corner clinic-journey__card-corner--tr" />
          <span class="clinic-journey__card-corner clinic-journey__card-corner--bl" />
          <span class="clinic-journey__card-corner clinic-journey__card-corner--br" />
          <span class="clinic-journey__card-scanner" />
          <div class="clinic-journey__card-inner">
            <p class="clinic-journey__card-eyebrow">
              <span class="clinic-journey__card-dot" />
              <span class="clinic-journey__card-ebtext">{{ $t('landing.frames.progress', { current: activeFrameNumber, total: FRAME_PROGRESS_RANGES.length }) }}</span>
              <span class="clinic-journey__card-ebtag">· LURVIAX</span>
            </p>
            <h3 class="clinic-journey__card-title">{{ $t(activeFrameData.titleKey) }}</h3>
            <p v-if="activeFrameData.subtitleKey" class="clinic-journey__card-sub">{{ $t(activeFrameData.subtitleKey) }}</p>
            <ul v-if="activeFrameData.bulletKeys.length" class="clinic-journey__card-bullets">
              <li v-for="(k, idx) in activeFrameData.bulletKeys" :key="k" :style="{ '--i': idx }">
                <span class="clinic-journey__card-bulletmark" />
                <span>{{ $t(k) }}</span>
              </li>
            </ul>
            <a
              v-if="activeFrameData.cta"
              :href="activeFrameData.cta.href"
              target="_blank"
              rel="noreferrer noopener"
              class="clinic-journey__card-cta"
            >
              <span>{{ $t(activeFrameData.cta.labelKey) }}</span>
              <span class="clinic-journey__card-cta-arrow">→</span>
            </a>
          </div>
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
  width: min(400px, 40vw);
  z-index: 12;
  pointer-events: auto;
  border-radius: 4px;
  padding: 1px;
  background:
    linear-gradient(140deg, rgba(91, 233, 236, 0.55) 0%, rgba(26, 155, 184, 0.28) 32%, rgba(10, 20, 32, 0.05) 60%, rgba(26, 155, 184, 0.45) 100%);
  box-shadow:
    0 30px 60px -28px rgba(10, 20, 32, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 0 60px -20px rgba(91, 233, 236, 0.35);
  isolation: isolate;
  overflow: hidden;
}
.clinic-journey__card--featured {
  background:
    linear-gradient(140deg, rgba(255, 213, 128, 0.7) 0%, rgba(217, 168, 86, 0.35) 40%, rgba(26, 155, 184, 0.2) 70%, rgba(217, 168, 86, 0.55) 100%);
  box-shadow:
    0 30px 60px -28px rgba(10, 20, 32, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 0 60px -14px rgba(217, 168, 86, 0.5);
}
.clinic-journey__card-inner {
  position: relative;
  padding: 24px 26px 22px;
  border-radius: 3px;
  background:
    linear-gradient(180deg, rgba(248, 252, 253, 0.97) 0%, rgba(235, 243, 247, 0.94) 100%);
  overflow: hidden;
}
.clinic-journey__card-inner::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(26, 155, 184, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(26, 155, 184, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(ellipse at top right, rgba(0, 0, 0, 0.4), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.clinic-journey__card-inner > * { position: relative; z-index: 1; }

.clinic-journey__card-corner {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 1.5px solid #1a9bb8;
  z-index: 3;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(91, 233, 236, 0.4);
}
.clinic-journey__card-corner--tl { top: 0; left: 0; border-right: 0; border-bottom: 0; border-top-left-radius: 4px; }
.clinic-journey__card-corner--tr { top: 0; right: 0; border-left: 0; border-bottom: 0; border-top-right-radius: 4px; }
.clinic-journey__card-corner--bl { bottom: 0; left: 0; border-right: 0; border-top: 0; border-bottom-left-radius: 4px; }
.clinic-journey__card-corner--br { bottom: 0; right: 0; border-left: 0; border-top: 0; border-bottom-right-radius: 4px; }
.clinic-journey__card--featured .clinic-journey__card-corner {
  border-color: #d9a856;
  box-shadow: 0 0 10px rgba(255, 213, 128, 0.55);
}

.clinic-journey__card-scanner {
  position: absolute;
  inset: 1px 1px auto 1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #5BE9EC 50%, transparent);
  opacity: 0.8;
  z-index: 3;
  animation: card-scanner 3.6s cubic-bezier(0.23, 1, 0.32, 1) infinite;
  pointer-events: none;
}
.clinic-journey__card--featured .clinic-journey__card-scanner {
  background: linear-gradient(90deg, transparent, #ffd580 50%, transparent);
}
@keyframes card-scanner {
  0% { transform: translateY(0); opacity: 0; }
  10% { opacity: 0.85; }
  45% { transform: translateY(240px); opacity: 0.5; }
  80% { opacity: 0; }
  100% { transform: translateY(0); opacity: 0; }
}

.clinic-journey__card-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.66rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #0d7a93;
}
.clinic-journey__card-ebtext { color: #0a1420; font-weight: 600; }
.clinic-journey__card-ebtag { color: rgba(13, 122, 147, 0.55); font-weight: 500; }
.clinic-journey__card--featured .clinic-journey__card-ebtext { color: #7a5a1e; }
.clinic-journey__card--featured .clinic-journey__card-ebtag { color: rgba(122, 90, 30, 0.5); }

.clinic-journey__card-dot {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1a9bb8;
  box-shadow: 0 0 10px rgba(91, 233, 236, 0.8);
}
.clinic-journey__card-dot::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid #5BE9EC;
  opacity: 0.6;
  animation: dot-ping 2s cubic-bezier(0.23, 1, 0.32, 1) infinite;
}
.clinic-journey__card--featured .clinic-journey__card-dot {
  background: #d9a856;
  box-shadow: 0 0 10px rgba(255, 213, 128, 0.85);
}
.clinic-journey__card--featured .clinic-journey__card-dot::before { border-color: #ffd580; }
@keyframes dot-ping {
  0% { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(2.4); opacity: 0; }
}

.clinic-journey__card-title {
  margin: 0 0 10px;
  font-family: Archivo, system-ui, sans-serif;
  font-weight: 600;
  font-size: clamp(1.3rem, 1.7vw, 1.6rem);
  line-height: 1.15;
  color: #061119;
  letter-spacing: -0.015em;
}
.clinic-journey__card-sub {
  margin: 0 0 16px;
  color: #3d4a5c;
  font-size: 0.92rem;
  line-height: 1.5;
}
.clinic-journey__card-bullets {
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}
.clinic-journey__card-bullets li {
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 10px;
  align-items: start;
  font-size: 0.87rem;
  line-height: 1.45;
  color: #1a2434;
  opacity: 0;
  transform: translateX(-6px);
  animation: bullet-in 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  animation-delay: calc(0.08s * var(--i, 0) + 0.15s);
}
.clinic-journey__card-bulletmark {
  width: 14px;
  height: 14px;
  margin-top: 3px;
  border: 1px solid #1a9bb8;
  background: rgba(91, 233, 236, 0.18);
  position: relative;
  transform: rotate(45deg);
  flex-shrink: 0;
}
.clinic-journey__card-bulletmark::after {
  content: '';
  position: absolute;
  inset: 3px;
  background: #1a9bb8;
  box-shadow: 0 0 6px rgba(91, 233, 236, 0.6);
}
.clinic-journey__card--featured .clinic-journey__card-bulletmark {
  border-color: #d9a856;
  background: rgba(255, 213, 128, 0.22);
}
.clinic-journey__card--featured .clinic-journey__card-bulletmark::after {
  background: #d9a856;
  box-shadow: 0 0 6px rgba(255, 213, 128, 0.7);
}
@keyframes bullet-in {
  to { opacity: 1; transform: translateX(0); }
}

.clinic-journey__card-cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px 11px 22px;
  background: linear-gradient(120deg, #061119 0%, #0d2530 100%);
  color: #5BE9EC;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid rgba(91, 233, 236, 0.45);
  position: relative;
  overflow: hidden;
  transition: color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
}
.clinic-journey__card-cta::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 40%, rgba(91, 233, 236, 0.22) 50%, transparent 60%);
  transform: translateX(-100%);
  transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}
.clinic-journey__card-cta:hover {
  color: #ffffff;
  border-color: #5BE9EC;
  transform: translateY(-1px);
  box-shadow: 0 10px 30px -12px rgba(91, 233, 236, 0.6);
}
.clinic-journey__card-cta:hover::before { transform: translateX(100%); }
.clinic-journey__card-cta-arrow { transition: transform 0.25s ease; }
.clinic-journey__card-cta:hover .clinic-journey__card-cta-arrow { transform: translateX(3px); }
.clinic-journey__card--featured .clinic-journey__card-cta {
  color: #ffd580;
  border-color: rgba(255, 213, 128, 0.55);
}
.clinic-journey__card--featured .clinic-journey__card-cta:hover {
  color: #ffffff;
  border-color: #ffd580;
  box-shadow: 0 10px 30px -12px rgba(255, 213, 128, 0.65);
}

.cj-card-enter-active, .cj-card-leave-active {
  transition: opacity 0.5s ease, transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), filter 0.5s ease;
}
.cj-card-enter-from { opacity: 0; transform: translateX(-28px) scale(0.98); filter: blur(4px); }
.cj-card-leave-to { opacity: 0; transform: translateX(-16px) scale(0.98); filter: blur(4px); }

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
  }
  .clinic-journey__card-inner { padding: 18px 18px 16px; }
  .clinic-journey__card-title { font-size: 1.1rem; }
  .clinic-journey__card-sub, .clinic-journey__card-bullets li { font-size: 0.82rem; }
}
</style>
