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
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss', '@nuxt/eslint'],
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
    },
  },
  app: {
    head: {
      title: 'Kaibot — WhatsApp AI for businesses',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Kaibot replies to your customers on WhatsApp 24/7 — powered by AI, trained on your business.' },
        { name: 'theme-color', content: '#6366f1' },
      ],
      // Poppins is the platform-wide font. Wired into Tailwind's `font-sans`
      // stack in `tailwind.config.ts`, so every element inherits it through
      // Tailwind's base layer without per-component overrides.
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', href: '/kaibot-logo.png' },
        { rel: 'shortcut icon', type: 'image/png', href: '/kaibot-logo.png' },
        { rel: 'apple-touch-icon', href: '/kaibot-logo.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
        },
      ],
    },
  },
})
