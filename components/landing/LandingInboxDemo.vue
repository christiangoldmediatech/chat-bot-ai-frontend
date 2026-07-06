<script setup lang="ts">
/**
 * Escena animada "bandeja desbordada → Kaibot responde a todos".
 *
 * Máquina de estados con timeouts (mismo patrón que el chat del hero):
 * los 4 chats entran uno a uno con badge de pendiente, aparece el pill de
 * Kaibot y cada fila pasa a "respondido" en cascada; cierra con el resumen
 * y reinicia. Arranca la primera vez que la tarjeta entra al viewport.
 * Con prefers-reduced-motion se muestra el estado final estático.
 */
const { t } = useI18n()

const ROWS = [
  { name: 'Ana', time: '10:02', avatar: 'bg-primary-100 text-primary-700' },
  { name: 'Luis', time: '10:03', avatar: 'bg-success-100 text-success-700' },
  { name: 'María', time: '10:04', avatar: 'bg-slate-200 text-slate-700' },
  { name: 'Carlos', time: '10:05', avatar: 'bg-primary-100 text-primary-700' },
] as const

// stage 1-4: entra cada chat · 5: pill de Kaibot · 6-9: se resuelve cada
// chat · 10: resumen final.
const STEPS: Array<{ stage: number, at: number }> = [
  { stage: 1, at: 400 },
  { stage: 2, at: 950 },
  { stage: 3, at: 1500 },
  { stage: 4, at: 2050 },
  { stage: 5, at: 3100 },
  { stage: 6, at: 3900 },
  { stage: 7, at: 4350 },
  { stage: 8, at: 4800 },
  { stage: 9, at: 5250 },
  { stage: 10, at: 6100 },
]
const LOOP_AT = 10800
const FINAL_STAGE = 10

const stage = ref(0)
const rootEl = ref<HTMLElement | null>(null)
let timers: number[] = []
let observer: IntersectionObserver | null = null

const visibleRows = computed(() => Math.min(stage.value, ROWS.length))
const resolvedRows = computed(() => Math.max(0, Math.min(stage.value - 5, ROWS.length)))
const pendingCount = computed(() => visibleRows.value - resolvedRows.value)

function clearTimers() {
  timers.forEach(id => window.clearTimeout(id))
  timers = []
}

function runLoop() {
  clearTimers()
  stage.value = 0
  for (const step of STEPS) {
    timers.push(window.setTimeout(() => {
      stage.value = step.stage
    }, step.at))
  }
  timers.push(window.setTimeout(runLoop, LOOP_AT))
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stage.value = FINAL_STAGE
    return
  }
  observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) {
      runLoop()
      observer?.disconnect()
      observer = null
    }
  }, { threshold: 0.35 })
  observer.observe(rootEl.value!)
})

onBeforeUnmount(() => {
  clearTimers()
  observer?.disconnect()
})
</script>

<template>
  <div
    ref="rootEl"
    aria-hidden="true"
    class="float-y rounded-3xl bg-white/80 p-5 ring-1 ring-white/60 shadow-glass-lg backdrop-blur-xl sm:p-6"
  >
    <!-- Header de la bandeja -->
    <div class="flex items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
      <div class="flex min-w-0 items-center gap-2.5">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </span>
        <p class="truncate text-sm font-semibold text-slate-900">{{ t('landing.inbox.panelTitle') }}</p>
      </div>

      <span
        v-if="pendingCount > 0"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
      >
        <span class="size-1.5 rounded-full bg-amber-500 animate-pulse" />
        {{ t('landing.inbox.pendingCount', pendingCount) }}
      </span>
      <span
        v-else-if="stage >= FINAL_STAGE"
        class="chat-pop inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-100 px-2.5 py-1 text-xs font-semibold text-success-700"
      >
        <svg class="size-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {{ t('landing.inbox.allCaught') }}
      </span>
    </div>

    <!-- Filas de conversaciones — min-h evita saltos mientras entran. -->
    <ul class="mt-4 min-h-[16.5rem] space-y-2.5">
      <template v-for="(row, i) in ROWS" :key="row.name">
        <li
          v-if="i < visibleRows"
          class="chat-pop flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 transition-colors duration-500"
          :class="i < resolvedRows
            ? 'bg-success-50/80 ring-success-200/70'
            : 'bg-white/70 ring-slate-200/60'"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            :class="row.avatar"
          >
            {{ row.name.charAt(0) }}
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <p class="truncate text-sm font-semibold text-slate-900">{{ row.name }}</p>
              <span class="shrink-0 text-[11px] text-slate-400">{{ row.time }}</span>
            </div>
            <p v-if="i >= resolvedRows" class="truncate text-xs text-slate-500">
              {{ t(`landing.inbox.msg${i + 1}`) }}
            </p>
            <p v-else class="chat-pop flex items-center gap-1 truncate text-xs font-medium text-success-700">
              <!-- Doble check estilo WhatsApp -->
              <svg class="size-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2 13l4 4L14 9m4-2l-6.5 8" />
              </svg>
              {{ t('landing.inbox.replied') }}
            </p>
          </div>

          <span
            v-if="i >= resolvedRows"
            class="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white"
          >
            1
          </span>
          <span
            v-else
            class="chat-pop inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success-500 text-white"
          >
            <svg class="size-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        </li>
      </template>
    </ul>

    <!-- Pill de Kaibot: entra en acción → resumen. Altura fija para no
         desplazar el layout cuando aparece. -->
    <div class="mt-4 flex h-10 items-center justify-center">
      <div
        v-if="stage >= 5"
        class="chat-pop inline-flex max-w-full items-center gap-2 rounded-full bg-slate-900 px-4 py-2 shadow-glass"
      >
        <KaibotLogo :size="20" rounded="rounded-full" class="shrink-0 bg-white" />
        <span class="truncate text-xs font-semibold text-white">
          {{ stage >= FINAL_STAGE ? t('landing.inbox.summary') : t('landing.inbox.botActive') }}
        </span>
      </div>
    </div>
  </div>
</template>
