<script setup lang="ts">
interface Msg { s: 'them' | 'alia', t: string }

const { t } = useI18n()
const auth = useAuthStore()
const isAuthenticated = computed(() => auth.isAuthenticated)
const primaryCtaTarget = computed(() => (isAuthenticated.value ? '/admin' : '/login'))

const SCRIPT = [
  { s: 'them' as const, k: 'landing.heroScene.m1' },
  { s: 'alia' as const, k: 'landing.heroScene.m2' },
  { s: 'them' as const, k: 'landing.heroScene.m3' },
  { s: 'alia' as const, k: 'landing.heroScene.m4' },
  { s: 'them' as const, k: 'landing.heroScene.m5' },
  { s: 'alia' as const, k: 'landing.heroScene.m6' },
]

const rendered = ref<Msg[]>([])
const typing = ref(false)
const vibrating = ref(false)
const threadEl = ref<HTMLDivElement | null>(null)
const alive = ref(true)
const heroCtaRef = ref<{ $el: HTMLElement } | HTMLElement | null>(null)
const heroCtaEl = computed<HTMLElement | null>(() => {
  const r = heroCtaRef.value as { $el?: HTMLElement } | HTMLElement | null
  if (!r) return null
  return '$el' in r ? r.$el ?? null : r as HTMLElement
})
useMagnetic(heroCtaEl, { radius: 110, strength: 0.28 })
let timers: number[] = []
let reducedMotion = false

function clearTimers() {
  timers.forEach(id => window.clearTimeout(id))
  timers = []
}

async function scrollBottom() {
  await nextTick()
  if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
}

function run() {
  clearTimers()
  rendered.value = []
  typing.value = false

  if (reducedMotion) {
    rendered.value = SCRIPT.map(m => ({ s: m.s, t: t(m.k) }))
    scrollBottom()
    return
  }

  let delay = 450
  SCRIPT.forEach((msg) => {
    const text = t(msg.k)
    const think = msg.s === 'alia' ? 780 : 540
    const read = Math.min(text.length * 26, 2400)

    if (msg.s === 'alia') {
      timers.push(window.setTimeout(() => {
        typing.value = true
        scrollBottom()
        timers.push(window.setTimeout(() => {
          typing.value = false
          rendered.value = [...rendered.value, { s: 'alia', t: text }]
          scrollBottom()
        }, think))
      }, delay))
      delay += think + read
    }
    else {
      const vibrateLead = 220
      timers.push(window.setTimeout(() => {
        vibrating.value = true
        timers.push(window.setTimeout(() => { vibrating.value = false }, 260))
      }, delay - vibrateLead))
      timers.push(window.setTimeout(() => {
        rendered.value = [...rendered.value, { s: 'them', t: text }]
        scrollBottom()
      }, delay))
      delay += think + read * 0.6
    }
  })

  timers.push(window.setTimeout(() => {
    if (alive.value) run()
  }, delay + 3600))
}

function smoothScroll(ev: MouseEvent, href: string) {
  const el = document.querySelector(href)
  if (!el) return
  ev.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  run()
})

onBeforeUnmount(() => {
  alive.value = false
  clearTimers()
})
</script>

