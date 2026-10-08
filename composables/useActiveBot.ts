import type { Bot } from '~/types/bot'

export function useActiveBot() {
  const store = useActiveBotStore()
  return {
    botId: computed<string | null>(() => store.botId),
    bot: computed<Bot | null>(() => store.bot),
    allBots: computed<Bot[]>(() => store.allBots),
    loading: computed<boolean>(() => store.loading),
    loaded: computed<boolean>(() => store.loaded),
    hasBots: computed<boolean>(() => store.hasBots),
    hasMultiple: computed<boolean>(() => store.hasMultiple),
    setActive: (id: string) => store.setActive(id),
    refreshList: () => store.refreshList(),
    clear: () => store.clear(),
  }
}

export function useRequireBotId(): ComputedRef<string | null> {
  const store = useActiveBotStore()
  return computed(() => store.botId)
}
