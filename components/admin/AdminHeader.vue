<script setup lang="ts">
import BotSwitcher from '~/components/admin/BotSwitcher.vue'

const auth = useAuthStore()
const activeBot = useActiveBotStore()
const router = useRouter()
const { logout } = useAuth()
const drawer = useNavDrawer()

// Defensive: if the page lands here without the active-bot plugin having
// populated the store (edge case: plugin ran before auth was authenticated),
// trigger a refresh when the layout mounts.
onMounted(() => {
  if (auth.isAuthenticated && !activeBot.loaded) {
    activeBot.refreshList().catch(() => undefined)
  } else if (auth.isAuthenticated && activeBot.allBots.length === 0 && !activeBot.loading) {
    // Already "loaded" but no bots — retry once in case the first attempt
    // raced the auth hydration.
    activeBot.refreshList().catch(() => undefined)
  }
})

async function onLogout(): Promise<void> {
  logout()
  await router.replace('/login')
}
</script>

<template>
  <header class="sticky top-0 z-30 h-14 bg-ink-deep/70 backdrop-blur-xl border-b border-halo-line/30 flex items-center justify-between gap-2 px-4 sm:px-6">
    <div class="flex items-center gap-2 min-w-0">
      <button
        type="button"
        class="md:hidden flex size-9 shrink-0 items-center justify-center rounded-xl text-mist hover:bg-ink-card/60 hover:text-pearl transition"
        :aria-label="$t('nav.openMenu')"
        @click="drawer.toggle()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <NuxtLink to="/admin" class="md:hidden flex items-center gap-2 min-w-0" aria-label="LURVIAX dashboard">
        <LurviaxLogo :size="28" rounded="rounded-lg" class="bg-white ring-1 ring-white/70 shadow-sm" />
      </NuxtLink>
      <BotSwitcher />
    </div>

    <div v-if="auth.user" class="flex items-center gap-2 shrink-0">
      <NuxtLink
        to="/admin/profile"
        class="hidden sm:flex items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-ink-card/60 transition"
        :title="$t('nav.myProfile')"
      >
        <div class="text-right">
          <div class="text-sm font-medium text-pearl truncate max-w-[160px]">{{ auth.user.email }}</div>
          <div class="text-xs text-mist-dim">{{ auth.user.role }}</div>
        </div>
        <div class="flex size-9 items-center justify-center rounded-full bg-brand-gradient text-ink-tealDeep text-sm font-semibold ring-1 ring-halo-line">
          {{ auth.user.email.charAt(0).toUpperCase() }}
        </div>
      </NuxtLink>
      <NuxtLink
        to="/admin/profile"
        class="sm:hidden flex size-9 items-center justify-center rounded-full bg-brand-gradient text-ink-tealDeep text-sm font-semibold ring-1 ring-halo-line"
        :title="auth.user.email"
        :aria-label="$t('nav.myProfile')"
      >
        {{ auth.user.email.charAt(0).toUpperCase() }}
      </NuxtLink>
      <button
        type="button"
        class="rounded-xl border border-halo-line/50 px-3 py-1.5 text-sm text-pearl hover:bg-ink-card/60 transition hidden sm:inline-flex"
        @click="onLogout"
      >
        {{ $t('nav.signOut') }}
      </button>
      <button
        type="button"
        class="sm:hidden flex size-9 items-center justify-center rounded-xl text-mist hover:bg-ink-card/60 transition"
        :aria-label="$t('nav.signOut')"
        @click="onLogout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  </header>
</template>
