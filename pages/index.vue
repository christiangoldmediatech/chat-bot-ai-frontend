<script setup lang="ts">
definePageMeta({ layout: false })

// Google Analytics (gtag.js) — solo en la landing. Nuxt inyecta estos tags
// vía useHead y los retira al navegar a otra ruta (la app es SPA con
// ssr:false).
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

const auth = useAuthStore()
const { t } = useI18n()
const isAuthenticated = computed(() => auth.isAuthenticated)
const primaryCtaTarget = computed(() => (isAuthenticated.value ? '/admin' : '/login'))

// ---- Nav sticky (background al scrollear más de 24px) ----
// La directiva `v-reveal` global (plugins/reveal.client.ts) se encarga de
// agregar `reveal-in` a los elementos con class `.alia-rv` cuando entran
// en el viewport — el CSS de la clase reacciona a ese estado.
const stuck = ref(false)
const onScroll = () => { stuck.value = window.scrollY > 24 }

// ---- Contadores (números del ticker + resultados) ----
function runCount(el: HTMLElement) {
  const target = parseFloat(el.dataset.count ?? '0')
  const dec = parseInt(el.dataset.dec ?? '0', 10)
  const pre = el.dataset.prefix ?? ''
  const suf = el.dataset.suffix ?? ''
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    el.textContent = pre + target.toFixed(dec) + suf
    return
  }
  const start = performance.now()
  const dur = 1400
  const step = (now: number) => {
    const k = Math.min((now - start) / dur, 1)
    const e = 1 - (1 - k) ** 3
    el.textContent = pre + (target * e).toFixed(dec) + suf
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// Ticker del hero arranca a los ~2.9s (después de las animaciones de entrada).
// Los contadores de la sección de resultados se activan al entrar al viewport
// vía un IntersectionObserver dedicado.
let countObserver: IntersectionObserver | null = null

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Hero ticker — dispara con delay para no chocar con las líneas del headline.
  setTimeout(() => {
    document.querySelectorAll<HTMLElement>('.js-ticker [data-count]').forEach(runCount)
  }, reduce ? 0 : 2900)

  // Contadores fuera del hero (resultados) — se disparan al entrar al viewport.
  countObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        runCount(entry.target as HTMLElement)
        countObserver?.unobserve(entry.target)
      }
    }
  }, { threshold: 0.4 })
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    // Los del hero ticker no entran aquí — ya los cubrió el timeout de arriba.
    if (!el.closest('.js-ticker')) countObserver?.observe(el)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  countObserver?.disconnect()
})

// ---- Integrations belt ----
// Se duplica el array para hacer un loop sin costura.
const integrations = [
  'WhatsApp Business API',
  'Instagram Direct',
  'Messenger',
  t('landing.belt.webChat'),
  t('landing.belt.sip'),
  'Google Calendar',
  'Outlook',
  'HubSpot',
  'Salesforce',
  'Shopify',
  'WooCommerce',
  'Odoo',
  'Zapier',
  'Make',
  'Google Sheets',
  'Gmail',
]

// Puntero sobre tarjetas de capacidades — actualiza CSS vars para el
// radial-gradient de hover (definido en <style scoped>).
function onCapPointer(ev: PointerEvent) {
  const card = (ev.target as HTMLElement).closest('.js-cap') as HTMLElement | null
  if (!card) return
  const r = card.getBoundingClientRect()
  card.style.setProperty('--mx', `${ev.clientX - r.left}px`)
  card.style.setProperty('--my', `${ev.clientY - r.top}px`)
}

