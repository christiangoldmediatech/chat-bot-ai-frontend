<script setup lang="ts">
definePageMeta({ layout: false })

// Google Analytics (gtag.js) — solo en la landing. Nuxt inyecta estos tags
// vía useHead y los retira al navegar a otra ruta (la app es SPA con
// ssr:false). El primer script carga el SDK async; el segundo bootea
// dataLayer y dispara la config con el measurement id.
useHead({
  script: [
    {
      src: 'https://www.googletagmanager.com/gtag/js?id=G-3CNB35H723',
      async: true,
    },
    {
      innerHTML: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-3CNB35H723');`,
    },
  ],
})

const { t } = useI18n()
const auth = useAuthStore()
const isAuthenticated = computed(() => auth.isAuthenticated)
const primaryCtaTarget = computed(() => (isAuthenticated.value ? '/admin' : '/login'))
const primaryCtaLabel = computed(() =>
  isAuthenticated.value ? t('landing.goToDashboard') : t('landing.signIn'),
)

const prefersReducedMotion = ref(false)

// ---- Scroll: navbar, parallax, barra de progreso ----

const scrollY = ref(0)
const scrollProgress = ref(0)
const heroVisible = ref(false)

const onScroll = () => {
  scrollY.value = window.scrollY
  const max = document.documentElement.scrollHeight - window.innerHeight
  scrollProgress.value = max > 0 ? Math.min(window.scrollY / max, 1) : 0
}

const scrolled = computed(() => scrollY.value > 16)
const heroOpacity = computed(() => Math.max(0, 1 - scrollY.value / 520))
const heroLift = computed(() => `translate3d(0, ${scrollY.value * -0.12}px, 0)`)

const parallax = (speed: number, axis: 'y' | 'x' = 'y') => {
  const offset = scrollY.value * speed
  return {
    transform: axis === 'y'
      ? `translate3d(0, ${offset}px, 0)`
      : `translate3d(${offset}px, 0, 0)`,
    willChange: 'transform',
  }
}

// ---- Headline palabra por palabra ----
// title2 empieza con la puntuación pegada a "Kaibot" (". El agente…"), así
// que ese primer token se fusiona con el span del gradiente para que el
// punto no quede huérfano al animar por palabras.
const heroWords = computed(() => {
  const t1 = t('landing.hero.title1').trim().split(/\s+/)
  const t2 = t('landing.hero.title2').trim().split(/\s+/)
  let kaibot = 'Kaibot'
  let rest = t2
  if (t2[0] && !/^[a-zA-ZÀ-ÿ0-9]/.test(t2[0])) {
    kaibot += t2[0]
    rest = t2.slice(1)
  }
  return { t1, kaibot, rest }
})

// Texto completo del headline para lectores de pantalla: los spans animados
// por palabra van con aria-hidden para que no se lean troceados.
const heroTitleText = computed(() =>
  `${t('landing.hero.title1')} Kaibot${t('landing.hero.title2')}`,
)

// ---- Chat preview en loop ----
// Máquina de estados con timeouts: usuario pregunta → "escribiendo…" → bot
// responde → segunda pregunta → bot cierra → pausa → reinicia. Con
// prefers-reduced-motion se muestra la conversación completa y estática.
const chatStage = ref(0)
let chatTimers: number[] = []

const CHAT_STEPS: Array<{ stage: number, at: number }> = [
  { stage: 1, at: 500 },
  { stage: 2, at: 1200 },
  { stage: 3, at: 2700 },
  { stage: 4, at: 3900 },
  { stage: 5, at: 4600 },
  { stage: 6, at: 6100 },
]

function clearChatTimers() {
  chatTimers.forEach(id => window.clearTimeout(id))
  chatTimers = []
}

function runChatLoop() {
  clearChatTimers()
  chatStage.value = 0
  for (const step of CHAT_STEPS) {
    chatTimers.push(window.setTimeout(() => {
      chatStage.value = step.stage
    }, step.at))
  }
  chatTimers.push(window.setTimeout(runChatLoop, 9600))
}

