<script setup lang="ts">
const { t } = useI18n()
const auth = useSuperadminAuthStore()
const router = useRouter()
const route = useRoute()
const { superadminLogout } = useAuth()
const drawer = useNavDrawer()

const links = computed(() => [
  { to: '/superadmin', label: t('nav.dashboard') },
  { to: '/superadmin/companies', label: t('nav.companies') },
  { to: '/superadmin/leads', label: t('nav.leads') },
  { to: '/superadmin/profile', label: t('nav.myProfile') },
])

async function onLogout(): Promise<void> {
  superadminLogout()
  await router.replace('/superadmin/login')
}

// Auto-close the drawer on route change.
watch(() => route.fullPath, () => drawer.close())

// Lock body scroll while drawer is open.
watch(drawer.open, (isOpen) => {
  if (!import.meta.client) return
  document.body.style.overflow = isOpen ? 'hidden' : ''
})
onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

// Esc closes the drawer.
onMounted(() => {
  if (!import.meta.client) return
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && drawer.open.value) drawer.close()
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})
</script>

<template>
  <div class="relative min-h-screen flex bg-home-mesh text-pearl">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="drawer.open.value"
        class="fixed inset-0 z-40 bg-ink-deep/70 backdrop-blur-sm md:hidden"
        aria-hidden="true"
        @click="drawer.close()"
      />
    </Transition>

    <aside
      class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-ink-surface/95 backdrop-blur-xl border-r border-line-soft p-4 transform transition-transform duration-200 ease-out md:static md:translate-x-0 md:w-64 md:max-w-none md:bg-ink-surface/70 md:z-0"
      :class="drawer.open.value ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:shadow-none'"
      role="navigation"
      aria-label="Main navigation"
    >
      <div class="flex items-center justify-between gap-2 px-2">
        <div class="flex items-center gap-2">
          <span class="inline-flex size-8 items-center justify-center rounded-xl bg-brand-gradient text-ink-tealDeep text-xs font-bold tracking-tight shadow-halo-glow">{{ $t('superadmin.chrome.brandShort') }}</span>
          <div>
            <div class="text-xs uppercase tracking-wider text-halo-dim leading-none">{{ $t('superadmin.chrome.brandLabel') }}</div>
            <div class="text-sm font-semibold text-pearl mt-1">{{ $t('superadmin.chrome.brandSubtitle') }}</div>
          </div>
        </div>
        <button
          type="button"
          class="md:hidden -mr-1 flex size-8 items-center justify-center rounded-lg text-mist-dim hover:bg-ink-card/60 hover:text-pearl transition"
          :aria-label="$t('nav.closeMenu')"
          @click="drawer.close()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <nav class="mt-8 space-y-1">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="block px-3 py-2.5 rounded-xl text-sm text-mist hover:bg-ink-card/60 hover:text-pearl transition-colors"
          active-class="!bg-brand-gradient !text-ink-tealDeep font-medium shadow-halo-glow"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="sticky top-0 z-30 h-14 bg-ink-surface/70 backdrop-blur-xl border-b border-line-soft flex items-center justify-between gap-2 px-4 sm:px-6">
        <div class="flex items-center gap-2 min-w-0">
          <button
            type="button"
            class="md:hidden flex size-9 shrink-0 items-center justify-center rounded-xl text-mist hover:bg-ink-card/60 transition"
            :aria-label="$t('nav.openMenu')"
            @click="drawer.toggle()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div class="md:hidden flex items-center gap-2 min-w-0">
            <span class="inline-flex size-7 items-center justify-center rounded-lg bg-brand-gradient text-ink-tealDeep text-[10px] font-bold tracking-tight">{{ $t('superadmin.chrome.brandShort') }}</span>
            <span class="text-sm font-semibold text-pearl truncate">{{ $t('superadmin.chrome.brandLabel') }}</span>
          </div>
          <h1 class="hidden md:block text-sm font-medium text-mist">{{ $t('superadmin.chrome.headerSubtitle') }}</h1>
        </div>

        <div v-if="auth.user" class="flex items-center gap-2 shrink-0">
          <NuxtLink
            to="/superadmin/profile"
            class="hidden sm:flex items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-ink-card/60 transition"
            :title="$t('nav.myProfile')"
          >
            <div class="text-right">
              <div class="text-sm font-medium text-pearl truncate max-w-[160px]">{{ auth.user.email }}</div>
              <div class="text-xs text-mist-dim">{{ $t('superadmin.chrome.userRole') }}</div>
            </div>
            <div class="flex size-9 items-center justify-center rounded-full bg-brand-gradient text-ink-tealDeep text-sm font-semibold ring-1 ring-halo-line">
              {{ auth.user.email.charAt(0).toUpperCase() }}
            </div>
          </NuxtLink>
          <NuxtLink
            to="/superadmin/profile"
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

      <main class="flex-1 overflow-y-auto p-4 sm:p-6 [&_h1.text-slate-900]:!text-pearl [&_h1.text-slate-900]:drop-shadow-sm [&_p.text-slate-500.max-w-2xl]:!text-white/85 [&_p.text-slate-500.max-w-2xl]:drop-shadow-sm [&_input:not([type=checkbox]):not([type=radio])]:text-slate-900 [&_textarea]:text-slate-900 [&_select]:text-slate-900 [&_input:not([type=checkbox]):not([type=radio])]:caret-slate-900">
        <slot />
      </main>
    </div>
  </div>
</template>
