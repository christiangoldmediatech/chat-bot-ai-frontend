<script setup lang="ts">
interface Panel {
  id: number
  time: string
  name: string
  intent: string
  c: string
  a: string
  corner: 'tl' | 'tr' | 'bl' | 'br'
}

const { t } = useI18n()

const PANELS: Panel[] = [
  { id: 1, time: '', name: '', intent: '', c: '', a: '', corner: 'tl' },
  { id: 2, time: '', name: '', intent: '', c: '', a: '', corner: 'tr' },
  { id: 3, time: '', name: '', intent: '', c: '', a: '', corner: 'bl' },
  { id: 4, time: '', name: '', intent: '', c: '', a: '', corner: 'br' },
]

const panels = computed(() => PANELS.map((p) => ({
  ...p,
  time: t(`landing.parallel.panels.${p.id}.time`),
  name: t(`landing.parallel.panels.${p.id}.name`),
  intent: t(`landing.parallel.panels.${p.id}.intent`),
  c: t(`landing.parallel.panels.${p.id}.c`),
  a: t(`landing.parallel.panels.${p.id}.a`),
})))

const rootEl = ref<HTMLElement | null>(null)
const stage = ref(0)
const { observeSection } = useShiftState()
observeSection(rootEl, 'demo')
let timers: number[] = []
let observer: IntersectionObserver | null = null

function clearTimers() {
  timers.forEach(id => window.clearTimeout(id))
  timers = []
}

function playOnce() {
  clearTimers()
  stage.value = 0
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    stage.value = 999
    return
  }
  const steps = [
    { s: 1, at: 160 },
    { s: 2, at: 440 },
    { s: 3, at: 740 },
    { s: 4, at: 1040 },
    { s: 5, at: 1520 },
    { s: 6, at: 1900 },
    { s: 7, at: 2280 },
    { s: 8, at: 2660 },
    { s: 9, at: 3100 },
  ]
  steps.forEach(({ s, at }) => {
    timers.push(window.setTimeout(() => { stage.value = s }, at))
  })
}

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) {
      playOnce()
      observer?.disconnect()
      observer = null
    }
  }, { threshold: 0.35 })
  if (rootEl.value) observer.observe(rootEl.value)
})

onBeforeUnmount(() => {
  clearTimers()
  observer?.disconnect()
})

function cornerClass(c: Panel['corner']) {
  return `pp--${c}`
}

function panelVisible(id: number) {
  return stage.value >= id
}

function clientVisible(id: number) {
  return stage.value >= id + 4
}

function aliaVisible(id: number) {
  return stage.value >= id + 5
}
</script>

<template>
  <section
    id="demo"
    ref="rootEl"
    class="pp-wrap relative py-[clamp(90px,13vh,170px)]"
    aria-labelledby="pp-title"
  >
    <div class="mx-auto w-full max-w-[1280px] px-[clamp(20px,4vw,52px)]">
      <div v-reveal class="lurviax-rv mb-[clamp(44px,6vw,72px)] grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div>
          <p class="pp-eyebrow">
            <span class="pp-eyebrow__line" />
            {{ $t('landing.sectionNum.demo') }}
          </p>
          <h2 id="pp-title" class="pp-title">
            {{ $t('landing.parallel.titleA') }}<br>
            <em class="pp-title__em">{{ $t('landing.parallel.titleB') }}</em>
          </h2>
        </div>
        <p class="pp-copy">{{ $t('landing.parallel.copy') }}</p>
      </div>

      <div class="pp-stage">
        <div
          v-for="p in panels"
          :key="p.id"
          class="pp-panel"
          :class="[cornerClass(p.corner), { 'pp-panel--in': panelVisible(p.id) }]"
        >
          <div class="pp-panel__head">
            <span class="pp-time">{{ p.time }}</span>
            <span class="pp-intent">{{ p.intent }}</span>
          </div>
          <div class="pp-panel__name">{{ p.name }}</div>
          <div class="pp-chat">
            <div class="pp-bubble pp-bubble--them" :class="{ 'pp-bubble--in': clientVisible(p.id) }">
              {{ p.c }}
            </div>
            <div class="pp-bubble pp-bubble--alia" :class="{ 'pp-bubble--in': aliaVisible(p.id) }">
              {{ p.a }}
            </div>
          </div>
          <svg class="pp-link" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M 0 30 Q 100 30 200 30" />
          </svg>
        </div>

        <div class="pp-core" aria-hidden="true">
          <div class="pp-core__ring" />
          <div class="pp-core__ring pp-core__ring--2" />
          <div class="pp-core__node">
            <span class="pp-core__label">{{ $t('landing.parallel.centerLabel') }}</span>
            <span class="pp-core__sub">{{ $t('landing.parallel.centerSub') }}</span>
          </div>
        </div>
      </div>

      <div v-reveal="160" class="lurviax-rv pp-stats">
        <div class="pp-stat">
          <span class="pp-stat__num">{{ $t('landing.parallel.stat1.num') }}</span>
          <span class="pp-stat__label">{{ $t('landing.parallel.stat1.label') }}</span>
        </div>
        <div class="pp-stat">
          <span class="pp-stat__num">{{ $t('landing.parallel.stat2.num') }}</span>
          <span class="pp-stat__label">{{ $t('landing.parallel.stat2.label') }}</span>
        </div>
        <div class="pp-stat">
          <span class="pp-stat__num">{{ $t('landing.parallel.stat3.num') }}</span>
          <span class="pp-stat__label">{{ $t('landing.parallel.stat3.label') }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pp-wrap {
  isolation: isolate;
}

.pp-eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.705rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(91, 233, 236, 0.75);
}
.pp-eyebrow__line {
  display: inline-block;
  width: 24px;
  height: 1px;
  background: rgba(91, 233, 236, 0.75);
  transition: width 0.7s cubic-bezier(0.23, 1, 0.32, 1);
}
.lurviax-rv.reveal-in .pp-eyebrow__line {
  width: 56px;
}

