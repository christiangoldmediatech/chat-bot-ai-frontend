<script setup lang="ts">
interface InboxRow { name: string, msg: string, time: string, unread: number }
interface AgendaSlot { time: string, duration: number, name: string, tone: string }

const { tm, rt } = useI18n()

const chartSeries = [38, 52, 44, 67, 59, 81, 92]
const chartMax = Math.max(...chartSeries)
const chartPath = computed(() => {
  const w = 220
  const h = 60
  const stepX = w / (chartSeries.length - 1)
  return chartSeries
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * stepX).toFixed(1)} ${(h - (v / chartMax) * h).toFixed(1)}`)
    .join(' ')
})
const chartAreaPath = computed(() => {
  const w = 220
  const h = 60
  const stepX = w / (chartSeries.length - 1)
  const pts = chartSeries
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * stepX).toFixed(1)} ${(h - (v / chartMax) * h).toFixed(1)}`)
    .join(' ')
  return `${pts} L ${w} ${h} L 0 ${h} Z`
})

const chartDays = computed(() => {
  const raw = tm('landing.productGrid.cards.chart.days') as unknown
  return Array.isArray(raw) ? raw.map(x => rt(x as string)) : []
})

const inboxRows = computed<InboxRow[]>(() => {
  const raw = tm('landing.productGrid.cards.inbox.messages') as unknown
  if (!Array.isArray(raw)) return []
  return raw.map((entry: Record<string, unknown>) => ({
    name: rt(entry.name as string),
    msg: rt(entry.msg as string),
    time: rt(entry.time as string),
    unread: typeof entry.unread === 'number' ? entry.unread : 0,
  }))
})

const agendaSlots = computed<AgendaSlot[]>(() => {
  const raw = tm('landing.productGrid.cards.agenda.slots') as unknown
  if (!Array.isArray(raw)) return []
  return raw.map((entry: Record<string, unknown>) => ({
    time: rt(entry.time as string),
    duration: typeof entry.duration === 'number' ? entry.duration : Number(rt(entry.duration as string)),
    name: rt(entry.name as string),
    tone: rt(entry.tone as string),
  }))
})

const settings = [
  { label: 'landing.productGrid.settings.auto', on: true },
  { label: 'landing.productGrid.settings.handoff', on: true },
  { label: 'landing.productGrid.settings.voice', on: false },
]

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase()
}
</script>