<template>
  <section
    id="hero"
    class="hero-scene relative flex min-h-screen items-center overflow-hidden px-[clamp(20px,4vw,52px)] py-[clamp(72px,10vh,120px)]"
    aria-labelledby="hero-scene-title"
  >
    <div class="hero-scene__halo" aria-hidden="true" />
    <svg class="hero-scene__signal" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="signalGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#5BE9EC" stop-opacity="0" />
          <stop offset="50%" stop-color="#5BE9EC" stop-opacity="0.75" />
          <stop offset="100%" stop-color="#5BE9EC" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="M 1050 250 Q 800 300 420 320" stroke="url(#signalGrad)" stroke-width="1.2" fill="none" />
      <path d="M 1050 450 Q 760 470 420 460" stroke="url(#signalGrad)" stroke-width="1.0" fill="none" />
      <path d="M 1050 640 Q 820 630 420 600" stroke="url(#signalGrad)" stroke-width="0.8" fill="none" />
    </svg>

    <div class="relative z-10 mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-[clamp(40px,6vw,96px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div class="text-left">
        <p class="hs-eyebrow">
          <span class="hs-eyebrow__dot" aria-hidden="true" />
          {{ $t('landing.heroScene.eyebrow') }}
        </p>

        <h1 id="hero-scene-title" class="hs-wordmark">
          <span class="hs-wordmark__text">LURVIAX</span>
          <span class="hs-wordmark__scan" aria-hidden="true" />
          <span class="hs-wordmark__sweep" aria-hidden="true" />
        </h1>

        <p class="hs-claim">
          <span>{{ $t('landing.heroScene.claimA') }}</span>
          <em class="hs-claim__em">{{ $t('landing.heroScene.claimEm') }}</em>
          <span>{{ $t('landing.heroScene.claimB') }}</span>
        </p>

        <p class="hs-copy">
          {{ $t('landing.heroScene.copy') }}
        </p>

        <div class="hs-ctas">
          <NuxtLink
            ref="heroCtaRef"
            :to="primaryCtaTarget"
            class="hs-pill hs-pill--primary"
          >
            {{ isAuthenticated ? $t('landing.goToDashboard') : $t('landing.heroScene.ctaPrimary') }}
          </NuxtLink>
          <a
            href="#demo"
            class="hs-pill hs-pill--ghost"
            @click="smoothScroll($event, '#demo')"
          >
            {{ $t('landing.heroScene.ctaSecondary') }}
          </a>
        </div>

        <ul class="hs-chips" :aria-label="$t('landing.heroScene.capsAria')">
          <li class="hs-chip"><span class="hs-chip__dot" />{{ $t('landing.heroScene.caps.247') }}</li>
          <li class="hs-chip"><span class="hs-chip__dot" />{{ $t('landing.heroScene.caps.agenda') }}</li>
          <li class="hs-chip"><span class="hs-chip__dot" />{{ $t('landing.heroScene.caps.voice') }}</li>
        </ul>
      </div>

      <div class="relative mx-auto w-full max-w-[380px] lg:mx-0 lg:justify-self-end">
        <div class="hs-phone" :class="{ 'hs-phone--buzz': vibrating }">
          <div class="hs-phone__notch" aria-hidden="true" />
          <div class="hs-phone__screen">
            <div class="hs-wa-header">
              <div class="hs-wa-avatar" aria-hidden="true">D</div>
              <div class="min-w-0 flex-1">
                <div class="hs-wa-name">{{ $t('landing.heroScene.phoneContact') }}</div>
                <div class="hs-wa-status">
                  <span class="hs-wa-status__dot" />{{ $t('landing.heroScene.phoneContactSub') }} · {{ $t('landing.heroScene.phoneStatus') }}
                </div>
              </div>
              <svg viewBox="0 0 24 24" class="hs-wa-icon" aria-hidden="true">
                <path fill="currentColor" d="M15 12l-4-4v3H3v2h8v3z" />
              </svg>
            </div>

            <div ref="threadEl" class="hs-wa-thread">
              <div
                v-for="(msg, idx) in rendered"
                :key="idx"
                class="hs-bubble"
                :class="msg.s === 'alia' ? 'hs-bubble--alia' : 'hs-bubble--them'"
              >
                {{ msg.t }}
              </div>

              <div v-if="typing" class="hs-bubble hs-bubble--alia hs-bubble--typing" :aria-label="$t('landing.heroScene.typing')">
                <span class="hs-typing__dot" />
                <span class="hs-typing__dot" />
                <span class="hs-typing__dot" />
              </div>
            </div>

            <div class="hs-wa-input">
              <span class="hs-wa-input__pill">{{ $t('landing.heroScene.phoneInputPlaceholder') }}</span>
            </div>
          </div>

          <div class="hs-phone__glow" aria-hidden="true" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-scene {
  isolation: isolate;
}

.hero-scene__halo {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 60% 55% at 72% 50%, rgba(91, 233, 236, 0.18), transparent 60%),
    radial-gradient(ellipse 50% 60% at 22% 42%, rgba(7, 125, 220, 0.22), transparent 65%);
  pointer-events: none;
}