.pp-title {
  margin-top: 16px;
  font-family: Archivo, 'Chivo', ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 108, 'wght' 500;
  font-size: clamp(1.9rem, 4.2vw, 3.1rem);
  line-height: 1.08;
  letter-spacing: -0.012em;
  color: #ffffff;
}
.pp-title__em {
  font-style: normal;
  font-variation-settings: 'wdth' 108, 'wght' 620;
  color: #5BE9EC;
}

.pp-copy {
  max-width: 62ch;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.55;
}

.pp-stage {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(16px, 2.5vw, 36px);
  padding: clamp(28px, 4vw, 54px) 0;
}

.pp-panel {
  position: relative;
  padding: 18px;
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(91, 233, 236, 0.08), rgba(7, 125, 220, 0.04)),
    rgba(1, 20, 42, 0.72);
  backdrop-filter: blur(12px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 0 0 0.5px rgba(91, 233, 236, 0.22),
    0 2px 4px -2px rgba(0, 0, 0, 0.5),
    0 10px 20px -8px rgba(0, 0, 0, 0.55),
    0 28px 60px -28px rgba(0, 0, 0, 0.65),
    0 60px 120px -40px rgba(1, 20, 42, 0.8);
  opacity: 0;
  transform: translateY(24px) scale(0.98);
  transition:
    opacity 0.55s cubic-bezier(0.23, 1, 0.32, 1),
    transform 0.6s cubic-bezier(0.23, 1, 0.32, 1),
    box-shadow 0.45s cubic-bezier(0.23, 1, 0.32, 1);
}
.pp-panel:hover {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    inset 0 0 0 0.5px rgba(91, 233, 236, 0.4),
    0 2px 4px -2px rgba(0, 0, 0, 0.5),
    0 12px 24px -8px rgba(0, 0, 0, 0.6),
    0 32px 70px -28px rgba(0, 0, 0, 0.7),
    0 70px 140px -40px rgba(1, 20, 42, 0.85),
    0 0 40px -12px rgba(91, 233, 236, 0.25);
}
.pp-panel--in {
  opacity: 1;
  transform: none;
}
.pp-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), rgba(91, 233, 236, 0.1), transparent 70%);
  opacity: 0;
  transition: opacity 0.4s ease;
}
.pp-panel:hover::before { opacity: 1; }

.pp-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.pp-time {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  color: #5BE9EC;
  font-variant-numeric: tabular-nums;
}
.pp-intent {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.64rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(91, 233, 236, 0.2);
  background: rgba(1, 20, 42, 0.6);
}

.pp-panel__name {
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  color: #ffffff;
  margin-bottom: 12px;
}

