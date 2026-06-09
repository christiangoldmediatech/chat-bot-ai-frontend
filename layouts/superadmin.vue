<script setup lang="ts">
const auth = useSuperadminAuthStore()
const router = useRouter()
const route = useRoute()
const { superadminLogout } = useAuth()
const drawer = useNavDrawer()

const links = [
  { to: '/superadmin', label: 'Dashboard' },
  { to: '/superadmin/companies', label: 'Companies' },
  { to: '/superadmin/profile', label: 'My profile' },
]

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
  <div class="min-h-screen flex bg-slate-900 text-slate-50">
    <!-- Mobile backdrop -->
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
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        aria-hidden="true"
        @click="drawer.close()"
      />
    </Transition>

    <!-- Sidebar: drawer on mobile, static column on desktop -->
    <aside
      class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/60 p-4 transform transition-transform duration-200 ease-out md:static md:translate-x-0 md:w-64 md:max-w-none md:bg-slate-950/70 md:z-0"
      :class="drawer.open.value ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:shadow-none'"
      role="navigation"
      aria-label="Main navigation"
    >
      <div class="flex items-center justify-between gap-2 px-2">
        <div class="flex items-center gap-2">
          <span class="inline-flex size-8 items-center justify-center rounded-xl bg-white text-slate-900 text-xs font-bold tracking-tight">SA</span>
          <div>
            <div class="text-xs uppercase tracking-wider text-slate-400 leading-none">Super Admin</div>
            <div class="text-sm font-semibold text-slate-100 mt-1">Platform</div>
          </div>
        </div>
        <!-- Close button only on mobile -->
        <button
          type="button"
          class="md:hidden -mr-1 flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          aria-label="Close menu"
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
          class="block px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
          active-class="!bg-white !text-slate-900 font-medium shadow-glass"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="sticky top-0 z-30 h-14 bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/60 flex items-center justify-between gap-2 px-4 sm:px-6">
        <div class="flex items-center gap-2 min-w-0">
          <!-- Mobile hamburger -->
          <button
            type="button"
            class="md:hidden flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800/60 transition"
            aria-label="Open menu"
            @click="drawer.toggle()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <!-- Mobile brand -->
          <div class="md:hidden flex items-center gap-2 min-w-0">
            <span class="inline-flex size-7 items-center justify-center rounded-lg bg-white text-slate-900 text-[10px] font-bold tracking-tight">SA</span>
            <span class="text-sm font-semibold text-slate-100 truncate">Super Admin</span>
          </div>
          <!-- Desktop subtitle -->
          <h1 class="hidden md:block text-sm font-medium text-slate-300">Global administration</h1>
        </div>

        <div v-if="auth.user" class="flex items-center gap-2 shrink-0">
          <NuxtLink
            to="/superadmin/profile"
            class="hidden sm:flex items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-slate-800/60 transition"
            title="My profile"
          >
            <div class="text-right">
              <div class="text-sm font-medium text-slate-100 truncate max-w-[160px]">{{ auth.user.email }}</div>
              <div class="text-xs text-slate-400">Super admin</div>
            </div>
            <div class="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-sm font-semibold ring-1 ring-slate-700">
              {{ auth.user.email.charAt(0).toUpperCase() }}
            </div>
          </NuxtLink>
          <!-- Mobile avatar-only link -->
          <NuxtLink
            to="/superadmin/profile"
            class="sm:hidden flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-sm font-semibold ring-1 ring-slate-700"
            :title="auth.user.email"
            aria-label="My profile"
          >
            {{ auth.user.email.charAt(0).toUpperCase() }}
          </NuxtLink>
          <button
            type="button"
            class="rounded-xl border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 transition hidden sm:inline-flex"
            @click="onLogout"
          >
            Log out
          </button>
          <!-- Mobile icon-only logout -->
          <button
            type="button"
            class="sm:hidden flex size-9 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800/60 transition"
            aria-label="Log out"
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

      <main class="flex-1 overflow-y-auto p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
