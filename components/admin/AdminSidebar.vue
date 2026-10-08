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

type GroupKey = 'operations' | 'catalog' | 'settings'

interface NavLink {
  to: string
  label: string
  icon: IconName
}

interface NavGroup {
  key: GroupKey
  label: string
  accent: {
    dot: string
    text: string
    hoverIcon: string
  }
  links: NavLink[]
}

const { t } = useI18n()

const groups = computed<NavGroup[]>(() => [
  {
    key: 'operations',
    label: t('nav.group.operations'),
    accent: {
      dot: 'bg-emerald-400',
      text: 'text-emerald-300/80',
      hoverIcon: 'group-hover/item:text-emerald-300',
    },
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
    accent: {
      dot: 'bg-amber-400',
      text: 'text-amber-300/80',
      hoverIcon: 'group-hover/item:text-amber-300',
    },
    links: [
      { to: '/admin/services', label: t('nav.services'), icon: 'services' },
      { to: '/admin/schedule', label: t('nav.schedule'), icon: 'schedule' },
    ],
  },
  {
    key: 'settings',
    label: t('nav.group.settings'),
    accent: {
      dot: 'bg-sky-400',
      text: 'text-sky-300/80',
      hoverIcon: 'group-hover/item:text-sky-300',
    },
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
    class="admin-sidebar fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] backdrop-blur-xl border-r border-halo-line/30 p-4 transform transition-transform duration-200 ease-out md:static md:translate-x-0 md:w-64 md:max-w-none md:z-0 overflow-y-auto"
    :class="drawer.open.value ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:shadow-none'"
    role="navigation"
    aria-label="Main navigation"
  >
    <div class="flex items-center justify-between gap-2 mb-7 px-1">
      <NuxtLink to="/admin" class="flex items-center gap-2 group" aria-label="LURVIAX dashboard">
        <LurviaxLogo :size="36" rounded="rounded-xl" class="bg-white ring-1 ring-white/70 shadow-sm transition-transform group-hover:scale-105" />
        <span class="text-base font-semibold text-pearl tracking-tight">LURVIAX</span>
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

    <nav class="space-y-6">
      <div v-for="group in groups" :key="group.key" class="space-y-1">
        <!-- Group header: tiny colored dot + uppercase label + hairline on
             the far right that fades toward transparent for a soft separator -->
        <div class="flex items-center gap-2 px-2 pb-2">
          <span class="size-1.5 rounded-full shadow-sm" :class="group.accent.dot" aria-hidden="true" />
          <span class="text-[10px] font-semibold uppercase tracking-[0.12em]" :class="group.accent.text">
            {{ group.label }}
          </span>
          <span class="flex-1 h-px bg-gradient-to-r from-halo-line/40 to-transparent" aria-hidden="true" />
        </div>

        <NuxtLink
          v-for="link in group.links"
          :key="link.to"
          :to="link.to"
          class="group/item relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg text-sm text-mist hover:text-pearl hover:bg-white/5 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-highlight/60"
          active-class="sidebar-link-active"
        >
          <!-- Left-edge indicator: visible only on active, slides in from left -->
          <span
            class="sidebar-link-indicator absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-brand-highlight opacity-0 scale-y-0 transition-all duration-200 ease-out"
            aria-hidden="true"
          />
          <!-- Icon: naked SVG with explicit color, scales up on hover -->
          <span
            class="sidebar-link-icon flex shrink-0 text-mist transition-all duration-200 ease-out group-hover/item:scale-110"
            :class="group.accent.hoverIcon"
          >
            <AdminSidebarIcon :name="link.icon" />
          </span>
          <span class="truncate font-medium flex-1">{{ link.label }}</span>
          <!-- Chevron hint on hover -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="sidebar-link-chevron size-3.5 shrink-0 opacity-0 -translate-x-1 transition-all duration-200 ease-out group-hover/item:opacity-60 group-hover/item:translate-x-0"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </NuxtLink>
      </div>
    </nav>

    <!-- Soft bottom glow to anchor the sidebar visually -->
    <div
      class="pointer-events-none sticky bottom-0 -mx-4 mt-4 h-24 bg-gradient-to-t from-ink-deep/70 to-transparent"
      aria-hidden="true"
    />
  </aside>
</template>

<style scoped>
.admin-sidebar {
  background:
    radial-gradient(1200px 500px at -10% -10%, rgba(16, 185, 129, 0.08), transparent 50%),
    radial-gradient(900px 400px at 110% 10%, rgba(56, 189, 248, 0.06), transparent 55%),
    linear-gradient(180deg, rgba(2, 6, 23, 0.92), rgba(2, 6, 23, 0.84));
}

/* Active link: subtle gradient fill, bright text, left indicator bar + glow */
.sidebar-link-active {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(56, 189, 248, 0.12));
  color: rgb(241, 245, 249) !important;
  font-weight: 600;
  box-shadow:
    0 0 0 1px rgba(148, 163, 184, 0.14) inset,
    0 10px 28px -16px rgba(16, 185, 129, 0.4);
}

.sidebar-link-active .sidebar-link-icon {
  color: rgb(94, 234, 212); /* teal-300 — pops against the dark bg */
}

.sidebar-link-active .sidebar-link-indicator {
  opacity: 1;
  transform: translateY(-50%) scaleY(1);
}

.sidebar-link-active .sidebar-link-chevron {
  opacity: 0.8;
  transform: translateX(0);
  color: rgb(94, 234, 212);
}
</style>