.hero-scene__signal {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  stroke-dasharray: 8 14;
  opacity: 0.55;
  animation: hs-signal 7s linear infinite;
}
@keyframes hs-signal {
  to { stroke-dashoffset: -220; }
}

.hs-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  border: 1px solid rgba(91, 233, 236, 0.3);
  border-radius: 999px;
  background: rgba(1, 20, 42, 0.5);
  backdrop-filter: blur(8px);
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: clamp(0.66rem, 1vw, 0.76rem);
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #ffffff;
  opacity: 0;
  animation: hs-rise 0.6s cubic-bezier(0.23, 1, 0.32, 1) 0.05s forwards;
}
.hs-eyebrow__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5BE9EC;
  box-shadow: 0 0 10px #5BE9EC;
  animation: hs-pulse 2.2s ease-in-out infinite;
}

.hs-wordmark {
  position: relative;
  display: inline-block;
  margin: clamp(18px, 2.4vw, 32px) 0 0;
  font-family: Archivo, 'Chivo', ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 100, 'wght' 220;
  font-size: clamp(3.4rem, 9.5vw, 7rem);
  line-height: 0.92;
  letter-spacing: 0.08em;
  color: #ffffff;
  text-shadow: 0 2px 42px rgba(91, 233, 236, 0.28);
  opacity: 0;
  animation:
    hs-rise 0.75s cubic-bezier(0.23, 1, 0.32, 1) 0.18s forwards,
    hs-wordmark-breathe 6.5s ease-in-out 1.6s infinite;
}
@keyframes hs-wordmark-breathe {
  0%, 100% {
    font-variation-settings: 'wdth' 100, 'wght' 220;
    text-shadow: 0 2px 42px rgba(91, 233, 236, 0.28);
  }
  50% {
    font-variation-settings: 'wdth' 100, 'wght' 242;
    text-shadow: 0 2px 56px rgba(91, 233, 236, 0.4);
  }
}
.hs-wordmark__text {
  position: relative;
  z-index: 2;
}
.hs-wordmark__scan {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: repeating-linear-gradient(
    180deg,
    transparent 0 3px,
    rgba(91, 233, 236, 0.11) 3px 4px
  );
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 20%, #000 80%, transparent);
  mask-image: linear-gradient(180deg, transparent, #000 20%, #000 80%, transparent);
  mix-blend-mode: screen;
  opacity: 0;
  animation: hs-scan-in 0.9s ease-out 0.9s forwards;
}
.hs-wordmark__sweep {
  position: absolute;
  left: -6%;
  right: -6%;
  top: 48%;
  height: 2px;
  z-index: 3;
  background: linear-gradient(90deg, transparent, rgba(91, 233, 236, 0.9), transparent);
  filter: blur(0.4px);
  transform: translateY(-120%);
  opacity: 0;
  animation: hs-sweep 2.4s cubic-bezier(0.23, 1, 0.32, 1) 1.1s 1;
}

.hs-claim {
  margin: clamp(22px, 2.6vw, 34px) 0 0;
  font-family: Archivo, 'Chivo', ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 108, 'wght' 480;
  font-size: clamp(1.4rem, 2.6vw, 2.1rem);
  line-height: 1.12;
  letter-spacing: -0.012em;
  color: #ffffff;
  max-width: 22ch;
  opacity: 0;
  animation: hs-rise 0.6s cubic-bezier(0.23, 1, 0.32, 1) 0.38s forwards;
}
.hs-claim__em {
  font-style: normal;
  font-variation-settings: 'wdth' 108, 'wght' 620;
  color: #5BE9EC;
  margin: 0 0.18em;
}

.hs-copy {
  margin-top: clamp(18px, 2vw, 24px);
  max-width: 54ch;
  font-size: clamp(0.98rem, 1.4vw, 1.1rem);
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.72);
  opacity: 0;
  animation: hs-rise 0.6s cubic-bezier(0.23, 1, 0.32, 1) 0.5s forwards;
}

