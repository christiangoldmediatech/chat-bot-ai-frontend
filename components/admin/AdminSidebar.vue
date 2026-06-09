<script setup lang="ts">
const links = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/company', label: 'My company' },
  { to: '/admin/bots', label: 'Bots' },
  { to: '/admin/conversations', label: 'Conversations' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/meetings', label: 'Meetings' },
  { to: '/admin/cases', label: 'Cases' },
  { to: '/admin/profile', label: 'My profile' },
]
</script>

<template>
  <aside class="w-64 bg-white/60 backdrop-blur-xl border-r border-white/60 p-4 hidden md:block">
    <div class="flex items-center gap-2 mb-8 px-2">
      <span class="inline-flex size-8 items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-bold tracking-tight">CB</span>
      <span class="text-base font-semibold text-slate-900">Chat Bot AI</span>
    </div>
    <nav class="space-y-1">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="block px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-white/80 hover:text-slate-900 transition-colors"
        active-class="!bg-slate-900 !text-white font-medium shadow-glass"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>