const chatTyping = computed(() => chatStage.value === 2 || chatStage.value === 5)

// ---- Contadores de stats ----

const statsEl = ref<HTMLElement | null>(null)
const STAT_TARGETS = [24, 100, 3] as const
const statValues = ref<number[]>([0, 0, 0])
let statsObserver: IntersectionObserver | null = null
let statsRaf = 0

function animateStats() {
  const DURATION = 1400
  const start = performance.now()
  const step = (now: number) => {
    const p = Math.min((now - start) / DURATION, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    statValues.value = STAT_TARGETS.map(target => Math.round(target * eased))
    if (p < 1) statsRaf = requestAnimationFrame(step)
  }
  statsRaf = requestAnimationFrame(step)
}

onMounted(() => {
  if (!import.meta.client) return
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  requestAnimationFrame(() => {
    heroVisible.value = true
  })

  if (prefersReducedMotion.value) {
    chatStage.value = 6
    statValues.value = [...STAT_TARGETS]
    return
  }

  runChatLoop()

  if (statsEl.value) {
    statsObserver = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        animateStats()
        statsObserver?.disconnect()
        statsObserver = null
      }
    }, { threshold: 0.4 })
    statsObserver.observe(statsEl.value)
  }
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('scroll', onScroll)
  clearChatTimers()
  statsObserver?.disconnect()
  cancelAnimationFrame(statsRaf)
})
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden bg-sky-day font-sans text-slate-900">
    <!-- Barra de progreso de lectura -->
    <div
      class="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-primary-500 via-primary-400 to-success-500"
      :style="{ transform: `scaleX(${scrollProgress})` }"
      aria-hidden="true"
    />

    <!-- Sticky glass navbar -->
    <header
      class="fixed inset-x-0 top-0 z-50 backdrop-blur-xl ring-1 transition-all duration-300"
      :class="scrolled
        ? 'bg-white/85 ring-white/70 shadow-glass'
        : 'bg-white/60 ring-white/50'"
    >
      <div
        class="mx-auto flex max-w-7xl items-center justify-between px-6 transition-all duration-300"
        :class="scrolled ? 'py-3' : 'py-4'"
      >
        <NuxtLink to="/" class="flex items-center gap-2.5 group" aria-label="Kaibot home">
          <KaibotLogo :size="40" rounded="rounded-2xl" class="shadow-glass ring-1 ring-white/60 bg-white transition-transform group-hover:scale-105" />
          <span class="text-lg font-semibold tracking-tight">Kaibot</span>
        </NuxtLink>
        <nav class="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="#features" class="transition hover:text-slate-900">{{ $t('landing.navFeatures') }}</a>
          <a href="#how" class="transition hover:text-slate-900">{{ $t('landing.navHow') }}</a>
          <a href="#cta" class="transition hover:text-slate-900">{{ $t('landing.navGetStarted') }}</a>
        </nav>
        <div class="flex items-center gap-3">
          <NuxtLink
            v-if="!isAuthenticated"
            to="/register"
            class="hidden text-sm font-medium text-slate-700 transition hover:text-slate-900 sm:inline"
          >
            {{ $t('landing.createAccount') }}
          </NuxtLink>
          <NuxtLink
            :to="primaryCtaTarget"
            class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 hover:scale-[1.03] active:scale-95"
          >
            {{ primaryCtaLabel }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="relative isolate overflow-hidden pt-40 pb-24 sm:pt-48 sm:pb-32">
      <!-- Fondo 3D de partículas (Three.js, client-only) -->
      <LandingHeroCanvas class="-z-10" />

      <!-- Parallax blobs -->
      <div
        class="pointer-events-none absolute -left-32 -top-20 h-[28rem] w-[28rem] rounded-full bg-primary-300/40 blur-3xl"
        :style="parallax(0.35)"
      />
      <div
        class="pointer-events-none absolute -right-24 top-40 h-[22rem] w-[22rem] rounded-full bg-success-200/50 blur-3xl"
        :style="parallax(-0.25)"
      />

      <div
        class="relative mx-auto max-w-5xl px-6 text-center transition-opacity duration-1000"
        :style="heroVisible
          ? { opacity: heroOpacity, transform: heroLift }
          : { opacity: 0, transform: 'translate3d(0, 24px, 0)' }"
      >
        <div class="light-sweep mb-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-white/60 backdrop-blur-xl">
          <span class="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
          {{ $t('landing.hero.badge') }}
        </div>

        <h1
          :aria-label="heroTitleText"
          class="word-reveal text-5xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl md:text-7xl"
        >
          <span aria-hidden="true">
            <template v-for="(word, i) in heroWords.t1" :key="`t1-${i}-${word}`">
              <span :style="{ '--i': i }">{{ word }}</span>{{ ' ' }}
            </template>
            <span
              :style="{ '--i': heroWords.t1.length }"
              class="anim-gradient-text bg-gradient-to-r from-primary-600 via-success-500 to-primary-600 text-transparent"
            >{{ heroWords.kaibot }}</span>
            <template v-for="(word, i) in heroWords.rest" :key="`t2-${i}-${word}`">
              {{ ' ' }}<span :style="{ '--i': heroWords.t1.length + 1 + i }">{{ word }}</span>
            </template>
          </span>
        </h1>

        <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
          {{ $t('landing.hero.subtitle') }}
        </p>

        <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <NuxtLink
            :to="primaryCtaTarget"
            class="group inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-base font-semibold text-white shadow-glass transition hover:bg-slate-800 hover:scale-[1.03] active:scale-95"
          >
            {{ isAuthenticated ? $t('landing.goToDashboard') : $t('landing.hero.ctaSignIn') }}
            <svg class="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </NuxtLink>
          <NuxtLink
            v-if="!isAuthenticated"
            to="/register"
            class="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-6 py-3.5 text-base font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur-xl transition hover:bg-white/90 hover:scale-[1.03] active:scale-95"
          >
            {{ $t('landing.hero.ctaCreateFree') }}
          </NuxtLink>
        </div>
      </div>

      <!-- Chat preview animado — fuera del wrapper que se desvanece con el
           scroll: es el showcase del producto y debe seguir visible. La
           conversación corre en loop (ver CHAT_STEPS); min-h evita saltos de
           layout mientras aparecen burbujas. -->
      <div class="relative mx-auto mt-12 max-w-xl px-6 sm:mt-20">
        <div class="float-y rounded-3xl bg-white/80 p-6 ring-1 ring-white/60 shadow-glass-lg backdrop-blur-xl">
          <div class="flex items-center gap-3 border-b border-slate-200/60 pb-4">
            <KaibotLogo :size="44" rounded="rounded-full" class="ring-2 ring-white shadow-glass bg-white" alt="Kaibot avatar" />
            <div class="text-left">
              <p class="text-sm font-semibold text-slate-900">{{ $t('landing.hero.chatPreviewTitle') }}</p>
              <p class="flex items-center gap-1.5 text-xs text-success-600">
                <span class="size-1.5 rounded-full bg-success-500 animate-pulse" />
                {{ $t('landing.hero.chatPreviewOnline') }}
              </p>
            </div>
          </div>
          <div class="mt-5 min-h-[17rem] space-y-3 text-left sm:min-h-[15rem]">
            <div v-if="chatStage >= 1" class="chat-pop ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-success-500 px-4 py-2.5 text-sm text-white">
              {{ $t('landing.hero.chatPreviewUser1') }}
            </div>
            <div v-if="chatStage >= 3" class="chat-pop flex items-end gap-2 max-w-[85%]">
              <KaibotLogo :size="24" rounded="rounded-full" class="shrink-0 ring-1 ring-white shadow-sm bg-white" alt="Kaibot" />
              <div class="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-800">
                {{ $t('landing.hero.chatPreviewBot1') }}
              </div>
            </div>
            <div v-if="chatStage >= 4" class="chat-pop ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-success-500 px-4 py-2.5 text-sm text-white">
              {{ $t('landing.hero.chatPreviewUser2') }}
            </div>
            <div v-if="chatStage >= 6" class="chat-pop flex items-end gap-2 max-w-[85%]">
              <KaibotLogo :size="24" rounded="rounded-full" class="shrink-0 ring-1 ring-white shadow-sm bg-white" alt="Kaibot" />
              <div class="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-800">
                {{ $t('landing.hero.chatPreviewBot2') }}
              </div>
            </div>
            <div v-if="chatTyping" class="flex items-center gap-1.5 px-1 pt-1 text-xs text-slate-400">
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              <span class="ml-2">{{ $t('landing.hero.chatPreviewTyping') }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Marquee de capacidades -->
    <div class="marquee relative overflow-hidden border-y border-white/50 bg-white/50 py-4 backdrop-blur-xl">
      <div class="marquee-track">
        <ul
          v-for="copy in 2"
          :key="copy"
          class="flex items-center gap-10 pr-10"
          :aria-hidden="copy === 2 || undefined"
        >
          <li
            v-for="k in 8"
            :key="k"
            class="flex items-center gap-2.5 whitespace-nowrap text-sm font-medium text-slate-600"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="k % 2 === 0 ? 'bg-primary-500' : 'bg-success-500'" />
            {{ $t(`landing.marquee.i${k}`) }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Problema → solución: bandeja con mensajes pendientes que Kaibot
         resuelve en cascada (LandingInboxDemo corre su propio loop). -->
    <section class="relative py-20 sm:py-28">
      <div
        class="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"
        :style="parallax(0.18)"
      />
      <div
        class="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-success-200/40 blur-3xl"
        :style="parallax(-0.14)"
      />

      <div class="relative mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        <div v-reveal.left class="text-center lg:text-left">
          <p class="text-sm font-semibold uppercase tracking-wider text-danger-600">{{ $t('landing.inbox.kicker') }}</p>
          <h2 class="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {{ $t('landing.inbox.title') }}
          </h2>
          <p class="mt-4 text-lg text-slate-600">
            {{ $t('landing.inbox.body') }}
          </p>
          <ul class="mt-8 space-y-3 text-left">
            <li v-for="k in 3" :key="k" class="flex items-start gap-3">
              <span class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
                <svg class="size-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span class="text-slate-700">{{ $t(`landing.inbox.point${k}`) }}</span>
            </li>
          </ul>
        </div>

        <div v-reveal.right="120" class="mx-auto w-full max-w-md lg:max-w-none">
          <LandingInboxDemo />
        </div>
      </div>
    </section>

    <!-- Stats con contadores -->
    <section ref="statsEl" class="relative py-16 sm:py-20">
      <div class="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-6 sm:grid-cols-3">
        <div v-reveal="0" class="rounded-3xl bg-white/70 px-6 py-8 text-center ring-1 ring-white/60 shadow-glass backdrop-blur-xl">
          <p class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {{ statValues[0] }}<span class="text-primary-600">/7</span>
          </p>
          <p class="mt-2 text-sm font-medium text-slate-600">{{ $t('landing.stats.availability') }}</p>
        </div>
        <div v-reveal="120" class="rounded-3xl bg-white/70 px-6 py-8 text-center ring-1 ring-white/60 shadow-glass backdrop-blur-xl">
          <p class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {{ statValues[1] }}<span class="text-success-600">%</span>
          </p>
          <p class="mt-2 text-sm font-medium text-slate-600">{{ $t('landing.stats.native') }}</p>
        </div>
        <div v-reveal="240" class="rounded-3xl bg-white/70 px-6 py-8 text-center ring-1 ring-white/60 shadow-glass backdrop-blur-xl">
          <p class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {{ statValues[2] }}
          </p>
          <p class="mt-2 text-sm font-medium text-slate-600">{{ $t('landing.stats.steps') }}</p>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="relative py-24 sm:py-32">
      <div
        class="pointer-events-none absolute left-0 top-1/4 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl"
        :style="parallax(0.15)"
      />
      <div
        class="pointer-events-none absolute right-0 bottom-1/4 h-80 w-80 rounded-full bg-success-200/40 blur-3xl"
        :style="parallax(-0.1)"
      />

      <div class="relative mx-auto max-w-7xl px-6">
        <div v-reveal class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-semibold uppercase tracking-wider text-primary-600">{{ $t('landing.features.kicker') }}</p>
          <h2 class="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {{ $t('landing.features.title') }}
          </h2>
          <p class="mt-4 text-lg text-slate-600">
            {{ $t('landing.features.subtitle') }}
          </p>
        </div>

        <div class="mt-16 grid gap-6 md:grid-cols-3">
          <div v-reveal="0">
            <article v-tilt class="tilt-card group relative h-full overflow-hidden rounded-3xl bg-white/70 p-8 ring-1 ring-white/60 shadow-glass backdrop-blur-xl transition-shadow duration-300 hover:shadow-glass-lg">
              <span class="tilt-glow" />
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 transition-transform duration-300 group-hover:scale-110">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-slate-900">{{ $t('landing.features.alwaysOnTitle') }}</h3>
              <p class="mt-2 text-slate-600">
                {{ $t('landing.features.alwaysOnBody') }}
              </p>
            </article>
          </div>

          <div v-reveal="120">
            <article v-tilt class="tilt-card group relative h-full overflow-hidden rounded-3xl bg-white/70 p-8 ring-1 ring-white/60 shadow-glass backdrop-blur-xl transition-shadow duration-300 hover:shadow-glass-lg">
              <span class="tilt-glow" />
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-success-100 text-success-700 transition-transform duration-300 group-hover:scale-110">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-slate-900">{{ $t('landing.features.nativeTitle') }}</h3>
              <p class="mt-2 text-slate-600">
                {{ $t('landing.features.nativeBody') }}
              </p>
            </article>
          </div>

          <div v-reveal="240">
            <article v-tilt class="tilt-card group relative h-full overflow-hidden rounded-3xl bg-white/70 p-8 ring-1 ring-white/60 shadow-glass backdrop-blur-xl transition-shadow duration-300 hover:shadow-glass-lg">
              <span class="tilt-glow" />
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 transition-transform duration-300 group-hover:scale-110">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-slate-900">{{ $t('landing.features.trainedTitle') }}</h3>
              <p class="mt-2 text-slate-600">
                {{ $t('landing.features.trainedBody') }}
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="how" class="relative py-24 sm:py-32">
      <div
        class="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-success-300/30 blur-3xl"
        :style="parallax(0.2)"
      />
      <div
        class="pointer-events-none absolute right-10 bottom-10 h-72 w-72 rounded-full bg-primary-300/30 blur-3xl"
        :style="parallax(-0.18)"
      />

      <div class="relative mx-auto max-w-7xl px-6">
        <div v-reveal class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-semibold uppercase tracking-wider text-success-600">{{ $t('landing.how.kicker') }}</p>
          <h2 class="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {{ $t('landing.how.title') }}
          </h2>
        </div>

        <ol class="mt-16 grid gap-6 md:grid-cols-3">
          <li v-reveal.left="0" class="rounded-3xl bg-white/70 p-8 ring-1 ring-white/60 shadow-glass backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-glass-lg">
            <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">1</div>
            <h3 class="text-lg font-semibold text-slate-900">{{ $t('landing.how.step1Title') }}</h3>
            <p class="mt-2 text-slate-600">
              {{ $t('landing.how.step1Body') }}
            </p>
          </li>
          <li v-reveal="140" class="rounded-3xl bg-white/70 p-8 ring-1 ring-white/60 shadow-glass backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-glass-lg">
            <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">2</div>
            <h3 class="text-lg font-semibold text-slate-900">{{ $t('landing.how.step2Title') }}</h3>
            <p class="mt-2 text-slate-600">
              {{ $t('landing.how.step2Body') }}
            </p>
          </li>
          <li v-reveal.right="280" class="rounded-3xl bg-white/70 p-8 ring-1 ring-white/60 shadow-glass backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-glass-lg">
            <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">3</div>
            <h3 class="text-lg font-semibold text-slate-900">{{ $t('landing.how.step3Title') }}</h3>
            <p class="mt-2 text-slate-600">
              {{ $t('landing.how.step3Body') }}
            </p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Final CTA -->
    <section id="cta" class="relative py-24 sm:py-32">
      <div class="mx-auto max-w-5xl px-6">
        <div v-reveal.scale class="anim-gradient-flow relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary-600 via-primary-700 to-slate-900 px-8 py-16 text-center shadow-glass-lg sm:px-16 sm:py-20">
          <div class="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary-400/40 blur-3xl" />
          <div class="pointer-events-none absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-success-500/30 blur-3xl" />

          <h2 class="relative text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {{ $t('landing.cta.title') }}
          </h2>
          <p class="relative mx-auto mt-4 max-w-xl text-lg text-primary-100">
            {{ $t('landing.cta.subtitle') }}
          </p>

          <div class="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <NuxtLink
              :to="primaryCtaTarget"
              class="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-semibold text-slate-900 transition hover:bg-slate-100 hover:scale-[1.03] active:scale-95"
            >
              {{ isAuthenticated ? $t('landing.cta.primaryAuth') : $t('landing.cta.primary') }}
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </NuxtLink>
            <NuxtLink
              v-if="!isAuthenticated"
              to="/register"
              class="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3.5 text-base font-semibold text-white ring-1 ring-white/30 backdrop-blur-xl transition hover:bg-white/20 hover:scale-[1.03] active:scale-95"
            >
              {{ $t('landing.cta.secondary') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Floating WhatsApp CTA — fixed at bottom-right, persists while scrolling. -->
    <a
      href="https://wa.me/593979798458?text=Hola,%20me%20interesa%20conocer%20más%20sobre%20KaiBot"
      target="_blank"
      rel="noreferrer noopener"
      :aria-label="$t('landing.whatsappFloat.ariaLabel')"
      class="glow-pulse group fixed bottom-5 right-5 z-50 inline-flex items-center gap-2.5 rounded-full bg-success-500 px-4 py-3 text-sm font-semibold text-white shadow-glass-lg ring-1 ring-white/30 backdrop-blur transition hover:bg-success-600 hover:scale-105 sm:bottom-6 sm:right-6"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5 shrink-0" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      <span class="hidden sm:inline">{{ $t('landing.whatsappFloat.label') }}</span>
    </a>

    <!-- Footer -->
    <footer class="relative border-t border-white/40 bg-white/50 backdrop-blur-xl">
      <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
        <div class="flex items-center gap-2 text-sm text-slate-600">
          <KaibotLogo :size="28" rounded="rounded-lg" class="bg-white ring-1 ring-white/60 shadow-sm" />
          <span class="font-semibold text-slate-900">Kaibot</span>
          <span class="text-slate-400">·</span>
          <span>{{ $t('landing.footer.tagline') }}</span>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
          <NuxtLink to="/login" class="transition hover:text-slate-900">{{ $t('landing.footer.signIn') }}</NuxtLink>
          <NuxtLink to="/register" class="transition hover:text-slate-900">{{ $t('landing.footer.createAccount') }}</NuxtLink>
          <NuxtLink to="/privacy" class="transition hover:text-slate-900">{{ $t('legal.privacy.title') }}</NuxtLink>
          <NuxtLink to="/terms" class="transition hover:text-slate-900">{{ $t('legal.terms.title') }}</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
