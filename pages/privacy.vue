<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Privacy Policy · Kaibots',
  meta: [
    { name: 'description', content: 'Kaibots Privacy Policy — how we collect, use, share and protect your information.' },
    { name: 'robots', content: 'index, follow' },
  ],
})

const sections = [
  'collect',
  'use',
  'sharing',
  'retention',
  'security',
  'rights',
  'endUser',
  'children',
  'international',
  'cookies',
  'changes',
  'contact',
] as const
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden bg-sky-day font-sans text-slate-900">
    <header class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 ring-1 ring-white/60">
      <div class="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <NuxtLink to="/" class="flex items-center gap-2.5 group" aria-label="Kaibots home">
          <KaibotLogo :size="36" rounded="rounded-2xl" class="shadow-glass ring-1 ring-white/60 bg-white transition-transform group-hover:scale-105" />
          <span class="text-base font-semibold tracking-tight">Kaibots</span>
        </NuxtLink>
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {{ $t('legal.backHome') }}
        </NuxtLink>
      </div>
    </header>

    <main class="relative mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <div class="rounded-3xl bg-white/75 p-8 sm:p-12 ring-1 ring-white/60 shadow-glass-lg backdrop-blur-xl">
        <p class="text-xs font-semibold uppercase tracking-wider text-primary-600">
          {{ $t('legal.lastUpdated') }} · {{ $t('legal.lastUpdatedDate') }}
        </p>
        <h1 class="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          {{ $t('legal.privacy.title') }}
        </h1>
        <p class="mt-3 text-lg text-slate-600">
          {{ $t('legal.privacy.subtitle') }}
        </p>

        <div class="mt-8 space-y-8 text-[15px] leading-relaxed text-slate-700">
          <p>{{ $t('legal.privacy.intro') }}</p>

          <section
            v-for="key in sections"
            :key="key"
            class="space-y-2"
          >
            <h2 class="text-xl font-semibold text-slate-900">
              {{ $t(`legal.privacy.${key}.title`) }}
            </h2>
            <p>{{ $t(`legal.privacy.${key}.body`) }}</p>
          </section>

          <div class="mt-8 rounded-2xl bg-primary-50/60 ring-1 ring-primary-100 px-5 py-4">
            <p class="text-sm font-medium text-slate-900">
              {{ $t('legal.contactLabel') }}:
              <a
                href="mailto:info@kaibots.com"
                class="text-primary-700 hover:underline"
              >
                info@kaibots.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <div class="mt-8 flex items-center justify-between text-sm text-slate-500">
        <NuxtLink to="/terms" class="font-medium text-slate-700 hover:text-slate-900 transition">
          {{ $t('legal.terms.title') }} →
        </NuxtLink>
        <NuxtLink to="/" class="hover:text-slate-900 transition">
          {{ $t('legal.backHome') }}
        </NuxtLink>
      </div>
    </main>
  </div>
</template>