.hs-ctas {
  margin-top: clamp(26px, 3vw, 36px);
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  opacity: 0;
  animation: hs-rise 0.6s cubic-bezier(0.23, 1, 0.32, 1) 0.62s forwards;
}
.hs-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: 999px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  transition:
    transform 180ms cubic-bezier(0.23, 1, 0.32, 1),
    box-shadow 220ms cubic-bezier(0.23, 1, 0.32, 1),
    filter 180ms ease-out,
    border-color 200ms ease-out,
    background-color 200ms ease-out;
  will-change: transform;
}
.hs-pill:active { transform: scale(0.97); }
.hs-pill--primary {
  background: linear-gradient(120deg, #5BE9EC 0%, #077DDC 100%);
  color: #01142A;
  font-weight: 600;
  box-shadow: 0 14px 34px -14px rgba(91, 233, 236, 0.45);
}
.hs-pill--ghost {
  border: 1px solid rgba(91, 233, 236, 0.35);
  background: rgba(3, 32, 64, 0.55);
  color: #ffffff;
  backdrop-filter: blur(8px);
}
@media (hover: hover) and (pointer: fine) {
  .hs-pill:hover { transform: translateY(-2px); }
  .hs-pill--primary:hover {
    filter: brightness(1.08) saturate(1.1);
    box-shadow: 0 18px 44px -14px rgba(91, 233, 236, 0.6);
  }
  .hs-pill--ghost:hover {
    border-color: #5BE9EC;
    background: rgba(3, 72, 113, 0.6);
  }
}

.hs-chips {
  margin: clamp(22px, 3vw, 32px) 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  list-style: none;
  opacity: 0;
  animation: hs-rise 0.6s cubic-bezier(0.23, 1, 0.32, 1) 0.74s forwards;
}
.hs-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
}
.hs-chip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #5BE9EC;
  box-shadow: 0 0 8px rgba(91, 233, 236, 0.9);
}

.hs-phone {
  position: relative;
  aspect-ratio: 9 / 18.5;
  border-radius: 44px;
  padding: 10px;
  background: linear-gradient(145deg, #0a2a4a 0%, #01142a 55%, #030303 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 0 0 0.5px rgba(91, 233, 236, 0.3),
    inset 0 -2px 8px rgba(0, 0, 0, 0.4),
    0 4px 10px -4px rgba(0, 0, 0, 0.6),
    0 16px 40px -14px rgba(0, 0, 0, 0.7),
    0 40px 90px -30px rgba(0, 0, 0, 0.92),
    0 80px 160px -40px rgba(1, 20, 42, 0.85),
    0 0 70px -14px rgba(91, 233, 236, 0.3);
  opacity: 0;
  transform: translateY(24px) rotate(-1.5deg);
  animation: hs-phone-in 0.9s cubic-bezier(0.23, 1, 0.32, 1) 0.45s forwards;
  transition: box-shadow 220ms ease-out;
}
.hs-phone--buzz {
  animation: hs-phone-in 0.9s cubic-bezier(0.23, 1, 0.32, 1) 0.45s forwards, hs-phone-buzz 260ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 0 0 0.5px rgba(91, 233, 236, 0.75),
    inset 0 -2px 8px rgba(0, 0, 0, 0.4),
    0 4px 10px -4px rgba(0, 0, 0, 0.6),
    0 16px 40px -14px rgba(0, 0, 0, 0.7),
    0 40px 90px -30px rgba(0, 0, 0, 0.92),
    0 80px 160px -40px rgba(1, 20, 42, 0.85),
    0 0 110px -12px rgba(91, 233, 236, 0.6);
}
@keyframes hs-phone-buzz {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  15% { transform: translateY(0) rotate(-2.6deg) translateX(-2px); }
  30% { transform: translateY(0) rotate(-0.4deg) translateX(2px); }
  45% { transform: translateY(0) rotate(-2.2deg) translateX(-1px); }
  60% { transform: translateY(0) rotate(-0.8deg) translateX(1px); }
  75% { transform: translateY(0) rotate(-1.8deg) translateX(-1px); }
}
.hs-phone__notch {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  height: 22px;
  border-radius: 999px;
  background: #000000;
  z-index: 3;
}
.hs-phone__screen {
  position: relative;
  height: 100%;
  border-radius: 34px;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 0%, #054871 0%, #01142a 55%) ,
    #01142a;
  display: flex;
  flex-direction: column;
}
.hs-phone__glow {
  position: absolute;
  inset: -18%;
  z-index: -1;
  background: radial-gradient(ellipse at 50% 55%, rgba(91, 233, 236, 0.28), transparent 60%);
  filter: blur(40px);
  pointer-events: none;
  animation: hs-phone-glow 6s ease-in-out infinite;
}

.hs-wa-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 44px 14px 12px;
  background: linear-gradient(180deg, rgba(5, 72, 113, 0.9), rgba(1, 20, 42, 0.0));
  border-bottom: 1px solid rgba(91, 233, 236, 0.18);
}
.hs-wa-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-weight: 700;
  color: #01142A;
  background: linear-gradient(135deg, #5BE9EC, #077DDC);
  box-shadow: 0 0 18px rgba(91, 233, 236, 0.5);
}
.hs-wa-name {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #ffffff;
}
.hs-wa-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.65);
}
.hs-wa-status__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #25D366;
  box-shadow: 0 0 8px rgba(37, 211, 102, 0.9);
}
.hs-wa-icon {
  width: 20px;
  height: 20px;
  color: rgba(91, 233, 236, 0.7);
}

