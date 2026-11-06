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
const isAuthenticated = computed(() => auth.isAuthenticated)
const primaryCtaTarget = computed(() => (isAuthenticated.value ? '/admin' : '/login'))

const closeCtaRef = ref<{ $el: HTMLElement } | HTMLElement | null>(null)
const plansCtaRef = ref<HTMLElement | null>(null)
const closeCtaEl = computed<HTMLElement | null>(() => {
  const r = closeCtaRef.value as { $el?: HTMLElement } | HTMLElement | null
  if (!r) return null
  return '$el' in r ? r.$el ?? null : r as HTMLElement
})
useMagnetic(closeCtaEl, { radius: 110, strength: 0.3 })
useMagnetic(plansCtaRef as unknown as Ref<HTMLElement | null>, { radius: 100, strength: 0.26 })

const stuck = ref(false)
const onScroll = () => {
  const y = window.scrollY
  if (!stuck.value && y > 24) stuck.value = true
  else if (stuck.value && y < 8) stuck.value = false
}

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
  const dur = 1200
  const step = (now: number) => {
    const k = Math.min((now - start) / dur, 1)
    const e = 1 - (1 - k) ** 3
    el.textContent = pre + (target * e).toFixed(dec) + suf
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

let countObserver: IntersectionObserver | null = null

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  countObserver = new IntersectionObserver((entries) => {
    const batch: HTMLElement[] = []
    for (const entry of entries) {
      if (entry.isIntersecting) {
        batch.push(entry.target as HTMLElement)
        countObserver?.unobserve(entry.target)
      }
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stepDelay = reduce ? 0 : 80
    batch.forEach((el, i) => window.setTimeout(() => runCount(el), i * stepDelay))
  }, { threshold: 0.4 })
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    countObserver?.observe(el)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  countObserver?.disconnect()
})

