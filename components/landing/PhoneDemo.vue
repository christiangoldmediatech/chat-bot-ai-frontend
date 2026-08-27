<script setup lang="ts">
// Demo interactiva del landing (dark commit). Cuatro canales (WhatsApp,
// web, voz, IG) con un thread pregrabado por canal — al elegir un tab, se
// reproduce la conversación con timing realista (indicador de "escribiendo"
// para ALIA, entradas rápidas del cliente, chips de sistema para acciones).
// Todos los strings viven en i18n bajo `landing.demo.*`.

interface Msg {
  s: 'them' | 'alia' | 'sys'
  t: string
  m?: string
}

interface Script {
  labelKey: string
  hintKey: string
  msgs: Array<{
    s: 'them' | 'alia' | 'sys'
    tKey: string
    mKey?: string
  }>
}

const { t } = useI18n()

const SCRIPTS: Record<string, Script> = {
  wa: {
    labelKey: 'landing.demo.channels.wa.label',
    hintKey: 'landing.demo.channels.wa.hint',
    msgs: [
      { s: 'them', tKey: 'landing.demo.channels.wa.m1' },
      { s: 'alia', tKey: 'landing.demo.channels.wa.m2', mKey: 'landing.demo.channels.wa.m2meta' },
      { s: 'them', tKey: 'landing.demo.channels.wa.m3' },
      { s: 'alia', tKey: 'landing.demo.channels.wa.m4' },
      { s: 'them', tKey: 'landing.demo.channels.wa.m5' },
      { s: 'sys', tKey: 'landing.demo.channels.wa.m6' },
      { s: 'alia', tKey: 'landing.demo.channels.wa.m7' },
      { s: 'them', tKey: 'landing.demo.channels.wa.m8' },
      { s: 'sys', tKey: 'landing.demo.channels.wa.m9' },
      { s: 'alia', tKey: 'landing.demo.channels.wa.m10' },
    ],
  },
  web: {
    labelKey: 'landing.demo.channels.web.label',
    hintKey: 'landing.demo.channels.web.hint',
    msgs: [
      { s: 'them', tKey: 'landing.demo.channels.web.m1' },
      { s: 'alia', tKey: 'landing.demo.channels.web.m2' },
      { s: 'them', tKey: 'landing.demo.channels.web.m3' },
      { s: 'alia', tKey: 'landing.demo.channels.web.m4' },
      { s: 'sys', tKey: 'landing.demo.channels.web.m5' },
      { s: 'alia', tKey: 'landing.demo.channels.web.m6' },
      { s: 'them', tKey: 'landing.demo.channels.web.m7' },
      { s: 'alia', tKey: 'landing.demo.channels.web.m8' },
    ],
  },
  voz: {
    labelKey: 'landing.demo.channels.voz.label',
    hintKey: 'landing.demo.channels.voz.hint',
    msgs: [
      { s: 'sys', tKey: 'landing.demo.channels.voz.m1' },
      { s: 'alia', tKey: 'landing.demo.channels.voz.m2', mKey: 'landing.demo.channels.voz.m2meta' },
      { s: 'them', tKey: 'landing.demo.channels.voz.m3' },
      { s: 'alia', tKey: 'landing.demo.channels.voz.m4' },
      { s: 'them', tKey: 'landing.demo.channels.voz.m5' },
      { s: 'alia', tKey: 'landing.demo.channels.voz.m6' },
      { s: 'them', tKey: 'landing.demo.channels.voz.m7' },
      { s: 'sys', tKey: 'landing.demo.channels.voz.m8' },
      { s: 'alia', tKey: 'landing.demo.channels.voz.m9' },
    ],
  },
  ig: {
    labelKey: 'landing.demo.channels.ig.label',
    hintKey: 'landing.demo.channels.ig.hint',
    msgs: [
      { s: 'sys', tKey: 'landing.demo.channels.ig.m1' },
      { s: 'alia', tKey: 'landing.demo.channels.ig.m2' },
      { s: 'them', tKey: 'landing.demo.channels.ig.m3' },
      { s: 'alia', tKey: 'landing.demo.channels.ig.m4' },
      { s: 'them', tKey: 'landing.demo.channels.ig.m5' },
      { s: 'sys', tKey: 'landing.demo.channels.ig.m6' },
      { s: 'alia', tKey: 'landing.demo.channels.ig.m7' },
    ],
  },
}

const CHANNELS = ['wa', 'web', 'voz', 'ig'] as const
type Channel = typeof CHANNELS[number]

