import { defineStore } from 'pinia'

import type { SuperadminUser } from '~/types/auth'

interface PersistedSession {
  token: string
  user: SuperadminUser
}

const STORAGE_KEY = 'cbai.superadmin.auth'

export const useSuperadminAuthStore = defineStore('superadminAuth', {
  state: () => ({
    token: null as string | null,
    user: null as SuperadminUser | null,
  }),
  getters: {
    isAuthenticated: (s): boolean => Boolean(s.token),
  },
  actions: {
    setSession(token: string, user: SuperadminUser): void {
      this.token = token
      this.user = user
      if (import.meta.client) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
      }
    },
    clear(): void {
      this.token = null
      this.user = null
      if (import.meta.client) {
        localStorage.removeItem(STORAGE_KEY)
      }
    },
    hydrate(): void {
      if (!import.meta.client) return
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as PersistedSession
        this.token = parsed.token
        this.user = parsed.user
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    },
  },
})
