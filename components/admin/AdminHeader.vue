<script setup lang="ts">
const auth = useAuthStore()
const router = useRouter()
const { logout } = useAuth()
const drawer = useNavDrawer()

async function onLogout(): Promise<void> {
  logout()
  await router.replace('/login')
}
</script>

<template>
  <header class="sticky top-0 z-30 h-14 bg-white/70 backdrop-blur-xl border-b border-white/60 flex items-center justify-between gap-2 px-4 sm:px-6">
    <div class="flex items-center gap-2 min-w-0">
      <!-- Mobile hamburger -->
      <button
        type="button"
        class="md:hidden flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-white/80 transition"
        aria-label="Open menu"
        @click="drawer.toggle()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <!-- Mobile brand (sidebar is hidden until drawer opens) -->
      <div class="md:hidden flex items-center gap-2 min-w-0">
        <span class="inline-flex size-7 items-center justify-center rounded-lg bg-slate-900 text-white text-[10px] font-bold tracking-tight">CB</span>
        <span class="text-sm font-semibold text-slate-900 truncate">Chat Bot AI</span>
      </div>
      <!-- Desktop subtitle -->
      <div class="hidden md:block text-sm text-slate-500">Admin panel</div>
    </div>

    <div v-if="auth.user" class="flex items-center gap-2 shrink-0">
      <NuxtLink
        to="/admin/profile"
        class="hidden sm:flex items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-white/60 transition"
        title="My profile"
      >
        <div class="text-right">
          <div class="text-sm font-medium text-slate-900 truncate max-w-[160px]">{{ auth.user.email }}</div>
          <div class="text-xs text-slate-500">{{ auth.user.role }}</div>
        </div>
        <div class="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 text-white text-sm font-semibold ring-1 ring-white/40">
          {{ auth.user.email.charAt(0).toUpperCase() }}
        </div>
      </NuxtLink>
      <!-- Mobile: avatar-only link to profile -->
      <NuxtLink
        to="/admin/profile"
        class="sm:hidden flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 text-white text-sm font-semibold ring-1 ring-white/40"
        :title="auth.user.email"
        aria-label="My profile"
      >
        {{ auth.user.email.charAt(0).toUpperCase() }}
      </NuxtLink>
      <button
        type="button"
        class="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition hidden sm:inline-flex"
        @click="onLogout"
      >
        Log out
      </button>
      <!-- Mobile: icon-only logout -->
      <button
        type="button"
        class="sm:hidden flex size-9 items-center justify-center rounded-xl text-slate-700 hover:bg-white/80 transition"
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
</template>
