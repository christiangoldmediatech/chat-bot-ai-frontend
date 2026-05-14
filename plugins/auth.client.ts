// Hydrates auth stores from localStorage as soon as the app loads. Runs only
// on the client (file suffix `.client.ts`) because both stores read from
// localStorage and would otherwise crash during SSR.
export default defineNuxtPlugin(() => {
  useAuthStore().hydrate()
  useSuperadminAuthStore().hydrate()
})
