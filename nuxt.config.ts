// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  // SPA mode: this is an authenticated admin panel that lives entirely behind
  // a login. Server-side rendering would force us to deal with SSR-side token
  // reads (which we keep in localStorage) for no real SEO benefit.
  ssr: false,
  devtools: { enabled: true },
  // Dev server binds to 8080 by default to avoid the NestJS backend on 3000.
  // Override with `PORT=… npm run dev` if needed.
  devServer: {
    port: 8080,
  },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss', '@nuxt/eslint', '@nuxtjs/i18n'],
  // i18n: browser-language detection on first load, persisted in a cookie so
  // the user can switch later without the next visit overriding it.
  //
  // Strategy `no_prefix` keeps URLs clean (no `/en/admin`, `/es/admin`) — the
  // admin URLs already encode IDs and we don't want SEO surfaces for an
  // authenticated app.
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'cbai.lang',
      // The browser's Accept-Language is the source of truth on FIRST visit;
      // afterwards the cookie wins (so a manual override sticks).
      redirectOn: 'no prefix',
      fallbackLocale: 'en',
      alwaysRedirect: false,
    },
    bundle: {
      // Smaller runtime (drops the legacy API surface).
      optimizeTranslationDirective: false,
    },
  },
  // Don't prefix nested-folder components with the folder name. We organize
  // components by area (e.g. `components/admin/*`) but reference them by
  // their filename only (`<BotDocumentsCard>`, not `<AdminBotDocumentsCard>`).
  // Without this, Nuxt's default `pathPrefix: true` silently turns those tags
  // into unknown elements that render as empty DOM nodes — see the same-name
  // discussion in the polish-ui skill.
  components: [{ path: '~/components', pathPrefix: false }],
  typescript: {
    strict: true,
    typeCheck: false,
  },
  css: ['~/assets/css/main.css'],
  // Runtime config:
  // - `apiBaseUrl` is PUBLIC (exposed to the client) because the SPA talks
  //   directly to the backend from the browser. Set it via the env var
  //   NUXT_PUBLIC_API_BASE_URL — defaults to local NestJS dev port.
  runtimeConfig: {
    public: {
      apiBaseUrl: 'http://localhost:3000/api/v1',
      // VAT / IVA rate applied on top of the plan's monthly price. Single
      // source of truth across the payment page and billing banner — override
      // with `NUXT_PUBLIC_IVA_RATE=0.12` (etc.) if Ecuador's rate changes.
      ivaRate: 0.15,
    },
  },
  app: {
    head: {
      title: 'LURVIA — Plataforma de asistentes inteligentes',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'LURVIA replies to your customers on WhatsApp 24/7 — powered by AI, trained on your business.' },
        { name: 'theme-color', content: '#077DDC' },
        { property: 'og:title', content: 'LURVIA — Plataforma de asistentes inteligentes' },
        { property: 'og:site_name', content: 'LURVIA' },
        { property: 'og:description', content: 'LURVIA replies to your customers on WhatsApp 24/7 — powered by AI, trained on your business.' },
        { name: 'twitter:title', content: 'LURVIA — Plataforma de asistentes inteligentes' },
        { name: 'twitter:description', content: 'LURVIA replies to your customers on WhatsApp 24/7 — powered by AI, trained on your business.' },
      ],
      // Platform-wide typography (dark commit):
      // - Archivo (variable width/weight) → wordmark + display headings via
      //   `font-display`.
      // - Chivo → body/UI text via `font-sans` (Tailwind base layer).
      // - Chivo Mono → labels, eyebrows and metadata via `font-mono`.
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', href: '/lurvia-logo.png' },
        { rel: 'shortcut icon', type: 'image/png', href: '/lurvia-logo.png' },
        { rel: 'apple-touch-icon', href: '/lurvia-logo.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Chivo:wght@300;400;500;600&family=Chivo+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
})
