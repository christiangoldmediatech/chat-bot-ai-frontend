import VueApexCharts from 'vue3-apexcharts'

/**
 * Client-only registration. ApexCharts touches `window` at import time and
 * breaks SSR if loaded on the server. The `.client.ts` suffix guarantees Nuxt
 * only runs this on the browser.
 */
export default defineNuxtPlugin((nuxt) => {
  nuxt.vueApp.use(VueApexCharts)
})
