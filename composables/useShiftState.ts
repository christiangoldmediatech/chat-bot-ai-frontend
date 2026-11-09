import type { Ref } from 'vue'

export interface ShiftStage {
  id: string
  time: string
  count: number
}

const SHIFT_STAGES: ShiftStage[] = [
  { id: 'hero', time: '08:00', count: 47 },
  { id: 'demo', time: '10:30', count: 68 },
  { id: 'sistema', time: '14:00', count: 93 },
  { id: 'capacidades', time: '18:00', count: 108 },
  { id: 'resultados', time: '22:47', count: 127 },
]

const activeStageIndex = ref(0)
const displayedCount = ref(SHIFT_STAGES[0]!.count)
const displayedTime = ref(SHIFT_STAGES[0]!.time)
let countRaf = 0
let timeRaf = 0

function animateCount(from: number, to: number) {
  cancelAnimationFrame(countRaf)
  const start = performance.now()
  const dur = 900
  const step = (now: number) => {
    const k = Math.min((now - start) / dur, 1)
    const e = 1 - (1 - k) ** 3
    displayedCount.value = Math.round(from + (to - from) * e)
    if (k < 1) countRaf = requestAnimationFrame(step)
  }
  countRaf = requestAnimationFrame(step)
}

function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number) as [number, number]
  return h * 60 + m
}

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = Math.floor(totalMinutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function animateTime(from: string, to: string) {
  cancelAnimationFrame(timeRaf)
  const start = performance.now()
  const dur = 900
  const fromMin = parseTime(from)
  const toMin = parseTime(to)
  const step = (now: number) => {
    const k = Math.min((now - start) / dur, 1)
    const e = 1 - (1 - k) ** 3
    displayedTime.value = formatTime(fromMin + (toMin - fromMin) * e)
    if (k < 1) timeRaf = requestAnimationFrame(step)
  }
  timeRaf = requestAnimationFrame(step)
}

function setStage(index: number) {
  const clamped = Math.max(0, Math.min(SHIFT_STAGES.length - 1, index))
  if (clamped === activeStageIndex.value) return
  const prev = SHIFT_STAGES[activeStageIndex.value]!
  const next = SHIFT_STAGES[clamped]!
  activeStageIndex.value = clamped
  animateCount(prev.count, next.count)
  animateTime(prev.time, next.time)
}

export function useShiftState() {
  const stages = SHIFT_STAGES
  const activeStage = computed(() => SHIFT_STAGES[activeStageIndex.value]!)

  function observeSection(el: Ref<HTMLElement | null>, stageId: string) {
    const index = SHIFT_STAGES.findIndex(s => s.id === stageId)
    if (index < 0) return

    onMounted(() => {
      const target = el.value
      if (!target) return
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
              setStage(index)
            }
          }
        },
        { threshold: [0, 0.35, 0.6, 1], rootMargin: '-20% 0px -20% 0px' },
      )
      io.observe(target)
      onBeforeUnmount(() => {
        io.disconnect()
      })
    })
  }

  return {
    stages,
    activeStage,
    activeStageIndex: computed(() => activeStageIndex.value),
    displayedCount: computed(() => displayedCount.value),
    displayedTime: computed(() => displayedTime.value),
    observeSection,
  }
}
