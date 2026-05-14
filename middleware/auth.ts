// Route middleware protecting /admin/*. Plugins run before middleware, so by
// the time we get here `auth.client.ts` has already hydrated the store from
// localStorage — an empty token means the user is genuinely unauthenticated.
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
