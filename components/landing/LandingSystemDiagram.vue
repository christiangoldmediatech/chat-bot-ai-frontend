<script setup lang="ts">
const lanes = [
  { id: 'reply', labelKey: 'landing.system.lanes.reply.label', descKey: 'landing.system.lanes.reply.desc' },
  { id: 'agenda', labelKey: 'landing.system.lanes.agenda.label', descKey: 'landing.system.lanes.agenda.desc' },
  { id: 'handoff', labelKey: 'landing.system.lanes.handoff.label', descKey: 'landing.system.lanes.handoff.desc' },
]

const sectionEl = ref<HTMLElement | null>(null)
const { observeSection } = useShiftState()
observeSection(sectionEl, 'sistema')
</script>

<template>
  <section
    id="sistema"
    ref="sectionEl"
    class="sd-wrap relative py-[clamp(90px,13vh,170px)]"
    aria-labelledby="sd-title"
  >
    <div class="mx-auto w-full max-w-[1280px] px-[clamp(20px,4vw,52px)]">
      <div v-reveal class="lurviax-rv mb-[clamp(44px,6vw,72px)] text-center">
        <p class="sd-eyebrow">
          <span class="sd-eyebrow__line" />
          {{ $t('landing.sectionNum.sistema') }}
          <span class="sd-eyebrow__line" />
        </p>
        <h2 id="sd-title" class="lurviax-h2-breathe sd-title">
          {{ $t('landing.system.titleA') }}
          <em class="sd-title__em">{{ $t('landing.system.titleEm') }}</em>
          {{ $t('landing.system.titleB') }}
        </h2>
      </div>

      <div v-reveal="140" class="lurviax-rv sd-stage">
        <svg class="sd-svg" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <linearGradient id="sdLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stop-color="#5BE9EC" stop-opacity="0.15" />
              <stop offset="50%" stop-color="#5BE9EC" stop-opacity="0.85" />
              <stop offset="100%" stop-color="#5BE9EC" stop-opacity="0.15" />
            </linearGradient>
            <radialGradient id="sdCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#5BE9EC" stop-opacity="0.85" />
              <stop offset="55%" stop-color="#077DDC" stop-opacity="0.65" />
              <stop offset="100%" stop-color="#01142A" stop-opacity="0.95" />
            </radialGradient>
            <filter id="sdGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path d="M 180 210 Q 350 210 480 210" class="sd-wire" stroke="url(#sdLine)" fill="none" />
          <path d="M 180 210 Q 350 210 480 210" class="sd-wire-trace" fill="none" />

          <path d="M 720 210 Q 860 150 980 110" class="sd-wire" stroke="url(#sdLine)" fill="none" />
          <path d="M 720 210 Q 870 210 980 210" class="sd-wire" stroke="url(#sdLine)" fill="none" />
          <path d="M 720 210 Q 860 270 980 310" class="sd-wire" stroke="url(#sdLine)" fill="none" />

          <path d="M 720 210 Q 860 150 980 110" class="sd-wire-trace sd-wire-trace--lane1" fill="none" />
          <path d="M 720 210 Q 870 210 980 210" class="sd-wire-trace sd-wire-trace--lane2" fill="none" />
          <path d="M 720 210 Q 860 270 980 310" class="sd-wire-trace sd-wire-trace--lane3" fill="none" />

          <circle cx="600" cy="210" r="90" fill="url(#sdCore)" class="sd-core-ring" />
          <circle cx="600" cy="210" r="90" fill="none" stroke="#5BE9EC" stroke-width="0.5" stroke-opacity="0.6" />
          <circle cx="600" cy="210" r="110" fill="none" stroke="#5BE9EC" stroke-width="0.5" stroke-opacity="0.3" class="sd-core-pulse" />
          <circle cx="600" cy="210" r="140" fill="none" stroke="#5BE9EC" stroke-width="0.5" stroke-opacity="0.15" class="sd-core-pulse sd-core-pulse--2" />
        </svg>

        <div class="sd-node sd-node--source">
          <div class="sd-node__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
          </div>
          <div class="sd-node__label">{{ $t('landing.system.source.label') }}</div>
          <div class="sd-node__sub">{{ $t('landing.system.source.sub') }}</div>
        </div>

        <div class="sd-core-label">
          <div class="sd-core-label__name">LURVIAX</div>
          <div class="sd-core-label__sub">{{ $t('landing.system.coreSub') }}</div>
        </div>

        <div class="sd-lanes">
          <div
            v-for="(lane, i) in lanes"
            :key="lane.id"
            class="sd-lane"
            :class="`sd-lane--${i + 1}`"
          >
            <div class="sd-lane__label">{{ $t(lane.labelKey) }}</div>
            <div class="sd-lane__desc">{{ $t(lane.descKey) }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sd-wrap {
  isolation: isolate;
}

.sd-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.705rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(91, 233, 236, 0.75);
}
.sd-eyebrow__line {
  display: inline-block;
  width: 32px;
  height: 1px;
  background: rgba(91, 233, 236, 0.75);
  transition: width 0.7s cubic-bezier(0.23, 1, 0.32, 1);
}
.lurviax-rv.reveal-in .sd-eyebrow__line { width: 68px; }

.sd-title {
  margin-top: 18px;
  font-family: Archivo, 'Chivo', ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 108, 'wght' 500;
  font-size: clamp(2rem, 4.6vw, 3.4rem);
  line-height: 1.08;
  letter-spacing: -0.015em;
  color: #ffffff;
  max-width: 24ch;
  margin-inline: auto;
}
.sd-title__em {
  font-style: normal;
  font-variation-settings: 'wdth' 108, 'wght' 620;
  color: #5BE9EC;
  margin: 0 0.18em;
}

.sd-stage {
  position: relative;
  aspect-ratio: 1200 / 420;
  width: 100%;
  min-height: 300px;
  max-height: 460px;
}
.sd-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.sd-wire {
  stroke-width: 1.2;
  stroke-linecap: round;
}
.sd-wire-trace {
  stroke: #5BE9EC;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 18 220;
  filter: url(#sdGlow);
  animation: sd-trace 4.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
.sd-wire-trace--lane1 { animation-delay: 0.6s; }
.sd-wire-trace--lane2 { animation-delay: 1.1s; }
.sd-wire-trace--lane3 { animation-delay: 1.6s; }
@keyframes sd-trace {
  0% { stroke-dashoffset: 240; opacity: 0; }
  12% { opacity: 0.95; }
  88% { opacity: 0.95; }
  100% { stroke-dashoffset: -20; opacity: 0; }
}

.sd-core-ring {
  filter: url(#sdGlow);
  animation: sd-core-breathe 5s ease-in-out infinite;
  transform-origin: 600px 210px;
  transform-box: fill-box;
}
@keyframes sd-core-breathe {
  0%, 100% { transform: scale(1); filter: url(#sdGlow); }
  50% { transform: scale(1.04); }
}
.sd-core-pulse {
  transform-origin: 600px 210px;
  transform-box: fill-box;
  animation: sd-ring 4.2s ease-out infinite;
}
.sd-core-pulse--2 { animation-delay: 1.4s; }
@keyframes sd-ring {
  0% { transform: scale(0.75); opacity: 0.6; }
  100% { transform: scale(1.4); opacity: 0; }
}

.sd-node {
  position: absolute;
  top: 50%;
  left: 2%;
  transform: translateY(-50%);
  width: clamp(130px, 14vw, 170px);
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(37, 211, 102, 0.14), rgba(1, 20, 42, 0.8));
  text-align: center;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    inset 0 0 0 0.5px rgba(37, 211, 102, 0.4),
    0 20px 48px -20px rgba(0, 0, 0, 0.65);
}
.sd-node__icon {
  width: 36px;
  height: 36px;
  margin: 0 auto 8px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #25D366;
  color: #ffffff;
  box-shadow: 0 0 20px rgba(37, 211, 102, 0.6);
}
.sd-node__icon svg { width: 18px; height: 18px; }
.sd-node__label {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #ffffff;
}
.sd-node__sub {
  margin-top: 4px;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.55);
}

.sd-core-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}
.sd-core-label__name {
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 100, 'wght' 400;
  font-size: clamp(1.1rem, 1.6vw, 1.5rem);
  letter-spacing: 0.22em;
  color: #ffffff;
  text-shadow: 0 0 20px rgba(91, 233, 236, 0.4);
}
.sd-core-label__sub {
  margin-top: 6px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.66rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.sd-lanes {
  position: absolute;
  top: 0;
  right: 0;
  width: 22%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8% 0;
}
.sd-lane {
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(91, 233, 236, 0.06), rgba(1, 20, 42, 0.78));
  box-shadow:
    inset 0 0 0 0.5px rgba(91, 233, 236, 0.25),
    0 16px 40px -20px rgba(0, 0, 0, 0.6);
}
.sd-lane__label {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5BE9EC;
}
.sd-lane__desc {
  margin-top: 4px;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.35;
}

@media (max-width: 900px) {
  .sd-stage {
    aspect-ratio: auto;
    min-height: 0;
    max-height: none;
  }
  .sd-svg { display: none; }
  .sd-node,
  .sd-core-label {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    transform: none;
    margin: 0 auto 20px;
  }
  .sd-node { width: 100%; max-width: 280px; }
  .sd-core-label {
    padding: 28px 20px;
    border-radius: 16px;
    background: radial-gradient(circle, rgba(91, 233, 236, 0.3), rgba(1, 20, 42, 0.85));
    box-shadow: inset 0 0 0 0.5px rgba(91, 233, 236, 0.4);
    max-width: 280px;
  }
  .sd-lanes {
    position: relative;
    right: auto;
    width: 100%;
    padding: 0;
    gap: 10px;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sd-wire-trace,
  .sd-core-ring,
  .sd-core-pulse {
    animation: none;
  }
  .sd-core-pulse { opacity: 0; }
}
</style>