const current = ref<Channel>('wa')
const rendered = ref<Msg[]>([])
const typing = ref(false)
const threadEl = ref<HTMLDivElement | null>(null)
const phoneEl = ref<HTMLDivElement | null>(null)
const started = ref(false)
const reducedMotion = ref(false)
let timers: number[] = []

function clearTimers() {
  timers.forEach(id => clearTimeout(id))
  timers = []
}

async function scrollToBottom() {
  await nextTick()
  if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
}

function play(channel: Channel) {
  clearTimers()
  current.value = channel
  rendered.value = []
  typing.value = false
  const data = SCRIPTS[channel]!

  if (reducedMotion.value) {
    // Vuelca el thread completo sin animación.
    rendered.value = data.msgs.map(msg => ({
      s: msg.s,
      t: t(msg.tKey),
      m: msg.mKey ? t(msg.mKey) : undefined,
    }))
    scrollToBottom()
    return
  }

  let delay = 320
  data.msgs.forEach((msg) => {
    const think = msg.s === 'alia' ? 620 : msg.s === 'sys' ? 260 : 520
    const text = t(msg.tKey)
    const read = Math.min(text.length * 21, 1900)

    if (msg.s === 'alia') {
      // ALIA: primero aparece el indicador de "escribiendo", luego el mensaje.
      timers.push(window.setTimeout(() => {
        typing.value = true
        scrollToBottom()
        timers.push(window.setTimeout(() => {
          typing.value = false
          rendered.value = [...rendered.value, {
            s: 'alia',
            t: text,
            m: msg.mKey ? t(msg.mKey) : undefined,
          }]
          scrollToBottom()
        }, think))
      }, delay))
      delay += think + read
    }
    else {
      // Cliente o sistema: entra directo, sin typing.
      timers.push(window.setTimeout(() => {
        rendered.value = [...rendered.value, {
          s: msg.s,
          t: text,
          m: msg.mKey ? t(msg.mKey) : undefined,
        }]
        scrollToBottom()
      }, delay))
      delay += think + read * 0.7
    }
  })
}

function replay() {
  play(current.value)
}

const channelLabel = computed(() => t(SCRIPTS[current.value]!.labelKey))
const channelHint = computed(() => t(SCRIPTS[current.value]!.hintKey))

let io: IntersectionObserver | null = null

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Arranca la primera vez que el phone entra en pantalla.
  if (phoneEl.value) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.value) {
          started.value = true
          play('wa')
        }
      })
    }, { threshold: 0.3 })
    io.observe(phoneEl.value)
  }
})

onBeforeUnmount(() => {
  clearTimers()
  io?.disconnect()
})
</script>

