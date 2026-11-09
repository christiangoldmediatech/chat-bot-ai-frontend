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

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap' },
  ],
})

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
const DOCTOR_FINAL_CANDIDATES = [
  'Camera_Beat_4_DoctorOffice',
  'Camera_Beat_Doctor',
  'Camera_Doctor',
  'Camera_DoctorOffice',
  'Camera_Final',
  'Camera_End',
  'Camera_Beat_7_DoctorOffice',
  'Camera_Beat_6_DoctorOffice',
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
let watermarkObserver: MutationObserver | null = null
let finalTargetOverride: { position: { x: number, y: number, z: number }, rotation: { x: number, y: number, z: number } } | null = null

function computeFinalTargetFromAvatars(doctor: SplineObject, patient: SplineObject) {
  const dp = doctor.position
  const pp = patient.position
  const midX = (dp.x + pp.x) / 2
  const midY = Math.max(dp.y, pp.y) + 10
  const midZ = (dp.z + pp.z) / 2
  const BACK = 260
  const camY = 175
  const camX = midX
  const camZ = midZ + BACK
  const dy = midY - camY
  const dz = midZ - camZ
  const pitch = Math.atan2(dy, Math.hypot(0, dz))
  finalTargetOverride = {
    position: { x: camX, y: camY, z: camZ },
    rotation: { x: pitch, y: 0, z: 0 },
  }
  console.log('[clinic-journey] final waypoint auto-framed on avatars:', finalTargetOverride)
}

function isSplineBadge(el: Element): boolean {
  if (el.tagName === 'A') {
    const href = (el as HTMLAnchorElement).href ?? ''
    if (href.includes('spline.design')) return true
  }
  const text = (el.textContent ?? '').trim().toLowerCase()
  if (text === 'built with spline' || (text.includes('built with') && text.includes('spline'))) return true
  const cls = (el.getAttribute('class') ?? '').toLowerCase()
  if (cls.includes('watermark') || cls.includes('spline-logo') || cls.includes('spline-brand')) return true
  return false
}

function walkAndNuke(root: Document | Element | ShadowRoot) {
  const candidates: Element[] = []
  const stack: Array<Document | Element | ShadowRoot> = [root]
  while (stack.length) {
    const node = stack.pop()!
    const children = (node as Element).children ?? (node as Document).children ?? []
    for (const child of Array.from(children)) {
      if (isSplineBadge(child)) candidates.push(child)
      if ((child as Element & { shadowRoot?: ShadowRoot }).shadowRoot) {
        stack.push((child as Element & { shadowRoot: ShadowRoot }).shadowRoot)
      }
      stack.push(child)
    }
  }
  candidates.forEach((el) => {
    try {
      ;(el as HTMLElement).style.display = 'none'
      el.remove()
    }
    catch {
      // skip
    }
  })
  return candidates.length
}

function nukeSplineWatermarks() {
  walkAndNuke(document)
  if (canvasEl.value?.parentElement) walkAndNuke(canvasEl.value.parentElement)
}

function startWatermarkObserver() {
  if (watermarkObserver) return
  nukeSplineWatermarks()
  watermarkObserver = new MutationObserver(nukeSplineWatermarks)
  watermarkObserver.observe(document.body, { childList: true, subtree: true, attributes: true })
  let tries = 0
  const retry = () => {
    nukeSplineWatermarks()
    if (++tries < 40) setTimeout(retry, 150)
  }
  retry()
}

async function initSpline() {
  if (!canvasEl.value) return
  sceneLoading.value = true
  sceneError.value = null

  splineApp = new Application(canvasEl.value, { htmlContentMode: 'inline' } as ConstructorParameters<typeof Application>[1])

  try {
    await splineApp.load(SPLINE_SCENE_URL)
    sceneLoading.value = false

    const anyApp = splineApp as unknown as {
      findObjectByName?: (name: string) => SplineObject | undefined
      addEventListener?: (type: string, cb: (e: { target?: { name?: string } }) => void) => void
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
    const lastIdx = WAYPOINT_NAMES.length - 1
    for (let i = 0; i < WAYPOINT_NAMES.length; i++) {
      const name = WAYPOINT_NAMES[i]
      let obj = anyApp.findObjectByName?.(name)
      if (!obj && i === lastIdx) {
        for (const alt of DOCTOR_FINAL_CANDIDATES) {
          if (alt === name) continue
          const candidate = anyApp.findObjectByName?.(alt)
          if (candidate) {
            console.warn(`[clinic-journey] final waypoint '${name}' missing — falling back to '${alt}'`)
            obj = candidate
            break
          }
        }
      }
      if (obj) waypoints.push(obj)
      else console.warn('[clinic-journey] waypoint missing:', name)
    }
    if (waypoints.length !== WAYPOINT_NAMES.length) {
      sceneError.value = `Missing waypoints (${waypoints.length}/${WAYPOINT_NAMES.length})`
      return
    }
    console.group('[clinic-journey] waypoint diagnostics')
    waypoints.forEach((wp, i) => {
      const p = wp.position
      const r = wp.rotation
      console.log(`  ${i} ${WAYPOINT_NAMES[i]}:`, {
        pos: p && { x: p.x?.toFixed(1), y: p.y?.toFixed(1), z: p.z?.toFixed(1) },
        rot: r && { x: r.x?.toFixed(3), y: r.y?.toFixed(3), z: r.z?.toFixed(3) },
      })
    })
    const candidateFinals = ['Camera_Beat_4_DoctorOffice', 'Camera_Beat_Doctor', 'Camera_Doctor', 'Camera_Final', 'Camera_End', 'Camera_Beat_6_Pullback']
    for (const n of candidateFinals) {
      const obj = anyApp.findObjectByName?.(n)
      if (obj) console.log(`  CANDIDATE final ${n}:`, {
        pos: obj.position && { x: obj.position.x?.toFixed(1), y: obj.position.y?.toFixed(1), z: obj.position.z?.toFixed(1) },
        rot: obj.rotation && { x: obj.rotation.x?.toFixed(3), y: obj.rotation.y?.toFixed(3), z: obj.rotation.z?.toFixed(3) },
      })
    }
    const doctor = anyApp.findObjectByName?.('Avatar_Doctor')
    const patient = anyApp.findObjectByName?.('Avatar_Patient')
    if (doctor) console.log('  Avatar_Doctor pos:', doctor.position && { x: doctor.position.x?.toFixed(1), y: doctor.position.y?.toFixed(1), z: doctor.position.z?.toFixed(1) })
    if (patient) console.log('  Avatar_Patient pos:', patient.position && { x: patient.position.x?.toFixed(1), y: patient.position.y?.toFixed(1), z: patient.position.z?.toFixed(1) })
    console.groupEnd()

    finalTargetOverride = null
    if (doctor && patient) computeFinalTargetFromAvatars(doctor, patient)

    buildScrollTimeline()
    startWatermarkObserver()

    anyApp.addEventListener?.('mouseDown', (e) => {
      const name = e?.target?.name ?? ''
      if (name === 'Office/Agenda_ClickArea') pauseScrollJourney()
      else if (name === 'Office/AgendaScreen_ClickArea') resumeScrollJourney()
    })
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
  const lastIdx = stops.length - 1
  stops.forEach((s, idx) => {
    const dur = STOP_DURATIONS[idx] ?? 1
    const isLast = idx === lastIdx
    const target = isLast && finalTargetOverride
      ? finalTargetOverride
      : { position: { x: s.position.x, y: s.position.y, z: s.position.z }, rotation: s.rotation ? { x: s.rotation.x, y: s.rotation.y, z: s.rotation.z } : null }
    scrollTimeline!.to(splineCamera!.position, { x: target.position.x, y: target.position.y, z: target.position.z, duration: dur })
    if (target.rotation && splineCamera!.rotation) {
      scrollTimeline!.to(splineCamera!.rotation, { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z, duration: dur }, '<')
    }
  })
  scrollTimeline!.to({}, { duration: TAIL_DURATION })
}

function updateActiveFromProgress() {
  showFinalCta.value = progress.value >= 0.95
}

const agendaOpen = ref(false)

function pauseScrollJourney() {
  if (agendaOpen.value) return
  agendaOpen.value = true
  scrollTrigger?.disable(false)
  lenis?.stop()
}

function resumeScrollJourney() {
  if (!agendaOpen.value) return
  agendaOpen.value = false
  lenis?.start()
  scrollTrigger?.enable(false)
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

  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches

  lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: isCoarsePointer ? 2 : 1,
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
    watermarkObserver?.disconnect()
    watermarkObserver = null
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
          v-if="!hasAdvanced && !showFinalCta && !sceneLoading && !agendaOpen"
          type="button"
          class="clinic-journey__hint"
          @click="advanceClick"
        >
          <span class="clinic-journey__hint-dot" />
          {{ $t('landing.frames.clickHint') }}
        </button>
      </Transition>

      <Transition name="cj-fade">
        <div v-if="agendaOpen" class="clinic-journey__agenda-badge" aria-live="polite">
          <span class="clinic-journey__agenda-badge-dot" />
          AGENDA · tap pantalla para volver
        </div>
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
          <span class="clinic-journey__card-halo" aria-hidden="true" />
          <div class="clinic-journey__card-shell">
            <span class="clinic-journey__card-sheen" aria-hidden="true" />
            <span class="clinic-journey__card-corner clinic-journey__card-corner--tl" />
            <span class="clinic-journey__card-corner clinic-journey__card-corner--tr" />
            <span class="clinic-journey__card-corner clinic-journey__card-corner--bl" />
            <span class="clinic-journey__card-corner clinic-journey__card-corner--br" />
            <span class="clinic-journey__card-rail" aria-hidden="true">
              <span class="clinic-journey__card-rail-dot" />
            </span>
            <div class="clinic-journey__card-inner">
              <span class="clinic-journey__card-sigil" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <p class="clinic-journey__card-eyebrow" style="--d: 0.08s">
                <span class="clinic-journey__card-live">
                  <span class="clinic-journey__card-dot" />
                  <span class="clinic-journey__card-live-text">LIVE</span>
                </span>
                <span class="clinic-journey__card-ebsep">·</span>
                <span class="clinic-journey__card-ebtext">{{ $t('landing.frames.progress', { current: activeFrameNumber, total: FRAME_PROGRESS_RANGES.length }) }}</span>
                <span class="clinic-journey__card-ebtag">LURVIAX</span>
              </p>
              <h3 class="clinic-journey__card-title" style="--d: 0.14s">{{ $t(activeFrameData.titleKey) }}</h3>
              <p v-if="activeFrameData.subtitleKey" class="clinic-journey__card-sub" style="--d: 0.2s">{{ $t(activeFrameData.subtitleKey) }}</p>
              <div v-if="activeFrameData.bulletKeys.length" class="clinic-journey__card-divider" style="--d: 0.24s" aria-hidden="true" />
              <ul v-if="activeFrameData.bulletKeys.length" class="clinic-journey__card-bullets">
                <li v-for="(k, idx) in activeFrameData.bulletKeys" :key="k" :style="{ '--d': `${0.28 + idx * 0.07}s` }">
                  <span class="clinic-journey__card-bulletmark">▸</span>
                  <span>{{ $t(k) }}</span>
                </li>
              </ul>
              <a
                v-if="activeFrameData.cta"
                :href="activeFrameData.cta.href"
                target="_blank"
                rel="noreferrer noopener"
                class="clinic-journey__card-cta"
                :style="{ '--d': `${0.3 + activeFrameData.bulletKeys.length * 0.07}s` }"
              >
                <span>{{ $t(activeFrameData.cta.labelKey) }}</span>
                <span class="clinic-journey__card-cta-arrow">
                  <span>[</span><span class="clinic-journey__card-cta-glyph">→</span><span>]</span>
                </span>
              </a>
              <div class="clinic-journey__card-progress" aria-hidden="true">
                <span class="clinic-journey__card-progress-track">
                  <span class="clinic-journey__card-progress-fill" :style="{ width: `${(activeFrameNumber / FRAME_PROGRESS_RANGES.length) * 100}%` }" />
                </span>
              </div>
            </div>
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
  touch-action: pan-y;
  -webkit-tap-highlight-color: transparent;
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

.clinic-journey__agenda-badge {
  position: absolute;
  top: clamp(20px, 3vh, 36px);
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(5, 12, 21, 0.9);
  color: #5BE9EC;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  border: 1px solid rgba(91, 233, 236, 0.4);
  backdrop-filter: blur(10px);
  box-shadow: 0 16px 36px -14px rgba(91, 233, 236, 0.4);
  z-index: 14;
}
.clinic-journey__agenda-badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5BE9EC;
  box-shadow: 0 0 10px #5BE9EC;
  animation: hint-pulse 1.4s ease-in-out infinite;
}

.clinic-journey__card {
  position: absolute;
  top: clamp(24px, 6vh, 56px);
  left: clamp(20px, 4vw, 48px);
  width: min(440px, 42vw);
  z-index: 12;
  pointer-events: auto;
  isolation: isolate;
  animation: card-breathe 6s ease-in-out infinite;
  perspective: 1200px;
}
.clinic-journey__card-halo {
  position: absolute;
  inset: -60px -80px -50px -40px;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(ellipse 55% 55% at 18% 25%, rgba(91, 233, 236, 0.32), transparent 65%),
    radial-gradient(ellipse 50% 60% at 75% 80%, rgba(26, 155, 184, 0.22), transparent 65%),
    radial-gradient(ellipse 30% 40% at 90% 15%, rgba(217, 168, 86, 0.14), transparent 70%);
  filter: blur(22px);
  opacity: 0.95;
  animation: halo-drift 9s ease-in-out infinite;
}
.clinic-journey__card--featured .clinic-journey__card-halo {
  background:
    radial-gradient(ellipse 55% 55% at 18% 25%, rgba(255, 213, 128, 0.38), transparent 65%),
    radial-gradient(ellipse 50% 60% at 75% 80%, rgba(217, 168, 86, 0.25), transparent 65%),
    radial-gradient(ellipse 30% 40% at 90% 15%, rgba(91, 233, 236, 0.18), transparent 70%);
}
@keyframes halo-drift {
  0%, 100% { transform: translate(0, 0); opacity: 0.9; }
  50% { transform: translate(6px, -4px); opacity: 1; }
}
.clinic-journey__card-shell {
  position: relative;
  border-radius: 6px;
  padding: 1px;
  background:
    conic-gradient(from var(--shell-angle, 140deg),
      rgba(91, 233, 236, 0.12) 0deg,
      rgba(91, 233, 236, 0.75) 55deg,
      rgba(26, 155, 184, 0.3) 155deg,
      rgba(10, 20, 32, 0.08) 235deg,
      rgba(91, 233, 236, 0.65) 315deg,
      rgba(91, 233, 236, 0.12) 360deg);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.65) inset,
    0 36px 72px -32px rgba(10, 20, 32, 0.65),
    0 10px 22px -10px rgba(26, 155, 184, 0.28),
    0 2px 6px -2px rgba(10, 20, 32, 0.35);
  overflow: hidden;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease;
  animation: shell-spin 12s linear infinite;
}
.clinic-journey__card--featured .clinic-journey__card-shell {
  background:
    conic-gradient(from var(--shell-angle, 140deg),
      rgba(255, 213, 128, 0.15) 0deg,
      rgba(255, 213, 128, 0.85) 55deg,
      rgba(217, 168, 86, 0.35) 155deg,
      rgba(10, 20, 32, 0.08) 235deg,
      rgba(255, 213, 128, 0.7) 315deg,
      rgba(255, 213, 128, 0.15) 360deg);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 36px 72px -30px rgba(74, 54, 16, 0.5),
    0 10px 24px -10px rgba(217, 168, 86, 0.4),
    0 2px 6px -2px rgba(10, 20, 32, 0.3);
}
@property --shell-angle {
  syntax: '<angle>';
  initial-value: 140deg;
  inherits: false;
}
@keyframes shell-spin {
  to { --shell-angle: 500deg; }
}
.clinic-journey__card-sheen {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.35) 50%, transparent 62%);
  transform: translateX(-120%);
  mix-blend-mode: overlay;
}
@media (hover: hover) {
  .clinic-journey__card:hover .clinic-journey__card-shell {
    transform: rotateX(1.2deg) rotateY(-1.4deg) translateY(-2px);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.7) inset,
      0 44px 88px -30px rgba(10, 20, 32, 0.7),
      0 16px 32px -10px rgba(26, 155, 184, 0.38),
      0 2px 6px -2px rgba(10, 20, 32, 0.35);
  }
  .clinic-journey__card:hover .clinic-journey__card-sheen {
    transform: translateX(120%);
    transition: transform 1.1s cubic-bezier(0.23, 1, 0.32, 1);
  }
}
.clinic-journey__card-inner {
  position: relative;
  padding: 28px 30px 24px 36px;
  border-radius: 5px;
  background:
    radial-gradient(ellipse 100% 70% at 0% 100%, rgba(91, 233, 236, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 80% 60% at 100% 0%, rgba(217, 168, 86, 0.06) 0%, transparent 55%),
    linear-gradient(180deg, rgba(252, 253, 254, 0.98) 0%, rgba(236, 243, 247, 0.96) 100%);
  overflow: hidden;
}
.clinic-journey__card--featured .clinic-journey__card-inner {
  background:
    radial-gradient(ellipse 100% 70% at 0% 100%, rgba(255, 213, 128, 0.12) 0%, transparent 60%),
    radial-gradient(ellipse 80% 60% at 100% 0%, rgba(91, 233, 236, 0.08) 0%, transparent 55%),
    linear-gradient(180deg, rgba(254, 251, 244, 0.98) 0%, rgba(247, 240, 226, 0.96) 100%);
}
.clinic-journey__card-inner::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(26, 155, 184, 0.15) 1px, transparent 1px);
  background-size: 18px 18px;
  mask-image: radial-gradient(ellipse at 90% 5%, rgba(0, 0, 0, 0.4), transparent 65%);
  pointer-events: none;
  z-index: 0;
}
.clinic-journey__card-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.05 0 0 0 0 0.12 0 0 0 0 0.16 0 0 0 0.6 0'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.35'/></svg>");
  opacity: 0.12;
  mix-blend-mode: multiply;
  pointer-events: none;
  z-index: 0;
}
.clinic-journey__card-inner > * { position: relative; z-index: 1; }