<template>
  <section
    id="capacidades"
    class="pg-wrap relative py-[clamp(90px,13vh,170px)]"
    aria-labelledby="pg-title"
  >
    <div class="mx-auto w-full max-w-[1280px] px-[clamp(20px,4vw,52px)]">
      <div v-reveal class="lurviax-rv mb-[clamp(44px,6vw,72px)] grid grid-cols-1 items-end gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div>
          <p class="pg-eyebrow">
            <span class="pg-eyebrow__line" />
            {{ $t('landing.productGrid.eyebrow') }}
          </p>
          <h2 id="pg-title" class="lurviax-h2-breathe pg-title">
            {{ $t('landing.productGrid.titleA') }}<br>
            <em class="pg-title__em">{{ $t('landing.productGrid.titleB') }}</em>
          </h2>
        </div>
        <p class="pg-copy">{{ $t('landing.productGrid.copy') }}</p>
      </div>

      <div v-reveal="140" class="lurviax-rv lurviax-stagger pg-grid">
        <article class="pg-card pg-card--wide">
          <div class="pg-card__head">
            <span class="pg-card__label">{{ $t('landing.productGrid.cards.chart.label') }}</span>
            <span class="pg-card__pill pg-card__pill--up">+28%</span>
          </div>
          <div class="pg-card__chart" aria-hidden="true">
            <svg viewBox="0 0 220 60" preserveAspectRatio="none" class="pg-chart-svg">
              <defs>
                <linearGradient id="pgChartArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="#5BE9EC" stop-opacity="0.45" />
                  <stop offset="100%" stop-color="#5BE9EC" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path :d="chartAreaPath" fill="url(#pgChartArea)" />
              <path :d="chartPath" fill="none" stroke="#5BE9EC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="220" cy="0" r="3" fill="#5BE9EC">
                <animate attributeName="cy" values="0;0;0;0;0;0;0" dur="1s" />
              </circle>
            </svg>
            <div class="pg-chart-x">
              <span v-for="(day, i) in chartDays" :key="i">{{ day }}</span>
            </div>
          </div>
          <div class="pg-card__meta">
            <span class="pg-card__big">1 284</span>
            <span class="pg-card__sub">{{ $t('landing.productGrid.cards.chart.sub') }}</span>
          </div>
        </article>

        <article class="pg-card">
          <div class="pg-card__head">
            <span class="pg-card__label">{{ $t('landing.productGrid.cards.agenda.label') }}</span>
            <span class="pg-card__pill">{{ $t('landing.productGrid.cards.agenda.day') }}</span>
          </div>
          <div class="pg-agenda">
            <div class="pg-agenda__hours">
              <span v-for="h in ['08', '10', '12', '14', '16']" :key="h">{{ h }}</span>
            </div>
            <div class="pg-agenda__track">
              <div
                v-for="(slot, i) in agendaSlots"
                :key="i"
                class="pg-agenda__slot"
                :class="`pg-agenda__slot--${slot.tone}`"
                :style="`left: ${((parseInt(slot.time.split(':')[0]) - 8) + (slot.time.endsWith('30') ? 0.5 : 0)) * 12.5}%; width: ${slot.duration * 12.5}%;`"
              >
                <span class="pg-agenda__slot-time">{{ slot.time }}</span>
                <span class="pg-agenda__slot-name">{{ slot.name }}</span>
              </div>
            </div>
          </div>
        </article>

        <article class="pg-card">
          <div class="pg-card__head">
            <span class="pg-card__label">{{ $t('landing.productGrid.cards.inbox.label') }}</span>
            <span class="pg-card__pill pg-card__pill--live">
              <span class="pg-card__pill-dot" />{{ $t('landing.productGrid.cards.inbox.live') }}
            </span>
          </div>
          <ul class="pg-inbox">
            <li v-for="row in inboxRows" :key="row.name">
              <span class="pg-inbox__avatar">{{ initialOf(row.name) }}</span>
              <div class="pg-inbox__body">
                <div class="pg-inbox__row">
                  <span class="pg-inbox__name">{{ row.name }}</span>
                  <span class="pg-inbox__time">{{ row.time }}</span>
                </div>
                <div class="pg-inbox__msg">{{ row.msg }}</div>
              </div>
              <span v-if="row.unread" class="pg-inbox__badge">{{ row.unread }}</span>
            </li>
          </ul>
        </article>

        <article class="pg-card">
          <div class="pg-card__head">
            <span class="pg-card__label">{{ $t('landing.productGrid.cards.bot.label') }}</span>
            <span class="pg-card__pill pg-card__pill--live">
              <span class="pg-card__pill-dot" />{{ $t('landing.productGrid.cards.bot.online') }}
            </span>
          </div>
          <div class="pg-bot">
            <div class="pg-bot__avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="#01142A" stroke-width="2" aria-hidden="true">
                <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
              </svg>
            </div>
            <div class="pg-bot__main">
              <div class="pg-bot__name">{{ $t('landing.productGrid.cards.bot.name') }}</div>
              <div class="pg-bot__sub">{{ $t('landing.productGrid.cards.bot.specialty') }}</div>
            </div>
          </div>
          <div class="pg-bot__stats">
            <div class="pg-bot__stat">
              <span class="pg-bot__stat-num">2.4<small>s</small></span>
              <span class="pg-bot__stat-label">{{ $t('landing.productGrid.cards.bot.latency') }}</span>
            </div>
            <div class="pg-bot__stat">
              <span class="pg-bot__stat-num">127</span>
              <span class="pg-bot__stat-label">{{ $t('landing.productGrid.cards.bot.today') }}</span>
            </div>
            <div class="pg-bot__stat">
              <span class="pg-bot__stat-num">98<small>%</small></span>
              <span class="pg-bot__stat-label">{{ $t('landing.productGrid.cards.bot.resolved') }}</span>
            </div>
          </div>
        </article>

        <article class="pg-card">
          <div class="pg-card__head">
            <span class="pg-card__label">{{ $t('landing.productGrid.cards.settings.label') }}</span>
            <span class="pg-card__pill">{{ $t('landing.productGrid.cards.settings.saved') }}</span>
          </div>
          <ul class="pg-settings">
            <li v-for="s in settings" :key="s.label">
              <span class="pg-settings__label">{{ $t(s.label) }}</span>
              <span class="pg-switch" :class="{ 'pg-switch--on': s.on }" aria-hidden="true">
                <span class="pg-switch__thumb" />
              </span>
            </li>
          </ul>
        </article>

        <article class="pg-card">
          <div class="pg-card__head">
            <span class="pg-card__label">{{ $t('landing.productGrid.cards.customer.label') }}</span>
            <span class="pg-card__pill pg-card__pill--star">★ VIP</span>
          </div>
          <div class="pg-customer">
            <div class="pg-customer__row">
              <span class="pg-customer__avatar">{{ initialOf($t('landing.productGrid.cards.customer.name')) }}</span>
              <div>
                <div class="pg-customer__name">{{ $t('landing.productGrid.cards.customer.name') }}</div>
                <div class="pg-customer__since">{{ $t('landing.productGrid.cards.customer.since') }} {{ $t('landing.productGrid.cards.customer.year') }}</div>
              </div>
            </div>
            <dl class="pg-customer__grid">
              <div>
                <dt>12</dt>
                <dd>{{ $t('landing.productGrid.cards.customer.visits') }}</dd>
              </div>
              <div>
                <dt>$ 420</dt>
                <dd>LTV</dd>
              </div>
              <div>
                <dt>94%</dt>
                <dd>{{ $t('landing.productGrid.cards.customer.sat') }}</dd>
              </div>
            </dl>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pg-wrap {
  isolation: isolate;
}