.hs-wa-thread {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;
  scrollbar-width: none;
}
.hs-wa-thread::-webkit-scrollbar { display: none; }

.hs-bubble {
  max-width: 82%;
  padding: 9px 12px;
  border-radius: 14px;
  font-size: 0.86rem;
  line-height: 1.38;
  color: #ffffff;
  animation: hs-bubble-in 360ms cubic-bezier(0.23, 1, 0.32, 1) both;
}
.hs-bubble--them {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom-left-radius: 4px;
}
.hs-bubble--alia {
  align-self: flex-end;
  background: linear-gradient(135deg, rgba(91, 233, 236, 0.22), rgba(7, 125, 220, 0.3));
  border: 1px solid rgba(91, 233, 236, 0.35);
  border-bottom-right-radius: 4px;
  box-shadow: 0 6px 20px -10px rgba(91, 233, 236, 0.5);
}
.hs-bubble--typing {
  display: inline-flex;
  gap: 4px;
  padding: 10px 14px;
}
.hs-typing__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  animation: hs-typing-bounce 1.1s ease-in-out infinite;
}
.hs-typing__dot:nth-child(2) { animation-delay: 0.15s; }
.hs-typing__dot:nth-child(3) { animation-delay: 0.3s; }

.hs-wa-input {
  padding: 10px 12px 14px;
  background: linear-gradient(0deg, rgba(5, 72, 113, 0.4), transparent);
  border-top: 1px solid rgba(91, 233, 236, 0.12);
}
.hs-wa-input__pill {
  display: block;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.4);
}

@keyframes hs-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
@keyframes hs-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
}
@keyframes hs-scan-in {
  to { opacity: 0.9; }
}
@keyframes hs-sweep {
  0% { transform: translateY(-120%); opacity: 0; }
  28% { opacity: 0.9; }
  100% { transform: translateY(120%); opacity: 0; }
}
@keyframes hs-phone-in {
  to { opacity: 1; transform: translateY(0) rotate(-1.5deg); }
}
@keyframes hs-phone-glow {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.05); }
}
@keyframes hs-bubble-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@keyframes hs-typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-4px); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-scene__signal,
  .hs-eyebrow,
  .hs-eyebrow__dot,
  .hs-wordmark,
  .hs-wordmark__scan,
  .hs-wordmark__sweep,
  .hs-claim,
  .hs-copy,
  .hs-ctas,
  .hs-chips,
  .hs-phone,
  .hs-phone__glow,
  .hs-bubble,
  .hs-typing__dot {
    animation: none;
  }
  .hs-eyebrow,
  .hs-wordmark,
  .hs-claim,
  .hs-copy,
  .hs-ctas,
  .hs-chips,
  .hs-phone {
    opacity: 1;
    transform: none;
  }
  .hs-wordmark__scan { opacity: 0.7; }
  .hs-wordmark__sweep { display: none; }
  .hs-phone--buzz {
    animation: none;
    box-shadow:
      inset 0 0 0 1px rgba(91, 233, 236, 0.25),
      0 30px 80px -30px rgba(0, 0, 0, 0.9),
      0 0 60px -12px rgba(91, 233, 236, 0.25);
  }
}
</style>