.clinic-journey__card-sigil {
  position: absolute;
  top: 18px;
  right: 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: none;
}
.clinic-journey__card-sigil span {
  display: block;
  height: 2px;
  background: #1a9bb8;
  border-radius: 1px;
  box-shadow: 0 0 6px rgba(91, 233, 236, 0.6);
  animation: sigil-swell 2.4s cubic-bezier(0.23, 1, 0.32, 1) infinite;
}
.clinic-journey__card-sigil span:nth-child(1) { width: 22px; animation-delay: 0s; }
.clinic-journey__card-sigil span:nth-child(2) { width: 14px; animation-delay: 0.18s; }
.clinic-journey__card-sigil span:nth-child(3) { width: 18px; animation-delay: 0.36s; }
.clinic-journey__card--featured .clinic-journey__card-sigil span {
  background: #d9a856;
  box-shadow: 0 0 6px rgba(255, 213, 128, 0.65);
}
@keyframes sigil-swell {
  0%, 100% { opacity: 0.55; transform: scaleX(1); }
  50% { opacity: 1; transform: scaleX(1.15); }
}

.clinic-journey__card-corner {
  position: absolute;
  width: 16px;
  height: 16px;
  z-index: 3;
  pointer-events: none;
}
.clinic-journey__card-corner::before,
.clinic-journey__card-corner::after {
  content: '';
  position: absolute;
  background: #1a9bb8;
  box-shadow: 0 0 6px rgba(91, 233, 236, 0.5);
}
.clinic-journey__card-corner::before { width: 100%; height: 1.5px; }
.clinic-journey__card-corner::after { width: 1.5px; height: 100%; }
.clinic-journey__card-corner--tl::before { top: 0; left: 0; }
.clinic-journey__card-corner--tl::after { top: 0; left: 0; }
.clinic-journey__card-corner--tr::before { top: 0; right: 0; }
.clinic-journey__card-corner--tr::after { top: 0; right: 0; }
.clinic-journey__card-corner--bl::before { bottom: 0; left: 0; }
.clinic-journey__card-corner--bl::after { bottom: 0; left: 0; }
.clinic-journey__card-corner--br::before { bottom: 0; right: 0; }
.clinic-journey__card-corner--br::after { bottom: 0; right: 0; }
.clinic-journey__card--featured .clinic-journey__card-corner::before,
.clinic-journey__card--featured .clinic-journey__card-corner::after {
  background: #d9a856;
  box-shadow: 0 0 8px rgba(255, 213, 128, 0.7);
}

