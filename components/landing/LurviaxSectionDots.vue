<script setup lang="ts">
// Vertical carousel pagination dots — columna fija a la derecha que refleja
// qué sección del landing está visible y permite navegar con click.
//
// Cada dot es un botón accesible con label (aparece al hover / focus). El
// dot activo se convierte en una línea vertical corta pintada con el accent
// cian (visualmente ancla la posición del scroll). Un IntersectionObserver
// detecta cuál sección ocupa la mayor porción del viewport.
//
// La lista de secciones es una prop opcional; si no se pasa, usa el default
// que mapea el landing actual. Cada item apunta a un id existente en el DOM.

interface Section {
  id: string
  labelKey: string
}

interface Props {
  sections?: Section[]
}

const props = withDefaults(defineProps<Props>(), {
  sections: () => [
    { id: 'splash', labelKey: 'landing.dots.splash' },
    { id: 'hero', labelKey: 'landing.dots.hero' },
    { id: 'demo', labelKey: 'landing.dots.demo' },
    { id: 'capacidades', labelKey: 'landing.dots.capacidades' },
    { id: 'proceso', labelKey: 'landing.dots.proceso' },
    { id: 'resultados', labelKey: 'landing.dots.resultados' },
    { id: 'planes', labelKey: 'landing.dots.planes' },
    { id: 'cierre', labelKey: 'landing.dots.cierre' },
  ],
})

const { t } = useI18n()
const activeId = ref<string>(props.sections[0]?.id ?? '')

let observer: IntersectionObserver | null = null
const visibility = new Map<string, number>()

function pickMostVisible() {
  let bestId = ''
  let bestRatio = -1
  for (const [id, ratio] of visibility) {
    if (ratio > bestRatio) {
      bestRatio = ratio
      bestId = id
    }
  }
  if (bestId && bestRatio > 0) activeId.value = bestId
}

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  activeId.value = id
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        visibility.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
      }
      pickMostVisible()
    },
    // Múltiples umbrales para capturar cambios finos de visibilidad.
    { threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9, 1] },
  )
  for (const s of props.sections) {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <!-- Fixed rail vertical. Oculto en mobile (poco valor con pantallas cortas)
       y en usuarios con reduce-motion agresivo (respeta prefer). -->
  <nav
    class="lx-dots pointer-events-none fixed right-[clamp(12px,2vw,28px)] top-1/2 z-40 hidden -translate-y-1/2 md:block"
    :aria-label="t('landing.dots.aria')"
  >
    <ul class="pointer-events-auto flex flex-col items-end gap-4">
      <li v-for="s in sections" :key="s.id">
        <button
          type="button"
          class="lx-dot group relative flex items-center gap-3 outline-none"
          :aria-label="t(s.labelKey)"
          :aria-current="activeId === s.id ? 'true' : undefined"
          @click="scrollTo(s.id)"
        >
          <!-- Label (aparece al hover / focus). -->
          <span
            class="lx-label pointer-events-none whitespace-nowrap rounded-full border border-halo-line bg-ink-card/70 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-pearl opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            {{ t(s.labelKey) }}
          </span>
          <!-- Dot / línea activa. -->
          <span
            class="lx-mark shrink-0 rounded-full transition-all duration-300"
            :class="activeId === s.id
              ? 'h-6 w-[3px] bg-halo shadow-halo-glow'
              : 'h-1.5 w-1.5 bg-mist/50 group-hover:bg-pearl group-focus-visible:bg-pearl'"
            aria-hidden="true"
          />
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.lx-dot:focus-visible .lx-mark {
  outline: 2px solid #5be9ec;
  outline-offset: 3px;
}
/* Suave slide-in del label desde la derecha al aparecer. */
.lx-label {
  transform: translateX(6px);
}
.lx-dot:hover .lx-label,
.lx-dot:focus-visible .lx-label {
  transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  .lx-mark, .lx-label { transition: none; }
}
</style>
