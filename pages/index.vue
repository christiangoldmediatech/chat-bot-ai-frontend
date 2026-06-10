<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useI18n()
const auth = useAuthStore()
const isAuthenticated = computed(() => auth.isAuthenticated)
const primaryCtaTarget = computed(() => (isAuthenticated.value ? '/admin' : '/login'))
const primaryCtaLabel = computed(() =>
  isAuthenticated.value ? t('landing.goToDashboard') : t('landing.signIn'),
)

const scrollY = ref(0)
const heroVisible = ref(false)

const onScroll = () => {
  scrollY.value = window.scrollY
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

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('scroll', onScroll, { passive: true })
  requestAnimationFrame(() => {
    heroVisible.value = true
  })
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden bg-sky-day font-sans text-slate-900">
    <!-- Sticky glass navbar -->
    <header
      class="fixed inset-x-0 top-0 z-50 backdrop-blur-xl ring-1 transition-all duration-300"
      :class="scrolled
        ? 'bg-white/85 ring-white/70 shadow-glass'
        : 'bg-white/60 ring-white/50'"
    >
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
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
            class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {{ primaryCtaLabel }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="relative isolate overflow-hidden pt-40 pb-32 sm:pt-48 sm:pb-40">
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
        class="pointer-events-none absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-primary-200/40 blur-3xl"
        :style="parallax(0.6)"
      />
      <div
        class="pointer-events-none absolute right-1/4 -bottom-10 h-40 w-40 rounded-full bg-success-300/60 blur-2xl"
        :style="parallax(-0.45)"
      />

      <div
        class="relative mx-auto max-w-5xl px-6 text-center transition-opacity duration-1000"
        :style="heroVisible
          ? { opacity: heroOpacity, transform: heroLift }
          : { opacity: 0, transform: 'translate3d(0, 24px, 0)' }"
      >
        <div class="mb-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-white/60 backdrop-blur-xl">
          <span class="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse" />
          {{ $t('landing.hero.badge') }}
        </div>

        <h1 class="text-5xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl md:text-7xl">
          {{ $t('landing.hero.title1') }} <span class="bg-gradient-to-r from-primary-600 via-primary-500 to-success-500 bg-clip-text text-transparent">Kaibot</span>{{ $t('landing.hero.title2') }}
        </h1>

        <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
          {{ $t('landing.hero.subtitle') }}
        </p>

        <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <NuxtLink
            :to="primaryCtaTarget"
            class="group inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-base font-semibold text-white shadow-glass transition hover:bg-slate-800"
          >
            {{ isAuthenticated ? $t('landing.goToDashboard') : $t('landing.hero.ctaSignIn') }}
            <svg class="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </NuxtLink>
          <NuxtLink
            v-if="!isAuthenticated"
            to="/register"
            class="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-6 py-3.5 text-base font-semibold text-slate-900 ring-1 ring-white/60 backdrop-blur-xl transition hover:bg-white/90"
          >
            {{ $t('landing.hero.ctaCreateFree') }}
          </NuxtLink>
        </div>
      </div>

      <!-- Floating chat preview — intentionally OUTSIDE the fading hero wrapper
           so it stays fully visible while the user scrolls. The headline + CTAs
           still fade with `heroOpacity`; the chat preview is the product
           showcase, so we don't want it to disappear before the user reaches
           the features section. Mobile-first: no parallax (the fade-out and
           upward drift on small screens made the card vanish too early). -->
      <div class="relative mx-auto mt-12 max-w-xl px-6 sm:mt-20">
        <div class="rounded-3xl bg-white/80 p-6 ring-1 ring-white/60 shadow-glass-lg backdrop-blur-xl">
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
          <div class="mt-5 space-y-3 text-left">
            <div class="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-success-500 px-4 py-2.5 text-sm text-white">
              {{ $t('landing.hero.chatPreviewUser1') }}
            </div>
            <div class="flex items-end gap-2 max-w-[85%]">
              <KaibotLogo :size="24" rounded="rounded-full" class="shrink-0 ring-1 ring-white shadow-sm bg-white" alt="Kaibot" />
              <div class="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-800">
                {{ $t('landing.hero.chatPreviewBot1') }}
              </div>
            </div>
            <div class="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-success-500 px-4 py-2.5 text-sm text-white">
              {{ $t('landing.hero.chatPreviewUser2') }}
            </div>
            <div class="flex items-center gap-1.5 px-1 pt-1 text-xs text-slate-400">
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              <span class="ml-2">{{ $t('landing.hero.chatPreviewTyping') }}</span>
            </div>
          </div>
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
          <article v-reveal="0" class="group relative overflow-hidden rounded-3xl bg-white/70 p-8 ring-1 ring-white/60 shadow-glass backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-glass-lg">
            <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-slate-900">{{ $t('landing.features.alwaysOnTitle') }}</h3>
            <p class="mt-2 text-slate-600">
              {{ $t('landing.features.alwaysOnBody') }}
            </p>
          </article>

          <article v-reveal="120" class="group relative overflow-hidden rounded-3xl bg-white/70 p-8 ring-1 ring-white/60 shadow-glass backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-glass-lg">
            <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-success-100 text-success-700">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-slate-900">{{ $t('landing.features.nativeTitle') }}</h3>
            <p class="mt-2 text-slate-600">
              {{ $t('landing.features.nativeBody') }}
            </p>
          </article>

          <article v-reveal="240" class="group relative overflow-hidden rounded-3xl bg-white/70 p-8 ring-1 ring-white/60 shadow-glass backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-glass-lg">
            <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
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
        <div v-reveal.scale class="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary-600 via-primary-700 to-slate-900 px-8 py-16 text-center shadow-glass-lg sm:px-16 sm:py-20">
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
              class="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              {{ isAuthenticated ? $t('landing.cta.primaryAuth') : $t('landing.cta.primary') }}
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </NuxtLink>
            <NuxtLink
              v-if="!isAuthenticated"
              to="/register"
              class="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3.5 text-base font-semibold text-white ring-1 ring-white/30 backdrop-blur-xl transition hover:bg-white/20"
            >
              {{ $t('landing.cta.secondary') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="relative border-t border-white/40 bg-white/50 backdrop-blur-xl">
      <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
        <div class="flex items-center gap-2 text-sm text-slate-600">
          <KaibotLogo :size="28" rounded="rounded-lg" class="bg-white ring-1 ring-white/60 shadow-sm" />
          <span class="font-semibold text-slate-900">Kaibot</span>
          <span class="text-slate-400">·</span>
          <span>{{ $t('landing.footer.tagline') }}</span>
        </div>
        <div class="flex items-center gap-6 text-sm text-slate-600">
          <NuxtLink to="/login" class="transition hover:text-slate-900">{{ $t('landing.footer.signIn') }}</NuxtLink>
          <NuxtLink to="/register" class="transition hover:text-slate-900">{{ $t('landing.footer.createAccount') }}</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