.clinic-journey__card-rail {
  position: absolute;
  left: 14px;
  top: 28px;
  bottom: 28px;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(26, 155, 184, 0.35) 15%, rgba(26, 155, 184, 0.35) 85%, transparent);
  z-index: 2;
  pointer-events: none;
  overflow: hidden;
}
.clinic-journey__card-rail-dot {
  position: absolute;
  left: -2px;
  top: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #5BE9EC;
  box-shadow: 0 0 8px #5BE9EC, 0 0 16px rgba(91, 233, 236, 0.6);
  animation: rail-travel 3.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.clinic-journey__card--featured .clinic-journey__card-rail {
  background: linear-gradient(180deg, transparent, rgba(217, 168, 86, 0.35) 15%, rgba(217, 168, 86, 0.35) 85%, transparent);
}
.clinic-journey__card--featured .clinic-journey__card-rail-dot {
  background: #ffd580;
  box-shadow: 0 0 8px #ffd580, 0 0 16px rgba(255, 213, 128, 0.65);
}
@keyframes rail-travel {
  0% { transform: translateY(-10px); opacity: 0; }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { transform: translateY(calc(100% + 10px)); opacity: 0; }
}

.clinic-journey__card-eyebrow,
.clinic-journey__card-title,
.clinic-journey__card-sub,
.clinic-journey__card-divider,
.clinic-journey__card-bullets li,
.clinic-journey__card-cta {
  opacity: 0;
  transform: translateY(6px);
  animation: content-in 0.55s cubic-bezier(0.23, 1, 0.32, 1) forwards;
  animation-delay: var(--d, 0s);
}
@keyframes content-in {
  to { opacity: 1; transform: translateY(0); }
}

.clinic-journey__card-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.66rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #0d7a93;
}
.clinic-journey__card-live {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 7px;
  border-radius: 3px;
  background: linear-gradient(135deg, #050c15 0%, #122838 100%);
  color: #5BE9EC;
  font-weight: 700;
  font-size: 0.62rem;
  letter-spacing: 0.28em;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(91, 233, 236, 0.3) inset, 0 4px 10px -4px rgba(10, 20, 32, 0.6);
}
.clinic-journey__card-live::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(91, 233, 236, 0.45) 50%, transparent 70%);
  transform: translateX(-100%);
  animation: live-shimmer 2.8s cubic-bezier(0.23, 1, 0.32, 1) infinite;
}
.clinic-journey__card-live-text { position: relative; z-index: 1; }
.clinic-journey__card--featured .clinic-journey__card-live { color: #ffd580; box-shadow: 0 0 0 1px rgba(255, 213, 128, 0.35) inset, 0 4px 10px -4px rgba(74, 54, 16, 0.5); }
.clinic-journey__card--featured .clinic-journey__card-live::before {
  background: linear-gradient(110deg, transparent 30%, rgba(255, 213, 128, 0.45) 50%, transparent 70%);
}
@keyframes live-shimmer {
  0% { transform: translateX(-100%); }
  40%, 100% { transform: translateX(100%); }
}
.clinic-journey__card-ebsep { color: rgba(13, 122, 147, 0.4); }
.clinic-journey__card-ebtext { color: #0a1420; font-weight: 600; }
.clinic-journey__card-ebtag { color: rgba(13, 122, 147, 0.55); font-weight: 500; margin-left: auto; }
.clinic-journey__card--featured .clinic-journey__card-ebtext { color: #4a3610; }
.clinic-journey__card--featured .clinic-journey__card-ebtag { color: rgba(122, 90, 30, 0.6); }

.clinic-journey__card-dot {
  position: relative;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5BE9EC;
  box-shadow: 0 0 6px #5BE9EC, 0 0 12px rgba(91, 233, 236, 0.5);
}
.clinic-journey__card-dot::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1px solid #5BE9EC;
  animation: dot-ping 1.8s cubic-bezier(0.23, 1, 0.32, 1) infinite;
}
.clinic-journey__card--featured .clinic-journey__card-dot {
  background: #ffd580;
  box-shadow: 0 0 6px #ffd580, 0 0 12px rgba(255, 213, 128, 0.55);
}
.clinic-journey__card--featured .clinic-journey__card-dot::before { border-color: #ffd580; }
@keyframes dot-ping {
  0% { transform: scale(0.8); opacity: 0.7; }
  100% { transform: scale(2.4); opacity: 0; }
}

.clinic-journey__card-title {
  margin: 0 0 12px;
  font-family: 'Instrument Serif', 'Playfair Display', Georgia, serif;
  font-weight: 400;
  font-size: clamp(1.7rem, 2.3vw, 2.15rem);
  line-height: 1.08;
  color: #050c15;
  letter-spacing: -0.02em;
  background: linear-gradient(180deg, #050c15 0%, #1a2b3e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.clinic-journey__card--featured .clinic-journey__card-title {
  background: linear-gradient(180deg, #2d1f08 0%, #5a3f14 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.clinic-journey__card-divider {
  height: 1px;
  margin: 14px 0 14px;
  background: linear-gradient(90deg, transparent, rgba(26, 155, 184, 0.55) 15%, rgba(26, 155, 184, 0.55) 85%, transparent);
}
.clinic-journey__card--featured .clinic-journey__card-divider {
  background: linear-gradient(90deg, transparent, rgba(217, 168, 86, 0.6) 15%, rgba(217, 168, 86, 0.6) 85%, transparent);
}

.clinic-journey__card-progress {
  position: absolute;
  bottom: 0;
  left: 1px;
  right: 1px;
  height: 3px;
  z-index: 2;
  pointer-events: none;
}
.clinic-journey__card-progress-track {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, rgba(26, 155, 184, 0.14), rgba(26, 155, 184, 0.14));
  overflow: hidden;
}
.clinic-journey__card-progress-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #1a9bb8 0%, #5BE9EC 100%);
  box-shadow: 0 0 10px rgba(91, 233, 236, 0.65);
  transition: width 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}
.clinic-journey__card--featured .clinic-journey__card-progress-track {
  background: rgba(217, 168, 86, 0.16);
}
.clinic-journey__card--featured .clinic-journey__card-progress-fill {
  background: linear-gradient(90deg, #d9a856 0%, #ffd580 100%);
  box-shadow: 0 0 10px rgba(255, 213, 128, 0.7);
}
.clinic-journey__card-sub {
  margin: 0 0 18px;
  color: #3d4a5c;
  font-size: 0.92rem;
  line-height: 1.5;
}
.clinic-journey__card-bullets {
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 9px;
}
.clinic-journey__card-bullets li {
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 10px;
  align-items: start;
  font-size: 0.87rem;
  line-height: 1.5;
  color: #1a2434;
}
.clinic-journey__card-bulletmark {
  color: #1a9bb8;
  font-size: 0.72rem;
  line-height: 1.6;
  text-shadow: 0 0 6px rgba(91, 233, 236, 0.5);
  transition: transform 0.25s ease, color 0.25s ease;
}
.clinic-journey__card-bullets li:hover .clinic-journey__card-bulletmark {
  transform: translateX(2px);
  color: #0d7a93;
}
.clinic-journey__card--featured .clinic-journey__card-bulletmark {
  color: #d9a856;
  text-shadow: 0 0 6px rgba(255, 213, 128, 0.55);
}
.clinic-journey__card--featured .clinic-journey__card-bullets li:hover .clinic-journey__card-bulletmark { color: #a67a2b; }

.clinic-journey__card-cta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px 12px 22px;
  background: linear-gradient(135deg, #050c15 0%, #0d2530 100%);
  color: #5BE9EC;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid rgba(91, 233, 236, 0.5);
  position: relative;
  overflow: hidden;
  transition: color 0.25s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease;
}
.clinic-journey__card-cta::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 35%, rgba(91, 233, 236, 0.28) 50%, transparent 65%);
  transform: translateX(-120%);
  transition: transform 0.75s cubic-bezier(0.23, 1, 0.32, 1);
}
.clinic-journey__card-cta:hover {
  color: #ffffff;
  border-color: #5BE9EC;
  transform: translateY(-1px);
  box-shadow: 0 14px 34px -14px rgba(91, 233, 236, 0.7), 0 0 0 1px rgba(91, 233, 236, 0.2);
}
.clinic-journey__card-cta:hover::before { transform: translateX(120%); }
.clinic-journey__card-cta-arrow {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.64rem;
  letter-spacing: 0;
  color: rgba(91, 233, 236, 0.55);
  transition: color 0.25s ease;
}
.clinic-journey__card-cta-glyph {
  display: inline-block;
  color: #5BE9EC;
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), color 0.25s ease;
}
.clinic-journey__card-cta:hover .clinic-journey__card-cta-arrow { color: rgba(255, 255, 255, 0.5); }
.clinic-journey__card-cta:hover .clinic-journey__card-cta-glyph { transform: translateX(3px); color: #ffffff; }
.clinic-journey__card--featured .clinic-journey__card-cta {
  color: #ffd580;
  border-color: rgba(255, 213, 128, 0.55);
}
.clinic-journey__card--featured .clinic-journey__card-cta::before {
  background: linear-gradient(120deg, transparent 35%, rgba(255, 213, 128, 0.3) 50%, transparent 65%);
}
.clinic-journey__card--featured .clinic-journey__card-cta:hover {
  color: #ffffff;
  border-color: #ffd580;
  box-shadow: 0 14px 34px -14px rgba(255, 213, 128, 0.7), 0 0 0 1px rgba(255, 213, 128, 0.25);
}
.clinic-journey__card--featured .clinic-journey__card-cta-arrow { color: rgba(255, 213, 128, 0.55); }
.clinic-journey__card--featured .clinic-journey__card-cta-glyph { color: #ffd580; }

@keyframes card-breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-2px) scale(1.004); }
}

.cj-card-enter-active, .cj-card-leave-active {
  transition: opacity 0.55s ease, transform 0.7s cubic-bezier(0.23, 1, 0.32, 1), filter 0.5s ease;
}
.cj-card-enter-from { opacity: 0; transform: translateX(-32px) scale(0.96); filter: blur(6px); }
.cj-card-leave-to { opacity: 0; transform: translateX(-20px) scale(0.97); filter: blur(5px); }

@media (prefers-reduced-motion: reduce) {
  .clinic-journey__card,
  .clinic-journey__card-shell,
  .clinic-journey__card-halo,
  .clinic-journey__card-rail-dot,
  .clinic-journey__card-dot::before,
  .clinic-journey__card-live::before,
  .clinic-journey__card-sigil span {
    animation: none !important;
  }
  .clinic-journey__card-eyebrow,
  .clinic-journey__card-title,
  .clinic-journey__card-sub,
  .clinic-journey__card-divider,
  .clinic-journey__card-bullets li,
  .clinic-journey__card-cta {
    opacity: 1 !important;
    transform: none !important;
    animation: none !important;
  }
}

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
  .clinic-journey__nav { bottom: 14px; right: 14px; gap: 6px; }
  .clinic-journey__nav-btn { width: 36px; height: 36px; font-size: 1.25rem; }
  .clinic-journey__card {
    top: auto;
    bottom: 80px;
    left: 12px;
    right: 12px;
    width: auto;
  }
  .clinic-journey__card-inner { padding: 22px 20px 18px 26px; }
  .clinic-journey__card-title { font-size: 1.45rem; line-height: 1.1; }
  .clinic-journey__card-sub, .clinic-journey__card-bullets li { font-size: 0.82rem; }
  .clinic-journey__card-sigil { top: 14px; right: 16px; gap: 3px; }
  .clinic-journey__card-sigil span { height: 1.5px; }
  .clinic-journey__card-sigil span:nth-child(1) { width: 16px; }
  .clinic-journey__card-sigil span:nth-child(2) { width: 10px; }
  .clinic-journey__card-sigil span:nth-child(3) { width: 13px; }
  .clinic-journey__card-divider { margin: 10px 0; }
  .clinic-journey__agenda-badge { font-size: 0.6rem; padding: 7px 14px; }
}
</style>

<style>
a[href*="spline.design"],
a[href*="app.spline.design"],
[class*="spline-watermark" i],
[id*="spline-watermark" i] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
