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
      title: 'Chat Bot AI — Admin',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Admin panel for chat-bot-ai' },
      ],
    },
  },
})