.pp-chat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pp-bubble {
  max-width: 88%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.82rem;
  line-height: 1.38;
  color: #ffffff;
  opacity: 0;
  transform: translateY(6px) scale(0.98);
  transition:
    opacity 0.4s cubic-bezier(0.23, 1, 0.32, 1),
    transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}
.pp-bubble--in {
  opacity: 1;
  transform: none;
}
.pp-bubble--them {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom-left-radius: 4px;
}
.pp-bubble--alia {
  align-self: flex-end;
  background: linear-gradient(135deg, rgba(91, 233, 236, 0.22), rgba(7, 125, 220, 0.3));
  border: 1px solid rgba(91, 233, 236, 0.35);
  border-bottom-right-radius: 4px;
}

.pp-link {
  position: absolute;
  z-index: -1;
  width: 50%;
  height: 40px;
  stroke: #5BE9EC;
  stroke-width: 1;
  fill: none;
  stroke-dasharray: 4 6;
  opacity: 0;
  pointer-events: none;
  animation: pp-link-pulse 3.5s ease-in-out infinite;
}
.pp-panel--in .pp-link { opacity: 0.5; }

.pp--tl .pp-link { right: -20%; bottom: 50%; }
.pp--tr .pp-link { left: -20%; bottom: 50%; transform: scaleX(-1); }
.pp--bl .pp-link { right: -20%; top: 50%; }
.pp--br .pp-link { left: -20%; top: 50%; transform: scaleX(-1); }

@keyframes pp-link-pulse {
  0%, 100% { stroke-dashoffset: 0; opacity: 0.35; }
  50% { stroke-dashoffset: -40; opacity: 0.6; }
}

.pp-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: clamp(140px, 16vw, 200px);
  height: clamp(140px, 16vw, 200px);
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  pointer-events: none;
}
.pp-core__ring,
.pp-core__ring--2 {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(91, 233, 236, 0.3);
  border-radius: 50%;
  animation: pp-ring 3.6s ease-out infinite;
}
.pp-core__ring--2 {
  animation-delay: 1.2s;
}
@keyframes pp-ring {
  0% { transform: scale(0.6); opacity: 0.7; }
  100% { transform: scale(1.7); opacity: 0; }
}
.pp-core__node {
  position: relative;
  width: 72%;
  height: 72%;
  display: grid;
  place-items: center;
  text-align: center;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, rgba(91, 233, 236, 0.55), rgba(7, 125, 220, 0.75) 60%, rgba(1, 20, 42, 0.95));
  box-shadow:
    inset 0 0 24px rgba(91, 233, 236, 0.3),
    0 0 48px rgba(91, 233, 236, 0.35);
  animation: pp-breathe 4s ease-in-out infinite;
}
.pp-core__label {
  position: absolute;
  top: 36%;
  left: 0;
  right: 0;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: clamp(0.74rem, 1.2vw, 0.9rem);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #ffffff;
}
.pp-core__sub {
  position: absolute;
  top: 54%;
  left: 0;
  right: 0;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: clamp(0.62rem, 1vw, 0.76rem);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
}
@keyframes pp-breathe {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.03); filter: brightness(1.1); }
}

.pp-stats {
  margin-top: clamp(32px, 4vw, 48px);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid rgba(91, 233, 236, 0.15);
  border-bottom: 1px solid rgba(91, 233, 236, 0.15);
}
.pp-stat {
  padding: 22px 18px;
  text-align: left;
  border-left: 1px solid rgba(91, 233, 236, 0.1);
}
.pp-stat:first-child { border-left: 0; }
.pp-stat__num {
  display: block;
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 90, 'wght' 400;
  font-size: clamp(2.2rem, 4.4vw, 3.2rem);
  line-height: 1;
  color: #5BE9EC;
  font-variant-numeric: tabular-nums;
}
.pp-stat__label {
  display: block;
  margin-top: 10px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

@media (max-width: 720px) {
  .pp-stage { grid-template-columns: 1fr; }
  .pp-core {
    position: relative;
    top: auto;
    left: auto;
    transform: none;
    margin: 0 auto;
  }
  .pp-link { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .pp-panel,
  .pp-bubble,
  .pp-core__ring,
  .pp-core__node,
  .pp-link {
    animation: none !important;
    transition: none !important;
  }
  .pp-panel { opacity: 1; transform: none; }
  .pp-bubble { opacity: 1; transform: none; }
  .pp-core__ring { display: none; }
}
</style>
