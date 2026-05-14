// Route middleware protecting /superadmin/*. Wired in Fase G.
export default defineNuxtRouteMiddleware((to) => {
  const auth = useSuperadminAuthStore()
  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/superadmin/login', query: { redirect: to.fullPath } })
  }
})
