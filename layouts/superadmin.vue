<script setup lang="ts">
const auth = useSuperadminAuthStore()
const router = useRouter()
const { superadminLogout } = useAuth()

const links = [
  { to: '/superadmin', label: 'Dashboard' },
  { to: '/superadmin/companies', label: 'Empresas' },
]

async function onLogout(): Promise<void> {
  superadminLogout()
  await router.replace('/superadmin/login')
}
</script>

<template>
  <div class="min-h-screen flex bg-slate-900 text-slate-50">
    <aside class="w-64 bg-slate-950 border-r border-slate-800 p-4 hidden md:block">
      <h2 class="text-xs uppercase tracking-wider text-slate-500">Super Admin</h2>
      <div class="mt-2 text-lg font-semibold">Plataforma</div>
      <nav class="mt-6 space-y-1">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="block px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800"
          active-class="bg-brand-700 text-white font-medium"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-14 border-b border-slate-800 flex items-center justify-between px-6">
        <h1 class="text-sm font-medium text-slate-300">Administración global</h1>

        <div v-if="auth.user" class="flex items-center gap-4">
          <div class="hidden sm:block text-right">
            <div class="text-sm font-medium text-slate-100">{{ auth.user.email }}</div>
            <div class="text-xs text-slate-400">Super admin</div>
          </div>
          <button
            type="button"
            class="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            @click="onLogout"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
