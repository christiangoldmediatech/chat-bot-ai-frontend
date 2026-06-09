<script setup lang="ts">
const auth = useAuthStore()
const router = useRouter()
const { logout } = useAuth()

async function onLogout(): Promise<void> {
  logout()
  await router.replace('/login')
}
</script>

<template>
  <header class="h-14 bg-white/60 backdrop-blur-xl border-b border-white/60 flex items-center justify-between px-6">
    <div class="text-sm text-slate-500">Admin panel</div>

    <div v-if="auth.user" class="flex items-center gap-3">
      <NuxtLink
        to="/admin/profile"
        class="hidden sm:flex items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-white/60 transition"
        title="My profile"
      >
        <div class="text-right">
          <div class="text-sm font-medium text-slate-900">{{ auth.user.email }}</div>
          <div class="text-xs text-slate-500">{{ auth.user.role }}</div>
        </div>
        <div class="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 text-white text-sm font-semibold ring-1 ring-white/40">
          {{ auth.user.email.charAt(0).toUpperCase() }}
        </div>
      </NuxtLink>
      <button
        type="button"
        class="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition"
        @click="onLogout"
      >
        Log out
      </button>
    </div>
  </header>
</template>