.pg-eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.705rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(91, 233, 236, 0.75);
}
.pg-eyebrow__line {
  display: inline-block;
  width: 24px;
  height: 1px;
  background: rgba(91, 233, 236, 0.75);
  transition: width 0.7s cubic-bezier(0.23, 1, 0.32, 1);
}
.lurviax-rv.reveal-in .pg-eyebrow__line { width: 56px; }

.pg-title {
  margin-top: 16px;
  font-family: Archivo, 'Chivo', ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 108, 'wght' 500;
  font-size: clamp(1.9rem, 4.2vw, 3.1rem);
  line-height: 1.08;
  letter-spacing: -0.012em;
  color: #ffffff;
}
.pg-title__em {
  font-style: normal;
  font-variation-settings: 'wdth' 108, 'wght' 620;
  color: #5BE9EC;
}
.pg-copy {
  max-width: 60ch;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.55;
}

.pg-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-auto-rows: minmax(190px, auto);
  gap: clamp(14px, 1.8vw, 22px);
}
.pg-card { grid-column: span 2; }
.pg-card--wide { grid-column: span 3; }
.pg-card:nth-child(1) { grid-column: span 3; }
.pg-card:nth-child(4) { grid-column: span 3; }

@media (max-width: 960px) {
  .pg-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pg-card, .pg-card--wide, .pg-card:nth-child(1), .pg-card:nth-child(4) { grid-column: span 1; }
}
@media (max-width: 560px) {
  .pg-grid { grid-template-columns: 1fr; }
}

.pg-card {
  position: relative;
  padding: 18px;
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(91, 233, 236, 0.06), rgba(7, 125, 220, 0.02)),
    rgba(1, 20, 42, 0.72);
  backdrop-filter: blur(10px);
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 0 0 0.5px rgba(91, 233, 236, 0.22),
    0 2px 4px -2px rgba(0, 0, 0, 0.5),
    0 10px 20px -8px rgba(0, 0, 0, 0.5),
    0 28px 56px -28px rgba(0, 0, 0, 0.6),
    0 60px 120px -40px rgba(1, 20, 42, 0.75);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pg-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background: radial-gradient(360px circle at 80% -20%, rgba(91, 233, 236, 0.08), transparent 60%);
}

