<script setup lang="ts">
const { t } = useI18n()
const links = computed(() => [
  { to: '/admin', label: t('nav.dashboard') },
  { to: '/admin/company', label: t('nav.myCompany') },
  { to: '/admin/bots', label: t('nav.bots') },
  { to: '/admin/conversations', label: t('nav.conversations') },
  { to: '/admin/customers', label: t('nav.customers') },
  { to: '/admin/meetings', label: t('nav.meetings') },
  { to: '/admin/cases', label: t('nav.cases') },
  { to: '/admin/leads', label: t('nav.leads') },
  { to: '/admin/profile', label: t('nav.myProfile') },
])

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
      class="fixed inset-0 z-40 bg-ink-deep/70 backdrop-blur-sm md:hidden"
      aria-hidden="true"
      @click="drawer.close()"
    />
  </Transition>

  <aside
    class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-ink-deep/90 backdrop-blur-xl border-r border-halo-line/30 p-4 transform transition-transform duration-200 ease-out md:static md:translate-x-0 md:w-64 md:max-w-none md:bg-ink-deep/70 md:z-0"
    :class="drawer.open.value ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:shadow-none'"
    role="navigation"
    aria-label="Main navigation"
  >
    <div class="flex items-center justify-between gap-2 mb-6 px-2">
      <NuxtLink to="/admin" class="flex items-center gap-2 group" aria-label="LURVIAX dashboard">
        <LurviaxLogo :size="36" rounded="rounded-xl" class="bg-white ring-1 ring-white/70 shadow-sm transition-transform group-hover:scale-105" />
        <span class="text-base font-semibold text-pearl">LURVIAX</span>
      </NuxtLink>
      <button
        type="button"
        class="md:hidden -mr-1 flex size-8 items-center justify-center rounded-lg text-mist hover:bg-ink-card/60 hover:text-pearl transition"
        :aria-label="$t('nav.closeMenu')"
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
        class="block px-3 py-2.5 rounded-xl text-sm text-mist hover:bg-ink-card/60 hover:text-pearl transition-colors"
        active-class="!bg-brand-gradient !text-ink-tealDeep font-medium shadow-halo-glow"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>
