interface Rule {
  pattern: RegExp
  target: (match: RegExpMatchArray) => string
}

const RULES: Rule[] = [
  { pattern: /^\/admin\/bots\/([^/]+)\/calendar\/?$/, target: () => '/admin/calendar' },
  { pattern: /^\/admin\/bots\/([^/]+)\/services\/create\/?$/, target: () => '/admin/services/create' },
  { pattern: /^\/admin\/bots\/([^/]+)\/services\/([^/]+)\/edit\/?$/, target: m => `/admin/services/${m[2]}/edit` },
  { pattern: /^\/admin\/bots\/([^/]+)\/services\/?$/, target: () => '/admin/services' },
  { pattern: /^\/admin\/bots\/([^/]+)\/sales\/?$/, target: () => '/admin/sales' },
  { pattern: /^\/admin\/bots\/([^/]+)\/reports\/revenue\/?$/, target: () => '/admin/sales' },
]

export default defineNuxtRouteMiddleware((to) => {
  for (const { pattern, target } of RULES) {
    const match = to.path.match(pattern)
    if (!match) continue
    const botId = match[1]
    if (import.meta.client) {
      const activeBot = useActiveBotStore()
      if (activeBot.allBots.some(b => b.id === botId) && activeBot.botId !== botId) {
        activeBot.setActive(botId)
      }
    }
    return navigateTo(target(match), { replace: true })
  }
})