<template>
  <div class="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-16">
    <!-- Tabs de canal -->
    <div>
      <p class="font-mono text-[0.705rem] uppercase tracking-[0.16em] text-mist-dim">
        {{ $t('landing.demo.channelsLabel') }}
      </p>
      <div class="mt-6 flex flex-col" role="tablist" :aria-label="$t('landing.demo.channelsAria')">
        <button
          v-for="(ch, i) in CHANNELS"
          :key="ch"
          role="tab"
          type="button"
          :aria-selected="current === ch"
          class="group flex w-full items-center gap-4 border-t border-line-soft px-4 py-4 text-left text-sm text-mist transition-all duration-300 hover:pl-6 hover:text-pearl"
          :class="[
            current === ch
              ? 'pl-6 text-pearl bg-gradient-to-r from-halo-wash to-transparent'
              : '',
            i === CHANNELS.length - 1 ? 'border-b border-line-soft' : '',
          ]"
          @click="play(ch)"
        >
          <span
            class="font-mono text-[0.705rem] tracking-[0.1em]"
            :class="current === ch ? 'text-halo' : 'text-mist-dim'"
          >{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="font-normal">{{ $t(SCRIPTS[ch].labelKey) }}</span>
          <span class="ml-auto font-mono text-[0.705rem] tracking-[0.08em] text-mist-dim">
            {{ $t(`landing.demo.channels.${ch}.tag`) }}
          </span>
        </button>
      </div>
      <p class="mt-6 max-w-[62ch] text-sm text-mist">
        {{ $t('landing.demo.channelsCopy') }}
      </p>
    </div>

    <!-- Phone frame + thread -->
    <div
      ref="phoneEl"
      class="alia-phone-border relative rounded-[26px] border border-line bg-chrome-card p-3.5 shadow-phone"
    >
      <!-- Bar superior -->
      <div class="flex items-center gap-3 border-b border-line-soft px-2 pt-1.5 pb-3.5">
        <div
          class="size-[34px] shrink-0 rounded-full shadow-[0_0_18px_-2px_rgba(88,240,206,0.6)]"
          style="background: radial-gradient(circle at 32% 28%, #58F0CE 0%, #2FB99B 38%, #12554A 100%);"
          aria-hidden="true"
        />
        <div class="leading-tight">
          <b class="font-display text-[0.92rem] font-medium tracking-[0.04em]" style="font-variation-settings: 'wdth' 108, 'wght' 560;">ALIA</b>
          <span class="block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-halo-dim">{{ channelLabel }}</span>
        </div>
        <div class="ml-auto flex h-4 items-end gap-0.5" aria-hidden="true">
          <i class="w-0.5 rounded-sm bg-halo-dim animate-eq" style="height:30%;" />
          <i class="w-0.5 rounded-sm bg-halo-dim animate-eq" style="height:30%; animation-delay: 0.14s;" />
          <i class="w-0.5 rounded-sm bg-halo-dim animate-eq" style="height:30%; animation-delay: 0.28s;" />
          <i class="w-0.5 rounded-sm bg-halo-dim animate-eq" style="height:30%; animation-delay: 0.42s;" />
        </div>
      </div>

      <!-- Thread — altura fija con scroll interno para que el phone frame
           no crezca a medida que llegan mensajes. Los mensajes viejos se
           quedan arriba y el thread hace autoscroll al fondo con cada msg. -->
      <div
        ref="threadEl"
        class="flex h-[360px] flex-col justify-end gap-2.5 overflow-y-auto px-1.5 pt-4.5 pb-1.5"
        aria-live="polite"
      >
        <template v-for="(msg, i) in rendered" :key="`msg-${i}`">
          <!-- Cliente (them) -->
          <div
            v-if="msg.s === 'them'"
            class="max-w-[84%] self-start rounded-2xl rounded-bl-[5px] border border-line-soft bg-pearl/[0.06] px-4 py-2.5 text-[0.935rem] leading-relaxed text-pearl animate-pop"
          >
            {{ msg.t }}
            <span v-if="msg.m" class="mt-1.5 block font-mono text-[0.6rem] tracking-[0.1em] text-mist-dim">{{ msg.m }}</span>
          </div>
          <!-- ALIA -->
          <div
            v-else-if="msg.s === 'alia'"
            class="max-w-[84%] self-end rounded-2xl rounded-br-[5px] border border-halo-line px-4 py-2.5 text-[0.935rem] leading-relaxed text-pearl animate-pop"
            style="background: linear-gradient(140deg, rgba(88,240,206,.20), rgba(18,85,74,.42));"
          >
            {{ msg.t }}
            <span v-if="msg.m" class="mt-1.5 block font-mono text-[0.6rem] tracking-[0.1em] text-mist-dim">{{ msg.m }}</span>
          </div>
          <!-- Sistema -->
          <div
            v-else
            class="self-center rounded-full border border-dashed border-line px-3.5 py-1.5 text-center font-mono text-[0.68rem] uppercase tracking-[0.12em] text-halo-dim animate-pop"
          >
            {{ msg.t }}
          </div>
        </template>
        <!-- Typing indicator -->
        <div
          v-if="typing"
          class="max-w-[84%] self-end rounded-2xl rounded-br-[5px] border border-halo-line px-4 py-2.5 animate-pop"
          style="background: linear-gradient(140deg, rgba(88,240,206,.20), rgba(18,85,74,.42));"
        >
          <span class="inline-flex h-[1.2em] items-center gap-1">
            <i class="size-1.5 rounded-full bg-mist animate-blip" />
            <i class="size-1.5 rounded-full bg-mist animate-blip" style="animation-delay: 0.18s;" />
            <i class="size-1.5 rounded-full bg-mist animate-blip" style="animation-delay: 0.36s;" />
          </span>
        </div>
      </div>

      <!-- Foot -->
      <div class="mt-3 flex items-center gap-2.5 rounded-full border border-line-soft px-3.5 py-2.5 text-[0.85rem] text-mist-dim">
        <span>{{ channelHint }}</span>
        <button
          type="button"
          class="ml-auto inline-flex items-center gap-1.5 rounded-full border border-halo-line bg-ink-card/55 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-pearl backdrop-blur-sm transition hover:border-halo hover:bg-ink-tealMid/55"
          @click="replay"
        >
          {{ $t('landing.demo.replay') }}
        </button>
      </div>
    </div>
  </div>
</template>
