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

    <div v-if="auth.user" class="flex items-center gap-4">
      <div class="hidden sm:block text-right">
        <div class="text-sm font-medium text-slate-900">{{ auth.user.email }}</div>
        <div class="text-xs text-slate-500">{{ auth.user.role }}</div>
      </div>
      <button
        type="button"
        class="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        @click="onLogout"
      >
        Log out
      </button>
    </div>
  </header>
</template>
