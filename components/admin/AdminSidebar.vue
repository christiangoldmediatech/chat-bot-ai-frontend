<script setup lang="ts">
const links = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/company', label: 'Mi empresa' },
  { to: '/admin/bots', label: 'Bots' },
  { to: '/admin/conversations', label: 'Conversaciones' },
  { to: '/admin/customers', label: 'Clientes' },
]
</script>

<template>
  <aside class="w-64 bg-white border-r border-slate-200 p-4 hidden md:block">
    <div class="text-lg font-semibold mb-6">Chat Bot AI</div>
    <nav class="space-y-1">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="block px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100"
        active-class="bg-brand-50 text-brand-700 font-medium"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>
