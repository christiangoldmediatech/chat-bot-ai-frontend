<script setup lang="ts">
type IconName =
  | 'dashboard'
  | 'conversations'
  | 'customers'
  | 'leads'
  | 'cases'
  | 'calendar'
  | 'sales'
  | 'services'
  | 'schedule'
  | 'bots'
  | 'company'
  | 'profile'

interface NavLink {
  to: string
  label: string
  icon: IconName
}

interface NavGroup {
  key: string
  label: string
  links: NavLink[]
}

const { t } = useI18n()

const groups = computed<NavGroup[]>(() => [
  {
    key: 'operations',
    label: t('nav.group.operations'),
    links: [
      { to: '/admin', label: t('nav.dashboard'), icon: 'dashboard' },
      { to: '/admin/conversations', label: t('nav.conversations'), icon: 'conversations' },
      { to: '/admin/customers', label: t('nav.customers'), icon: 'customers' },
      { to: '/admin/leads', label: t('nav.leads'), icon: 'leads' },
      { to: '/admin/cases', label: t('nav.cases'), icon: 'cases' },
      { to: '/admin/calendar', label: t('nav.calendar'), icon: 'calendar' },
      { to: '/admin/sales', label: t('nav.sales'), icon: 'sales' },
    ],
  },
  {
    key: 'catalog',
    label: t('nav.group.catalog'),
    links: [
      { to: '/admin/services', label: t('nav.services'), icon: 'services' },
      { to: '/admin/schedule', label: t('nav.schedule'), icon: 'schedule' },
    ],
  },
  {
    key: 'settings',
    label: t('nav.group.settings'),
    links: [
      { to: '/admin/bots', label: t('nav.bots'), icon: 'bots' },
      { to: '/admin/company', label: t('nav.myCompany'), icon: 'company' },
      { to: '/admin/profile', label: t('nav.myProfile'), icon: 'profile' },
    ],
  },
])

const drawer = useNavDrawer()
const route = useRoute()

watch(() => route.fullPath, () => drawer.close())

watch(drawer.open, (isOpen) => {
  if (!import.meta.client) return
  document.body.style.overflow = isOpen ? 'hidden' : ''
})
onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

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
    class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-ink-deep/90 backdrop-blur-xl border-r border-halo-line/30 p-4 transform transition-transform duration-200 ease-out md:static md:translate-x-0 md:w-64 md:max-w-none md:bg-ink-deep/70 md:z-0 overflow-y-auto"
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

    <nav class="space-y-5">
      <div v-for="group in groups" :key="group.key" class="space-y-1">
        <p class="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-mist-dim">
          {{ group.label }}
        </p>
        <NuxtLink
          v-for="link in group.links"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-mist hover:bg-ink-card/60 hover:text-pearl transition-colors"
          active-class="!bg-brand-gradient !text-ink-tealDeep font-medium shadow-halo-glow"
        >
          <AdminSidebarIcon :name="link.icon" />
          <span class="truncate">{{ link.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </aside>
</template>