.pg-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.pg-card__label {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}
.pg-card__pill {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(91, 233, 236, 0.2);
  background: rgba(1, 20, 42, 0.6);
  white-space: nowrap;
}
.pg-card__pill--up { color: #5BE9EC; border-color: rgba(91, 233, 236, 0.45); }
.pg-card__pill--star { color: #ffd480; border-color: rgba(255, 212, 128, 0.5); }
.pg-card__pill--live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5BE9EC;
  border-color: rgba(91, 233, 236, 0.45);
}
.pg-card__pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5BE9EC;
  box-shadow: 0 0 8px #5BE9EC;
  animation: pg-pulse 1.8s ease-in-out infinite;
}
@keyframes pg-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.pg-card__chart {
  flex: 1;
  min-height: 60px;
  position: relative;
}
.pg-chart-svg {
  width: 100%;
  height: 60px;
  overflow: visible;
}
.pg-chart-x {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.4);
}
.pg-card__meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.pg-card__big {
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 90, 'wght' 400;
  font-size: clamp(1.6rem, 2.4vw, 2.1rem);
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.pg-card__sub {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.pg-agenda {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pg-agenda__hours {
  display: flex;
  justify-content: space-between;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.4);
  padding: 0 2px;
}
.pg-agenda__track {
  position: relative;
  flex: 1;
  min-height: 72px;
  border-radius: 10px;
  background:
    repeating-linear-gradient(90deg, rgba(91, 233, 236, 0.07) 0 1px, transparent 1px 12.5%),
    rgba(255, 255, 255, 0.04);
}
.pg-agenda__slot {
  position: absolute;
  top: 6px;
  bottom: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 10px;
  border-radius: 8px;
  overflow: hidden;
}
.pg-agenda__slot--primary {
  background: linear-gradient(135deg, rgba(91, 233, 236, 0.35), rgba(7, 125, 220, 0.45));
  border: 1px solid rgba(91, 233, 236, 0.5);
  color: #ffffff;
}
.pg-agenda__slot--warn {
  background: linear-gradient(135deg, rgba(255, 180, 90, 0.3), rgba(255, 140, 60, 0.4));
  border: 1px solid rgba(255, 180, 90, 0.5);
  color: #ffffff;
}
.pg-agenda__slot--muted {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.75);
}
.pg-agenda__slot-time {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  opacity: 0.8;
}
.pg-agenda__slot-name {
  font-size: 0.74rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pg-inbox {
  flex: 1;
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pg-inbox li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.pg-inbox__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-weight: 700;
  font-size: 0.82rem;
  color: #01142A;
  background: linear-gradient(135deg, #5BE9EC, #077DDC);
  flex-shrink: 0;
}
.pg-inbox__body {
  min-width: 0;
  flex: 1;
}
.pg-inbox__row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.pg-inbox__name {
  font-size: 0.78rem;
  font-weight: 600;
  color: #ffffff;
}
.pg-inbox__time {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.4);
}
.pg-inbox__msg {
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pg-inbox__badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #5BE9EC;
  color: #01142A;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.66rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.pg-bot {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pg-bot__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #5BE9EC, #077DDC);
  box-shadow: 0 0 20px rgba(91, 233, 236, 0.4);
}
.pg-bot__avatar svg { width: 22px; height: 22px; }
.pg-bot__name {
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-weight: 600;
  font-size: 0.92rem;
  color: #ffffff;
}
.pg-bot__sub {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}
.pg-bot__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid rgba(91, 233, 236, 0.15);
}
.pg-bot__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pg-bot__stat-num {
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 90, 'wght' 400;
  font-size: 1.3rem;
  line-height: 1;
  color: #5BE9EC;
  font-variant-numeric: tabular-nums;
}
.pg-bot__stat-num small {
  font-size: 0.72rem;
  color: rgba(91, 233, 236, 0.7);
  margin-left: 1px;
}
.pg-bot__stat-label {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.pg-settings {
  flex: 1;
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pg-settings li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.pg-settings__label {
  font-size: 0.82rem;
  color: #ffffff;
}
.pg-switch {
  position: relative;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  transition: background 0.3s ease;
}
.pg-switch--on {
  background: linear-gradient(135deg, #5BE9EC, #077DDC);
  box-shadow: 0 0 12px rgba(91, 233, 236, 0.5);
}
.pg-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}
.pg-switch--on .pg-switch__thumb { transform: translateX(14px); }

.pg-customer__row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pg-customer__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-weight: 700;
  color: #01142A;
  background: linear-gradient(135deg, #ffd480, #ff9a5a);
}
.pg-customer__name {
  font-weight: 600;
  color: #ffffff;
  font-size: 0.92rem;
}
.pg-customer__since {
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}
.pg-customer__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid rgba(91, 233, 236, 0.15);
}
.pg-customer__grid > div { display: flex; flex-direction: column; gap: 2px; }
.pg-customer__grid dt {
  font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
  font-size: 1rem;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
}
.pg-customer__grid dd {
  margin: 0;
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

@media (prefers-reduced-motion: reduce) {
  .pg-card__pill-dot { animation: none; }
}
</style>
