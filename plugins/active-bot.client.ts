export default defineNuxtPlugin({
  name: 'active-bot',
  dependsOn: ['auth'],
  async setup() {
    const auth = useAuthStore()
    const activeBot = useActiveBotStore()
    activeBot.hydrate()
    if (auth.isAuthenticated) {
      try {
        await activeBot.refreshList()
      } catch {
        // Swallowed: a 401 is handled by useApi and will clear auth; any other
        // error leaves the store empty and the UI will render the "no bots"
        // state until the user retries.
      }
    }
  },
})