// Scroll suave para los anchors internos.
function smoothScroll(ev: MouseEvent, href: string) {
  const el = document.querySelector(href)
  if (!el) return
  ev.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <!-- Background live: wave-strands canvas + grain overlay + ground base. -->
  <LandingHeroCanvas />
  <div class="alia-grain" aria-hidden="true" />
  <div class="fixed inset-0 z-0 pointer-events-none bg-ground" aria-hidden="true" />

  <div class="relative z-[3] min-h-screen overflow-x-hidden bg-transparent font-sans text-pearl">
    <!-- ══════════ NAV ══════════ -->
    <header
      id="nav"
      class="sticky top-0 z-40 flex items-center gap-6 border-b px-[clamp(20px,4vw,44px)] py-4 transition-all duration-400"
      :class="stuck
        ? 'bg-ink-deep/70 backdrop-blur-md backdrop-saturate-150 border-line-soft'
        : 'border-transparent'"
    >
      <NuxtLink to="/" class="flex items-center gap-3" aria-label="ALIA, inicio">
        <AliaLogo variant="wordmark" :size="19" tone="pearl" alt="ALIA" />
      </NuxtLink>
      <nav class="ml-auto hidden gap-7 md:flex" :aria-label="$t('landing.nav.aria')">
        <a href="#demo" class="alia-nav-link font-mono text-[0.74rem] uppercase tracking-[0.13em] text-mist transition-colors hover:text-pearl" @click="smoothScroll($event, '#demo')">{{ $t('landing.nav.demo') }}</a>
        <a href="#capacidades" class="alia-nav-link font-mono text-[0.74rem] uppercase tracking-[0.13em] text-mist transition-colors hover:text-pearl" @click="smoothScroll($event, '#capacidades')">{{ $t('landing.nav.caps') }}</a>
        <a href="#proceso" class="alia-nav-link font-mono text-[0.74rem] uppercase tracking-[0.13em] text-mist transition-colors hover:text-pearl" @click="smoothScroll($event, '#proceso')">{{ $t('landing.nav.process') }}</a>
        <a href="#planes" class="alia-nav-link font-mono text-[0.74rem] uppercase tracking-[0.13em] text-mist transition-colors hover:text-pearl" @click="smoothScroll($event, '#planes')">{{ $t('landing.nav.plans') }}</a>
      </nav>
      <NuxtLink
        :to="isAuthenticated ? '/admin' : primaryCtaTarget"
        class="ml-auto inline-flex items-center gap-2 rounded-full border border-transparent bg-brand-gradient px-4 py-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-tealDeep shadow-halo-glow transition-transform hover:-translate-y-0.5 md:ml-0"
      >
        {{ isAuthenticated ? $t('landing.goToDashboard') : $t('landing.nav.book') }}
      </NuxtLink>
    </header>

    <main id="top">
      <!-- ══════════ HERO ══════════ -->
      <section class="relative pb-[clamp(56px,9vh,110px)] pt-[clamp(48px,9vh,108px)] text-center">
        <!-- Halo respirando detrás del wordmark. -->
        <div
          class="pointer-events-none absolute left-1/2 top-[16%] aspect-square w-[min(820px,96vw)] -translate-x-1/2 -translate-y-[18%] animate-breathe bg-halo-radial"
          aria-hidden="true"
        />

        <div class="mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
          <!-- Wordmark instantáneamente visible: variant="wordmark" (sin
               stroke-draw) para que el nombre de la plataforma aparezca ya
               renderizado en el primer paint, no dibujándose durante 1.5s.
               La drop-shadow halo de `.alia-mark` se aplica manualmente. -->
          <AliaLogo
            variant="wordmark"
            :size="'clamp(64px, 12vw, 130px)'"
            tone="pearl"
            alt="ALIA"
            class="alia-mark mx-auto mb-[clamp(16px,3vw,26px)] block w-[min(560px,84vw)] overflow-visible"
          />

          <p class="alia-fade-up font-mono text-[clamp(0.66rem,1.5vw,0.82rem)] uppercase tracking-[0.52em] text-mist" style="animation-delay: 1.55s;">
            {{ $t('landing.hero.tagline') }}
          </p>

          <h1 class="mx-auto mt-[clamp(34px,6vh,62px)] max-w-[20ch] font-display text-[clamp(2.9rem,8.2vw,6.4rem)] leading-[0.98] tracking-[-0.028em] text-pearl" style="font-variation-settings: 'wdth' 96, 'wght' 420;">
            <span class="alia-ln"><span style="animation-delay: 1.75s;">{{ $t('landing.hero.line1') }}</span></span>
            <span class="alia-ln"><span style="animation-delay: 1.88s;">{{ $t('landing.hero.line2') }}</span></span>
            <span class="alia-ln"><span style="animation-delay: 2.01s;"><em class="not-italic font-medium text-halo" style="font-variation-settings: 'wdth' 96, 'wght' 620;">{{ $t('landing.hero.line3') }}</em></span></span>
          </h1>

          <p class="alia-fade-up mx-auto mt-6.5 max-w-[54ch] text-[clamp(1.05rem,1.7vw,1.3rem)] text-mist" style="animation-delay: 2.35s;">
            {{ $t('landing.hero.copy') }}
          </p>

          <div class="alia-fade-up mt-8.5 flex flex-wrap justify-center gap-3.5" style="animation-delay: 2.55s;">
            <a
              href="#demo"
              class="inline-flex items-center gap-2 rounded-full border border-transparent bg-brand-gradient px-6 py-3.5 font-mono text-[0.78rem] font-medium uppercase tracking-[0.12em] text-ink-tealDeep shadow-halo-glow transition-transform hover:-translate-y-0.5"
              @click="smoothScroll($event, '#demo')"
            >
              <span class="inline-block size-1.5 rounded-full bg-halo animate-ping" aria-hidden="true" />
              {{ $t('landing.hero.ctaPrimary') }}
            </a>
            <a
              href="#proceso"
              class="inline-flex items-center gap-2 rounded-full border border-halo-line bg-ink-card/55 px-6 py-3.5 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-pearl backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-halo hover:bg-ink-tealMid/55"
              @click="smoothScroll($event, '#proceso')"
            >
              {{ $t('landing.hero.ctaSecondary') }}
            </a>
          </div>

          <!-- Ticker de 4 métricas -->
          <div class="alia-fade-up js-ticker mt-[clamp(48px,8vh,88px)] grid grid-cols-2 border-y border-line-soft sm:grid-cols-4" style="animation-delay: 2.8s;">
            <div class="border-l-0 border-line-soft p-6 text-left sm:border-l">
              <div class="font-display tabular-nums text-[clamp(1.5rem,3vw,2.15rem)] leading-none tracking-[-0.02em] text-pearl" data-count="2.4" data-dec="1" data-suffix=" s">0 s</div>
              <span class="mt-2 block font-mono text-[0.705rem] uppercase tracking-[0.16em] text-mist-dim">{{ $t('landing.hero.ticker.avgReply') }}</span>
            </div>
            <div class="border-l border-line-soft p-6 text-left">
              <div class="font-display tabular-nums text-[clamp(1.5rem,3vw,2.15rem)] leading-none tracking-[-0.02em] text-pearl">24 / 7</div>
              <span class="mt-2 block font-mono text-[0.705rem] uppercase tracking-[0.16em] text-mist-dim">{{ $t('landing.hero.ticker.always') }}</span>
            </div>
            <div class="border-l-0 border-t border-line-soft p-6 text-left sm:border-l sm:border-t-0">
              <div class="font-display tabular-nums text-[clamp(1.5rem,3vw,2.15rem)] leading-none tracking-[-0.02em] text-pearl" data-count="72" data-suffix=" %">0 %</div>
              <span class="mt-2 block font-mono text-[0.705rem] uppercase tracking-[0.16em] text-mist-dim">{{ $t('landing.hero.ticker.noHuman') }}</span>
            </div>
            <div class="border-l border-t border-line-soft p-6 text-left sm:border-t-0">
              <div class="font-display tabular-nums text-[clamp(1.5rem,3vw,2.15rem)] leading-none tracking-[-0.02em] text-pearl" data-count="5" data-suffix="">0</div>
              <span class="mt-2 block font-mono text-[0.705rem] uppercase tracking-[0.16em] text-mist-dim">{{ $t('landing.hero.ticker.channels') }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════ DEMO ══════════ -->
      <section id="demo" class="relative py-[clamp(80px,11vh,148px)]">
        <div class="mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
          <div v-reveal class="alia-rv mb-[clamp(38px,6vw,62px)] grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <div>
              <p class="flex items-center gap-3 font-mono text-[0.705rem] uppercase tracking-[0.22em] text-halo-dim">
                <span class="h-px w-6 bg-halo-dim" />
                {{ $t('landing.demo.eyebrow') }}
              </p>
              <h2 class="mt-4 font-display text-[clamp(1.9rem,4.2vw,3.1rem)] leading-tight tracking-[-0.012em]" style="font-variation-settings: 'wdth' 112, 'wght' 500;">
                {{ $t('landing.demo.titleA') }}<br>{{ $t('landing.demo.titleB') }}
              </h2>
            </div>
            <p class="max-w-[62ch] text-mist">
              {{ $t('landing.demo.copy') }}
            </p>
          </div>

          <div v-reveal="140" class="alia-rv">
            <PhoneDemo />
          </div>
        </div>
      </section>

      <!-- ══════════ CAPACIDADES ══════════ -->
      <section id="capacidades" class="relative py-[clamp(80px,11vh,148px)]">
        <div class="mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
          <div v-reveal class="alia-rv mb-[clamp(38px,6vw,62px)] grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <div>
              <p class="flex items-center gap-3 font-mono text-[0.705rem] uppercase tracking-[0.22em] text-halo-dim">
                <span class="h-px w-6 bg-halo-dim" />
                {{ $t('landing.caps.eyebrow') }}
              </p>
              <h2 class="mt-4 font-display text-[clamp(1.9rem,4.2vw,3.1rem)] leading-tight tracking-[-0.012em]" style="font-variation-settings: 'wdth' 112, 'wght' 500;">
                {{ $t('landing.caps.titleA') }}<br>{{ $t('landing.caps.titleB') }}
              </h2>
            </div>
            <p class="max-w-[62ch] text-mist">
              {{ $t('landing.caps.copy') }}
            </p>
          </div>

          <div
            v-reveal="140"
            class="alia-rv grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line-soft bg-line-soft sm:grid-cols-2 lg:grid-cols-3"
            @pointermove="onCapPointer"
          >
            <article
              v-for="i in 6"
              :key="i"
              class="js-cap relative isolate overflow-hidden bg-ink p-6 sm:p-8"
            >
              <span class="cap-glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
              <svg class="mb-5 size-8 text-halo transition-transform duration-500 group-hover:-translate-y-0.5" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                <template v-if="i === 1">
                  <path d="M4 8h24v14H14l-7 6v-6H4z" /><path d="M10 13h12M10 17h8" />
                </template>
                <template v-else-if="i === 2">
                  <rect x="4" y="7" width="24" height="21" rx="3" /><path d="M4 13h24M10 4v6M22 4v6" /><path d="M12 19l3 3 6-6" />
                </template>
                <template v-else-if="i === 3">
                  <path d="M7 4h13l5 5v19H7z" /><path d="M20 4v5h5" /><path d="M12 16h8M12 21h6" />
                </template>
                <template v-else-if="i === 4">
                  <circle cx="11" cy="11" r="5" /><path d="M3 27c0-4.4 3.6-8 8-8s8 3.6 8 8" /><path d="M22 12h7M25.5 8.5L29 12l-3.5 3.5" />
                </template>
                <template v-else-if="i === 5">
                  <rect x="12" y="3" width="8" height="15" rx="4" /><path d="M7 15a9 9 0 0018 0M16 24v5M11 29h10" />
                </template>
                <template v-else>
                  <path d="M4 26h24" /><rect x="7" y="16" width="4" height="10" /><rect x="14" y="10" width="4" height="16" /><rect x="21" y="5" width="4" height="21" />
                </template>
              </svg>
              <h3 class="font-display text-[clamp(1.05rem,1.5vw,1.2rem)] leading-tight" style="font-variation-settings: 'wdth' 105, 'wght' 550;">{{ $t(`landing.caps.items.${i}.title`) }}</h3>
              <p class="mt-2.5 text-sm text-mist">{{ $t(`landing.caps.items.${i}.body`) }}</p>
            </article>
          </div>
        </div>
      </section>

      <!-- ══════════ PROCESO ══════════ -->
      <section id="proceso" class="relative py-[clamp(80px,11vh,148px)]">
        <div class="mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
          <div v-reveal class="alia-rv mb-[clamp(38px,6vw,62px)] grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <div>
              <p class="flex items-center gap-3 font-mono text-[0.705rem] uppercase tracking-[0.22em] text-halo-dim">
                <span class="h-px w-6 bg-halo-dim" />
                {{ $t('landing.process.eyebrow') }}
              </p>
              <h2 class="mt-4 font-display text-[clamp(1.9rem,4.2vw,3.1rem)] leading-tight tracking-[-0.012em]" style="font-variation-settings: 'wdth' 112, 'wght' 500;">
                {{ $t('landing.process.titleA') }}<br>{{ $t('landing.process.titleB') }}
              </h2>
            </div>
            <p class="max-w-[62ch] text-mist">
              {{ $t('landing.process.copy') }}
            </p>
          </div>

          <div v-reveal="140" class="alia-rv">
            <div
              v-for="i in 3"
              :key="i"
              class="grid grid-cols-[92px_minmax(0,1fr)] gap-[clamp(18px,3vw,44px)] border-t border-line-soft py-[clamp(28px,4vw,42px)] transition-colors duration-500 hover:bg-[linear-gradient(90deg,rgba(88,240,206,0.10),transparent_60%)] md:grid-cols-[118px_minmax(0,0.85fr)_minmax(0,1.2fr)]"
              :class="i === 3 ? 'border-b' : ''"
            >
              <div class="pt-1 font-mono text-[0.78rem] uppercase tracking-[0.18em] text-halo-dim whitespace-nowrap">
                0{{ i }} · {{ $t(`landing.process.items.${i}.week`) }}
              </div>
              <div>
                <h3 class="font-display text-[clamp(1.05rem,1.5vw,1.2rem)] leading-tight" style="font-variation-settings: 'wdth' 105, 'wght' 550;">{{ $t(`landing.process.items.${i}.title`) }}</h3>
              </div>
              <div class="col-start-2 md:col-start-3">
                <p class="text-mist">{{ $t(`landing.process.items.${i}.body`) }}</p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span
                    v-for="tag in ($t(`landing.process.items.${i}.tags`) as unknown as string).split('|')"
                    :key="tag"
                    class="rounded-full border border-line px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.12em] text-mist"
                  >{{ tag }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ══════════ INTEGRACIONES (belt) ══════════ -->
      <section class="py-[clamp(20px,4vh,48px)]">
        <div class="mx-auto mb-5 w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
          <p v-reveal class="alia-rv flex items-center gap-3 font-mono text-[0.705rem] uppercase tracking-[0.22em] text-halo-dim">
            <span class="h-px w-6 bg-halo-dim" />
            {{ $t('landing.belt.eyebrow') }}
          </p>
        </div>
        <div class="alia-belt-mask relative overflow-hidden border-y border-line-soft py-6.5">
          <div class="flex w-max animate-slide hover:[animation-play-state:paused]">
            <span
              v-for="(name, i) in [...integrations, ...integrations]"
              :key="`b-${i}`"
              class="flex items-center gap-3 whitespace-nowrap px-7.5 font-display text-[1.02rem] tracking-[0.02em] text-mist"
              style="font-variation-settings: 'wdth' 104, 'wght' 420;"
            >
              <span class="size-1.5 shrink-0 rounded-full bg-halo-dim" aria-hidden="true" />
              {{ name }}
            </span>
          </div>
        </div>
      </section>

      <!-- ══════════ RESULTADOS ══════════ -->
      <section class="relative py-[clamp(80px,11vh,148px)]">
        <div class="mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
          <div v-reveal class="alia-rv mb-[clamp(38px,6vw,62px)] grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <div>
              <p class="flex items-center gap-3 font-mono text-[0.705rem] uppercase tracking-[0.22em] text-halo-dim">
                <span class="h-px w-6 bg-halo-dim" />
                {{ $t('landing.results.eyebrow') }}
              </p>
              <h2 class="mt-4 font-display text-[clamp(1.9rem,4.2vw,3.1rem)] leading-tight tracking-[-0.012em]" style="font-variation-settings: 'wdth' 112, 'wght' 500;">
                {{ $t('landing.results.titleA') }}<br>{{ $t('landing.results.titleB') }}
              </h2>
            </div>
            <p class="max-w-[62ch] text-mist">
              {{ $t('landing.results.copy') }}
            </p>
          </div>

          <div v-reveal="140" class="alia-rv grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line-soft bg-line-soft md:grid-cols-3">
            <div class="bg-gradient-to-b from-ink-surface to-ink p-8 sm:p-10">
              <div class="font-display tabular-nums text-[clamp(2.8rem,6vw,4.4rem)] leading-none tracking-[-0.03em] text-halo" style="font-variation-settings: 'wdth' 88, 'wght' 300;" data-count="72" data-suffix="%">0%</div>
              <p class="mt-3.5 text-sm text-pearl">{{ $t('landing.results.items.1.title') }}</p>
              <p class="mt-1.5 text-[0.8rem] text-mist-dim">{{ $t('landing.results.items.1.desc') }}</p>
            </div>
            <div class="bg-gradient-to-b from-ink-surface to-ink p-8 sm:p-10">
              <div class="font-display tabular-nums text-[clamp(2.8rem,6vw,4.4rem)] leading-none tracking-[-0.03em] text-halo" style="font-variation-settings: 'wdth' 88, 'wght' 300;" data-count="2.4" data-dec="1" data-suffix=" s">0 s</div>
              <p class="mt-3.5 text-sm text-pearl">{{ $t('landing.results.items.2.title') }}</p>
              <p class="mt-1.5 text-[0.8rem] text-mist-dim">{{ $t('landing.results.items.2.desc') }}</p>
            </div>
            <div class="bg-gradient-to-b from-ink-surface to-ink p-8 sm:p-10">
              <div class="font-display tabular-nums text-[clamp(2.8rem,6vw,4.4rem)] leading-none tracking-[-0.03em] text-halo" style="font-variation-settings: 'wdth' 88, 'wght' 300;" data-count="31" data-prefix="+" data-suffix="%">0%</div>
              <p class="mt-3.5 text-sm text-pearl">{{ $t('landing.results.items.3.title') }}</p>
              <p class="mt-1.5 text-[0.8rem] text-mist-dim">{{ $t('landing.results.items.3.desc') }}</p>
            </div>
          </div>
          <p class="mt-4 text-[0.8rem] text-mist-dim">{{ $t('landing.results.footnote') }}</p>
        </div>
      </section>

      <!-- ══════════ PLANES ══════════ -->
      <section id="planes" class="relative py-[clamp(80px,11vh,148px)]">
        <div class="mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
          <div v-reveal class="alia-rv mb-[clamp(38px,6vw,62px)] grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <div>
              <p class="flex items-center gap-3 font-mono text-[0.705rem] uppercase tracking-[0.22em] text-halo-dim">
                <span class="h-px w-6 bg-halo-dim" />
                {{ $t('landing.plans.eyebrow') }}
              </p>
              <h2 class="mt-4 font-display text-[clamp(1.9rem,4.2vw,3.1rem)] leading-tight tracking-[-0.012em]" style="font-variation-settings: 'wdth' 112, 'wght' 500;">
                {{ $t('landing.plans.titleA') }}<br>{{ $t('landing.plans.titleB') }}
              </h2>
            </div>
            <p class="max-w-[62ch] text-mist">
              {{ $t('landing.plans.copy') }}
            </p>
          </div>

          <div v-reveal="140" class="alia-rv grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            <!-- Esencial -->
            <article class="flex flex-col gap-4 rounded-2xl border border-line bg-gradient-to-b from-ink-card/95 to-ink/95 p-6 transition-all duration-400 hover:-translate-y-1 hover:border-halo-line sm:p-8">
              <div class="flex items-center gap-2.5">
                <p class="font-mono text-[0.705rem] uppercase tracking-[0.22em] text-mist-dim">{{ $t('landing.plans.essential.name') }}</p>
              </div>
              <div class="font-display text-[clamp(2rem,3.6vw,2.7rem)] leading-none tracking-[-0.03em]" style="font-variation-settings: 'wdth' 94, 'wght' 400;">
                $290<small class="ml-2 font-mono text-[0.68rem] tracking-[0.12em] text-mist-dim">{{ $t('landing.plans.perMonth') }}</small>
              </div>
              <ul class="grid gap-3">
                <li v-for="k in 5" :key="k" class="flex items-start gap-3 text-sm text-mist">
                  <span class="mt-1 size-3.5 shrink-0 rounded-full border border-halo-line" style="background: radial-gradient(circle, #58F0CE 0 3px, transparent 3.5px);" />
                  <span>{{ $t(`landing.plans.essential.items.${k}`) }}</span>
                </li>
              </ul>
              <a
                href="#cierre"
                class="mt-auto inline-flex items-center justify-center gap-2 rounded-full border border-halo-line bg-ink-card/55 px-6 py-3 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-pearl backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-halo hover:bg-ink-tealMid/55"
                @click="smoothScroll($event, '#cierre')"
              >
                {{ $t('landing.plans.start') }}
              </a>
            </article>
            <!-- Negocio (destacado) -->
            <article class="flex flex-col gap-4 rounded-2xl border border-halo-line bg-gradient-to-b from-ink-tealMid/70 to-ink/95 p-6 shadow-halo-glow-lg transition-all duration-400 hover:-translate-y-1 sm:p-8">
              <div class="flex items-center gap-2.5">
                <p class="font-mono text-[0.705rem] uppercase tracking-[0.22em] text-halo-dim">{{ $t('landing.plans.business.name') }}</p>
                <span class="rounded-full border border-halo-line px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.12em] text-halo">{{ $t('landing.plans.recommended') }}</span>
              </div>
              <div class="font-display text-[clamp(2rem,3.6vw,2.7rem)] leading-none tracking-[-0.03em]" style="font-variation-settings: 'wdth' 94, 'wght' 400;">
                $690<small class="ml-2 font-mono text-[0.68rem] tracking-[0.12em] text-mist-dim">{{ $t('landing.plans.perMonth') }}</small>
              </div>
              <ul class="grid gap-3">
                <li v-for="k in 6" :key="k" class="flex items-start gap-3 text-sm text-mist">
                  <span class="mt-1 size-3.5 shrink-0 rounded-full border border-halo-line" style="background: radial-gradient(circle, #58F0CE 0 3px, transparent 3.5px);" />
                  <span>{{ $t(`landing.plans.business.items.${k}`) }}</span>
                </li>
              </ul>
              <a
                href="#cierre"
                class="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3 font-mono text-[0.78rem] font-medium uppercase tracking-[0.12em] text-ink-tealDeep shadow-halo-glow transition-transform hover:-translate-y-0.5"
                @click="smoothScroll($event, '#cierre')"
              >
                {{ $t('landing.plans.book') }}
              </a>
            </article>
            <!-- Corporativo -->
            <article class="flex flex-col gap-4 rounded-2xl border border-line bg-gradient-to-b from-ink-card/95 to-ink/95 p-6 transition-all duration-400 hover:-translate-y-1 hover:border-halo-line sm:p-8">
              <div class="flex items-center gap-2.5">
                <p class="font-mono text-[0.705rem] uppercase tracking-[0.22em] text-mist-dim">{{ $t('landing.plans.corporate.name') }}</p>
              </div>
              <div class="font-display text-[clamp(2rem,3.6vw,2.7rem)] leading-none tracking-[-0.03em]" style="font-variation-settings: 'wdth' 94, 'wght' 400;">
                {{ $t('landing.plans.corporate.price') }}<small class="ml-2 font-mono text-[0.68rem] tracking-[0.12em] text-mist-dim">{{ $t('landing.plans.perContract') }}</small>
              </div>
              <ul class="grid gap-3">
                <li v-for="k in 5" :key="k" class="flex items-start gap-3 text-sm text-mist">
                  <span class="mt-1 size-3.5 shrink-0 rounded-full border border-halo-line" style="background: radial-gradient(circle, #58F0CE 0 3px, transparent 3.5px);" />
                  <span>{{ $t(`landing.plans.corporate.items.${k}`) }}</span>
                </li>
              </ul>
              <a
                href="#cierre"
                class="mt-auto inline-flex items-center justify-center gap-2 rounded-full border border-halo-line bg-ink-card/55 px-6 py-3 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-pearl backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-halo hover:bg-ink-tealMid/55"
                @click="smoothScroll($event, '#cierre')"
              >
                {{ $t('landing.plans.talk') }}
              </a>
            </article>
          </div>
        </div>
      </section>

      <!-- ══════════ CIERRE ══════════ -->
      <section id="cierre" class="relative border-t border-line-soft py-[clamp(90px,14vh,170px)] text-center">
        <div class="mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
          <p class="mb-6.5 font-mono text-[0.705rem] uppercase tracking-[0.22em] text-halo-dim">
            {{ $t('landing.close.eyebrow') }}
          </p>
          <h2 v-reveal class="alia-rv mx-auto max-w-[16ch] font-display text-[clamp(2.2rem,6vw,4.3rem)] leading-tight tracking-[-0.03em]" style="font-variation-settings: 'wdth' 92, 'wght' 380;">
            {{ $t('landing.close.titleA') }}<br>{{ $t('landing.close.titleB') }}
            <em class="not-italic font-medium text-halo" style="font-variation-settings: 'wdth' 92, 'wght' 620;">{{ $t('landing.close.titleEm') }}</em>
          </h2>
          <div v-reveal="140" class="alia-rv mt-9 flex flex-wrap justify-center gap-3.5">
            <NuxtLink
              :to="primaryCtaTarget"
              class="inline-flex items-center gap-2 rounded-full border border-transparent bg-brand-gradient px-6 py-3.5 font-mono text-[0.78rem] font-medium uppercase tracking-[0.12em] text-ink-tealDeep shadow-halo-glow transition-transform hover:-translate-y-0.5"
            >
              <span class="inline-block size-1.5 rounded-full bg-halo animate-ping" aria-hidden="true" />
              {{ isAuthenticated ? $t('landing.goToDashboard') : $t('landing.close.ctaPrimary') }}
            </NuxtLink>
            <a
              href="#planes"
              class="inline-flex items-center gap-2 rounded-full border border-halo-line bg-ink-card/55 px-6 py-3.5 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-pearl backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-halo hover:bg-ink-tealMid/55"
              @click="smoothScroll($event, '#planes')"
            >
              {{ $t('landing.close.ctaSecondary') }}
            </a>
          </div>
        </div>
      </section>
    </main>

    <!-- ══════════ FOOTER ══════════ -->
    <footer class="mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
      <div class="flex flex-col gap-4 border-t border-line-soft py-11 pb-14 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-4">
          <AliaLogo variant="wordmark" :size="17" tone="mist" alt="ALIA" />
          <p class="max-w-[46ch] text-[0.82rem] text-mist-dim">{{ $t('landing.footer.tagline') }}</p>
        </div>
        <div class="flex flex-wrap gap-x-5 gap-y-2 text-[0.82rem] text-mist-dim">
          <NuxtLink to="/login" class="transition-colors hover:text-pearl">{{ $t('landing.footer.signIn') }}</NuxtLink>
          <NuxtLink to="/register" class="transition-colors hover:text-pearl">{{ $t('landing.footer.createAccount') }}</NuxtLink>
          <NuxtLink to="/privacy" class="transition-colors hover:text-pearl">{{ $t('legal.privacy.title') }}</NuxtLink>
          <NuxtLink to="/terms" class="transition-colors hover:text-pearl">{{ $t('legal.terms.title') }}</NuxtLink>
        </div>
      </div>
    </footer>

    <!-- Floating WhatsApp CTA -->
    <a
      href="https://wa.me/593979798458?text=Hola,%20me%20interesa%20conocer%20más%20sobre%20ALIA"
      target="_blank"
      rel="noreferrer noopener"
      :aria-label="$t('landing.whatsappFloat.ariaLabel')"
      class="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-success-500 px-4 py-3 text-sm font-semibold text-white shadow-glass-lg ring-1 ring-white/20 transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5 shrink-0" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      <span class="hidden sm:inline">{{ $t('landing.whatsappFloat.label') }}</span>
    </a>
  </div>
</template>

<style scoped>
/* Radial glow que persigue el puntero en cada tarjeta de capacidad. */
.cap-glow {
  background: radial-gradient(340px circle at var(--mx, 50%) var(--my, 0%), rgba(88, 240, 206, 0.10), transparent 70%);
  opacity: 0;
  transition: opacity 0.45s ease;
}
.js-cap:hover .cap-glow {
  opacity: 1;
}

/* Layout ganancias: Tailwind no tiene `gap-6.5` nativo; compensamos aquí. */
.gap-6\.5 { gap: 1.625rem; }
.gap-7\.5 { gap: 1.875rem; }
.mt-6\.5 { margin-top: 1.625rem; }
.mt-8\.5 { margin-top: 2.125rem; }
.pt-4\.5 { padding-top: 1.125rem; }
.px-7\.5 { padding-left: 1.875rem; padding-right: 1.875rem; }
.py-6\.5 { padding-top: 1.625rem; padding-bottom: 1.625rem; }
.mb-6\.5 { margin-bottom: 1.625rem; }
.pl-5\.5 { padding-left: 1.375rem; }
.pt-5\.5 { padding-top: 1.375rem; }
</style>