function smoothScroll(ev: MouseEvent, href: string) {
  const el = document.querySelector(href)
  if (!el) return
  ev.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <div>
    <!-- Background live: wave-strands canvas + grain overlay + ground base. -->
    <LandingHeroCanvas />
    <div class="lurviax-grain" aria-hidden="true" />
    <div class="fixed inset-0 z-0 pointer-events-none bg-ground" aria-hidden="true" />

    <LurviaxSectionDots />

    <div class="relative z-[3] min-h-screen overflow-x-hidden bg-transparent font-sans text-pearl">
    <!-- ══════════ NAV ══════════ -->
    <header
      id="nav"
      class="sticky top-0 z-40 flex items-center gap-6 border-b px-[clamp(20px,4vw,44px)] py-4 transition-[background-color,backdrop-filter,border-color] duration-300 ease-out"
      :class="stuck
        ? 'bg-ink-deep/70 backdrop-blur-md backdrop-saturate-150 border-line-soft'
        : 'border-transparent'"
    >
      <NuxtLink to="/" class="flex items-center gap-3" aria-label="LURVIAX, inicio">
        <LurviaxLogo variant="wordmark" :size="19" tone="pearl" alt="LURVIAX" />
      </NuxtLink>
      <nav class="ml-auto hidden gap-7 md:flex" :aria-label="$t('landing.nav.aria')">
        <a href="#demo" class="lurviax-nav-link font-mono text-[0.74rem] uppercase tracking-[0.13em] text-mist transition-colors hover:text-pearl" @click="smoothScroll($event, '#demo')">{{ $t('landing.nav.demo') }}</a>
        <a href="#capacidades" class="lurviax-nav-link font-mono text-[0.74rem] uppercase tracking-[0.13em] text-mist transition-colors hover:text-pearl" @click="smoothScroll($event, '#capacidades')">{{ $t('landing.nav.caps') }}</a>
        <a href="#proceso" class="lurviax-nav-link font-mono text-[0.74rem] uppercase tracking-[0.13em] text-mist transition-colors hover:text-pearl" @click="smoothScroll($event, '#proceso')">{{ $t('landing.nav.process') }}</a>
        <a href="#planes" class="lurviax-nav-link font-mono text-[0.74rem] uppercase tracking-[0.13em] text-mist transition-colors hover:text-pearl" @click="smoothScroll($event, '#planes')">{{ $t('landing.nav.plans') }}</a>
      </nav>
      <!-- Auth CTAs: Crear cuenta (text link, oculto en mobile) + Iniciar
           sesión (pill halo). Cuando el usuario ya inició sesión, se colapsa
           a un solo pill "Ir al panel". Mismo patrón que la rama main pero
           adaptado a la paleta dark commit (mono font, pill halo gradient). -->
      <div class="ml-auto flex items-center gap-3 md:ml-0">
        <NuxtLink
          v-if="!isAuthenticated"
          to="/register"
          class="lurviax-nav-link hidden font-mono text-[0.7rem] uppercase tracking-[0.13em] text-mist transition-colors hover:text-pearl sm:inline"
        >
          {{ $t('landing.createAccount') }}
        </NuxtLink>
        <NuxtLink
          :to="primaryCtaTarget"
          class="inline-flex items-center gap-2 rounded-full border border-transparent bg-brand-gradient px-4 py-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-tealDeep shadow-halo-glow transition-transform hover:-translate-y-0.5"
        >
          {{ isAuthenticated ? $t('landing.goToDashboard') : $t('landing.signIn') }}
        </NuxtLink>
      </div>
    </header>

    <main id="top">
      <LandingHeroScene />

      <LandingParallelScene />

      <LandingSystemDiagram />

      <LandingProductGrid />

      <!-- ══════════ PROCESO ══════════ -->
      <section id="proceso" class="relative py-[clamp(80px,11vh,148px)]">
        <div class="mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
          <div v-reveal class="lurviax-rv mb-[clamp(38px,6vw,62px)] grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <div>
              <p class="flex items-center gap-3 font-mono text-[0.705rem] uppercase tracking-[0.22em] text-halo-dim">
                <span class="h-px w-6 bg-halo-dim" />
                {{ $t('landing.process.eyebrow') }}
              </p>
              <h2 class="lurviax-h2-breathe mt-4 font-display text-[clamp(1.9rem,4.2vw,3.1rem)] leading-tight tracking-[-0.012em]" style="font-variation-settings: 'wdth' 112, 'wght' 500;">
                {{ $t('landing.process.titleA') }}<br>{{ $t('landing.process.titleB') }}
              </h2>
            </div>
            <p class="max-w-[62ch] text-mist">
              {{ $t('landing.process.copy') }}
            </p>
          </div>

          <div v-reveal="140" class="lurviax-rv lurviax-stagger pp-process relative">
            <span class="pp-process__rail" aria-hidden="true" />
            <div
              v-for="i in 3"
              :key="i"
              class="pp-step relative grid grid-cols-[92px_minmax(0,1fr)] gap-[clamp(18px,3vw,44px)] border-t border-line-soft py-[clamp(28px,4vw,42px)] transition-colors duration-500 hover:bg-[linear-gradient(90deg,rgba(88,240,206,0.10),transparent_60%)] md:grid-cols-[118px_minmax(0,0.85fr)_minmax(0,1.2fr)]"
              :class="i === 3 ? 'border-b' : ''"
            >
              <span class="pp-step__node" aria-hidden="true" />
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

      <!-- ══════════ RESULTADOS — type moment ══════════ -->
      <section id="resultados" class="results-moment relative flex min-h-[80vh] items-center justify-center overflow-hidden py-[clamp(90px,14vh,170px)] text-center">
        <div class="results-moment__halo" aria-hidden="true" />
        <div class="relative z-10 mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
          <p v-reveal class="lurviax-rv results-moment__eyebrow">
            <span class="results-moment__eyebrow-line" />
            {{ $t('landing.results.eyebrow') }}
            <span class="results-moment__eyebrow-line" />
          </p>
          <div v-reveal="120" class="lurviax-rv">
            <div class="results-moment__num" data-count="72" data-suffix="%">0%</div>
            <p class="results-moment__caption">
              <em class="results-moment__caption-em">{{ $t('landing.results.items.1.title') }}</em>
              {{ $t('landing.results.items.1.desc') }}
            </p>
          </div>
          <div v-reveal="200" class="lurviax-rv results-moment__row">
            <div class="results-moment__sub">
              <div class="results-moment__sub-num" data-count="2.4" data-dec="1" data-suffix=" s">0 s</div>
              <div class="results-moment__sub-label">{{ $t('landing.results.items.2.title') }}</div>
            </div>
            <div class="results-moment__sub">
              <div class="results-moment__sub-num" data-count="31" data-prefix="+" data-suffix="%">0%</div>
              <div class="results-moment__sub-label">{{ $t('landing.results.items.3.title') }}</div>
            </div>
          </div>
          <p class="results-moment__footnote">{{ $t('landing.results.footnote') }}</p>
        </div>
      </section>

      <!-- ══════════ PLANES ══════════ -->
      <section id="planes" class="relative py-[clamp(90px,13vh,170px)]">
        <div class="mx-auto w-full max-w-[520px] px-[clamp(20px,4vw,44px)] text-center">
          <p v-reveal class="lurviax-rv mb-5 inline-flex items-center gap-3 font-mono text-[0.705rem] uppercase tracking-[0.26em] text-halo">
            <span class="h-px w-8 bg-halo" />
            {{ $t('landing.plans.eyebrow') }}
            <span class="h-px w-8 bg-halo" />
          </p>

          <h2 v-reveal="80" class="lurviax-rv lurviax-h2-breathe font-display text-[clamp(2rem,4.6vw,3.2rem)] leading-tight tracking-[-0.015em] text-pearl" style="font-variation-settings: 'wdth' 108, 'wght' 500;">
            {{ $t('landing.plans.titleA') }}<br>{{ $t('landing.plans.titleB') }}
          </h2>

          <p v-reveal="140" class="lurviax-rv mx-auto mt-5 max-w-[42ch] text-mist">
            {{ $t('landing.plans.copy') }}
          </p>

          <article v-reveal="200" class="lurviax-rv plan-card mt-[clamp(32px,4vw,48px)] flex flex-col items-center gap-5 rounded-3xl bg-gradient-to-b from-ink-tealMid/75 to-ink/95 p-8 text-left sm:p-10">
            <div class="flex flex-wrap items-center gap-2.5">
              <p class="font-mono text-[0.705rem] uppercase tracking-[0.22em] text-halo-dim">{{ $t('landing.plans.single.name') }}</p>
              <span class="rounded-full border border-halo-line px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.12em] text-halo">{{ $t('landing.plans.single.badge') }}</span>
            </div>
            <div class="font-display text-[clamp(3.2rem,6.5vw,4.6rem)] leading-none tracking-[-0.04em] text-pearl" style="font-variation-settings: 'wdth' 90, 'wght' 320;">
              $79<small class="ml-2 align-top font-mono text-[0.72rem] tracking-[0.12em] text-mist-dim">{{ $t('landing.plans.perMonth') }}</small>
            </div>
            <p class="self-stretch text-mist">{{ $t('landing.plans.single.tagline') }}</p>
            <ul class="grid w-full gap-3 self-stretch">
              <li v-for="k in 7" :key="k" class="flex items-start gap-3 text-sm text-mist">
                <span class="mt-1 size-3.5 shrink-0 rounded-full border border-halo-line" style="background: radial-gradient(circle, #58F0CE 0 3px, transparent 3.5px);" />
                <span>{{ $t(`landing.plans.single.items.${k}`) }}</span>
              </li>
            </ul>
            <a
              ref="plansCtaRef"
              href="#cierre"
              class="plans-cta mt-3 inline-flex self-stretch items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3.5 font-mono text-[0.78rem] font-medium uppercase tracking-[0.12em] text-ink-tealDeep shadow-halo-glow transition-transform"
              @click="smoothScroll($event, '#cierre')"
            >
              {{ $t('landing.plans.start') }}
            </a>
          </article>
        </div>
      </section>

      <!-- ══════════ CIERRE ══════════ -->
      <section id="cierre" class="relative border-t border-line-soft py-[clamp(90px,14vh,170px)] text-center">
        <div class="mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
          <p class="mb-6.5 font-mono text-[0.705rem] uppercase tracking-[0.22em] text-halo-dim">
            {{ $t('landing.close.eyebrow') }}
          </p>
          <h2 v-reveal class="lurviax-rv mx-auto max-w-[16ch] font-display text-[clamp(2.2rem,6vw,4.3rem)] leading-tight tracking-[-0.03em]" style="font-variation-settings: 'wdth' 92, 'wght' 380;">
            {{ $t('landing.close.titleA') }}<br>{{ $t('landing.close.titleB') }}
            <em class="not-italic font-medium text-halo" style="font-variation-settings: 'wdth' 92, 'wght' 620;">{{ $t('landing.close.titleEm') }}</em>
          </h2>
          <div v-reveal="140" class="lurviax-rv mt-9 flex justify-center">
            <NuxtLink
              ref="closeCtaRef"
              :to="primaryCtaTarget"
              class="close-cta inline-flex items-center gap-2 rounded-full border border-transparent bg-brand-gradient px-6 py-3.5 font-mono text-[0.78rem] font-medium uppercase tracking-[0.12em] text-ink-tealDeep shadow-halo-glow transition-transform"
            >
              {{ isAuthenticated ? $t('landing.goToDashboard') : $t('landing.createAccount') }}
            </NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <!-- ══════════ FOOTER ══════════ -->
    <footer class="mx-auto w-full max-w-[1180px] px-[clamp(20px,4vw,44px)]">
      <div class="flex flex-col gap-4 border-t border-line-soft py-11 pb-14 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-4">
          <LurviaxLogo variant="wordmark" :size="17" tone="mist" alt="LURVIAX" />
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
      href="https://wa.me/593979798458?text=Hola,%20me%20interesa%20conocer%20más%20sobre%20LURVIAX"
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

.cap-ico {
  overflow: visible;
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}
.js-cap:hover .cap-ico {
  transform: translateY(-2px);
}

.cap-ico__typing-dot {
  animation: cap-typing 1.4s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}
.cap-ico__typing-dot:nth-of-type(1) { animation-delay: 0s; }
.cap-ico__typing-dot:nth-of-type(2) { animation-delay: 0.18s; }
.cap-ico__typing-dot:nth-of-type(3) { animation-delay: 0.36s; }
@keyframes cap-typing {
  0%, 65%, 100% { transform: translateY(0); opacity: 0.55; }
  30% { transform: translateY(-1.6px); opacity: 1; }
}

.cap-ico__check {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: cap-check 4.2s cubic-bezier(0.23, 1, 0.32, 1) infinite;
}
@keyframes cap-check {
  0%, 10% { stroke-dashoffset: 100; }
  28% { stroke-dashoffset: 0; }
  78% { stroke-dashoffset: 0; opacity: 1; }
  92%, 100% { stroke-dashoffset: 0; opacity: 0.35; }
}

.cap-ico__write {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: cap-write 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
.cap-ico__write--1 { animation-delay: 0s; }
.cap-ico__write--2 { animation-delay: 0.8s; }
@keyframes cap-write {
  0%, 8% { stroke-dashoffset: 100; }
  28% { stroke-dashoffset: 0; }
  82% { stroke-dashoffset: 0; opacity: 1; }
  94%, 100% { stroke-dashoffset: 0; opacity: 0.25; }
}

.cap-ico__sparkle {
  transform-origin: 25.5px 12px;
  animation: cap-sparkle 3.6s ease-in-out infinite;
}
@keyframes cap-sparkle {
  0%, 100% { transform: scale(1) rotate(0); opacity: 0.6; }
  25% { transform: scale(1.18) rotate(8deg); opacity: 1; }
  50% { transform: scale(0.92) rotate(-4deg); opacity: 0.55; }
  75% { transform: scale(1.08) rotate(6deg); opacity: 0.9; }
}

.cap-ico__wave {
  animation: cap-wave 2.6s ease-in-out infinite;
  transform-origin: 16px 15px;
  transform-box: fill-box;
}
@keyframes cap-wave {
  0%, 100% { opacity: 0.4; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.08); }
}
.cap-ico__wave-ring {
  transform-origin: 16px 15px;
  transform-box: fill-box;
  animation: cap-wave-ring 2.6s ease-out infinite;
}
@keyframes cap-wave-ring {
  0% { transform: scale(0.4); opacity: 0.8; }
  100% { transform: scale(1.4); opacity: 0; }
}

.cap-ico__bar {
  transform-origin: center bottom;
  transform-box: fill-box;
  animation: cap-bar 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
.cap-ico__bar--1 { animation-delay: 0s; }
.cap-ico__bar--2 { animation-delay: 0.22s; }
.cap-ico__bar--3 { animation-delay: 0.44s; }
@keyframes cap-bar {
  0%, 100% { transform: scaleY(0.45); opacity: 0.55; }
  50% { transform: scaleY(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .cap-ico__typing-dot,
  .cap-ico__check,
  .cap-ico__write,
  .cap-ico__sparkle,
  .cap-ico__wave,
  .cap-ico__wave-ring,
  .cap-ico__bar {
    animation: none !important;
  }
  .cap-ico__check,
  .cap-ico__write { stroke-dashoffset: 0; }
}

.pp-process__rail {
  position: absolute;
  left: -18px;
  top: 28px;
  bottom: 28px;
  width: 1px;
  background-image: linear-gradient(to bottom, rgba(91, 233, 236, 0.5) 50%, transparent 50%);
  background-size: 1px 10px;
  background-repeat: repeat-y;
  transform-origin: top center;
  transform: scaleY(0);
  transition: transform 1.4s cubic-bezier(0.23, 1, 0.32, 1) 0.2s;
  pointer-events: none;
}
.lurviax-rv.reveal-in .pp-process__rail {
  transform: scaleY(1);
}
.pp-process__rail::after {
  content: '';
  position: absolute;
  top: -4px;
  left: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5BE9EC;
  box-shadow: 0 0 12px #5BE9EC;
  opacity: 0;
  animation: pp-rail-dot 5.5s cubic-bezier(0.4, 0, 0.2, 1) 1.2s infinite;
}
@keyframes pp-rail-dot {
  0% { top: -4px; opacity: 0; }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { top: calc(100% + 4px); opacity: 0; }
}

.pp-step__node {
  position: absolute;
  left: -22px;
  top: calc(clamp(28px, 4vw, 42px) + 2px);
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #01142A;
  border: 1.5px solid rgba(91, 233, 236, 0.6);
  transform: scale(0);
  transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.6, 1);
}
.lurviax-rv.reveal-in .pp-step:nth-child(2) .pp-step__node { transition-delay: 0.35s; }
.lurviax-rv.reveal-in .pp-step:nth-child(3) .pp-step__node { transition-delay: 0.6s; }
.lurviax-rv.reveal-in .pp-step:nth-child(4) .pp-step__node { transition-delay: 0.85s; }
.lurviax-rv.reveal-in .pp-step .pp-step__node {
  transform: scale(1);
  background: radial-gradient(circle, #5BE9EC 0 3px, #01142A 3.5px);
  border-color: #5BE9EC;
  box-shadow: 0 0 14px rgba(91, 233, 236, 0.75);
}

@media (max-width: 767px) {
  .pp-process__rail,
  .pp-step__node { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .pp-process__rail {
    transform: scaleY(1) !important;
    transition: none !important;
  }
  .pp-process__rail::after { animation: none; opacity: 0; }
  .pp-step__node {
    transform: scale(1) !important;
    transition: none !important;
  }
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

.results-moment {
  isolation: isolate;
}
.results-moment__halo {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 55% 45% at 50% 42%, rgba(91, 233, 236, 0.18), transparent 65%),
    radial-gradient(ellipse 80% 60% at 50% 50%, rgba(7, 125, 220, 0.12), transparent 70%);
  pointer-events: none;
}
.results-moment__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.705rem;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: rgba(91, 233, 236, 0.8);
  margin-bottom: clamp(32px, 4vw, 48px);
}
.results-moment__eyebrow-line {
  display: inline-block;
  width: 32px;
  height: 1px;
  background: rgba(91, 233, 236, 0.75);
  transition: width 0.7s cubic-bezier(0.23, 1, 0.32, 1);
}
.lurviax-rv.reveal-in .results-moment__eyebrow-line { width: 68px; }

.results-moment__num {
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 80, 'wght' 220;
  font-size: clamp(6rem, 22vw, 18rem);
  line-height: 0.88;
  letter-spacing: -0.045em;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 2px 2px rgba(0, 0, 0, 0.3),
    0 0 100px rgba(91, 233, 236, 0.35);
}
.results-moment__caption {
  max-width: 44ch;
  margin: clamp(22px, 3vw, 34px) auto 0;
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 100, 'wght' 400;
  font-size: clamp(1.15rem, 1.8vw, 1.45rem);
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.82);
}
.results-moment__caption-em {
  font-style: normal;
  font-variation-settings: 'wdth' 100, 'wght' 620;
  color: #5BE9EC;
  margin-right: 0.35em;
}

.results-moment__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: clamp(32px, 6vw, 72px);
  margin-top: clamp(44px, 6vw, 72px);
  padding-top: clamp(28px, 4vw, 44px);
  border-top: 1px solid rgba(91, 233, 236, 0.18);
}
.results-moment__sub {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: center;
}
.results-moment__sub-num {
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 88, 'wght' 280;
  font-size: clamp(2.6rem, 5vw, 4rem);
  line-height: 1;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.results-moment__sub-label {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}
.results-moment__footnote {
  margin-top: clamp(32px, 4vw, 48px);
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.42);
}
</style>
