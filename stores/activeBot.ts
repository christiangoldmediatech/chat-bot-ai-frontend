import { defineStore } from 'pinia'

import type { Bot } from '~/types/bot'

const STORAGE_KEY = 'cbai.activeBot'

interface PersistedActiveBot {
  botId: string
}

export const useActiveBotStore = defineStore('activeBot', {
  state: () => ({
    botId: null as string | null,
    bot: null as Bot | null,
    allBots: [] as Bot[],
    loading: false,
    loaded: false,
    lastError: null as string | null,
  }),
  getters: {
    hasBots: (s): boolean => s.allBots.length > 0,
    hasMultiple: (s): boolean => s.allBots.length > 1,
    activeBot: (s): Bot | null => s.bot,
  },
  actions: {
    hydrate(): void {
      if (!import.meta.client) return
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as PersistedActiveBot
        this.botId = parsed.botId
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    },
    persist(): void {
      if (!import.meta.client) return
      if (!this.botId) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ botId: this.botId }))
    },
    async refreshList(): Promise<void> {
      const auth = useAuthStore()
      if (!auth.isAuthenticated) {
        this.lastError = 'not-authenticated'
        this.loaded = true
        return
      }
      this.loading = true
      this.lastError = null
      try {
        const { list } = useBots()
        const bots = await list()
        this.allBots = bots
        this.reconcile()
      } catch (err) {
        this.allBots = []
        const anyErr = err as { status?: number, message?: string }
        this.lastError = `${anyErr.status ?? '?'} ${anyErr.message ?? String(err)}`
        if (import.meta.client) {
          console.error('[activeBot] refreshList failed', err)
        }
      } finally {
        this.loaded = true
        this.loading = false
      }
    },
    reconcile(): void {
      if (this.allBots.length === 0) {
        this.botId = null
        this.bot = null
        this.persist()
        return
      }
      const current = this.botId ? this.allBots.find(b => b.id === this.botId) : null
      if (current) {
        this.bot = current
        return
      }
      const first = this.allBots[0]
      this.botId = first.id
      this.bot = first
      this.persist()
    },
    setActive(botId: string): void {
      const found = this.allBots.find(b => b.id === botId)
      if (!found) return
      this.botId = botId
      this.bot = found
      this.persist()
    },
    clear(): void {
      this.botId = null
      this.bot = null
      this.allBots = []
      this.loaded = false
      if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
    },
  },
})
