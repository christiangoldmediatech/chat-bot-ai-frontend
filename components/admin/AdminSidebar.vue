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

const drawer = useNavDrawer()
const route = useRoute()

// Auto-close the mobile drawer on route change (after the user picks a link).
watch(() => route.fullPath, () => drawer.close())

// Lock body scroll while drawer is open, restore on close/unmount.
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
      class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
      aria-hidden="true"
      @click="drawer.close()"
    />
  </Transition>

  <!-- Sidebar: drawer on mobile, static column on desktop -->
  <aside
    class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white/95 backdrop-blur-xl border-r border-white/60 p-4 transform transition-transform duration-200 ease-out md:static md:translate-x-0 md:w-64 md:max-w-none md:bg-white/60 md:z-0"
    :class="drawer.open.value ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:shadow-none'"
    role="navigation"
    aria-label="Main navigation"
  >
    <div class="flex items-center justify-between gap-2 mb-6 px-2">
      <div class="flex items-center gap-2">
        <span class="inline-flex size-8 items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-bold tracking-tight">CB</span>
        <span class="text-base font-semibold text-slate-900">Chat Bot AI</span>
      </div>
      <!-- Close button only on mobile -->
      <button
        type="button"
        class="md:hidden -mr-1 flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
        aria-label="Close menu"
        @click="drawer.close()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
    <nav class="space-y-1">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="block px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-white/80 hover:text-slate-900 transition-colors"
        active-class="!bg-slate-900 !text-white font-medium shadow-glass"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>
