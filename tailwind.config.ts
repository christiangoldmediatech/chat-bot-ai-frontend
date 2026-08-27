import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

// ALIA design tokens — dark commit. El logo vive sobre un degradado verde-abisal
// (halo teal + navy profundo); una versión clara traicionaría la marca. Todos
// los colores se pintan desde tokens, no hardcodeados en componentes.
//
// Palettes:
//   • primary — ALIA halo (base `#58F0CE`, un mint teal más frío que la iteración
//     anterior). Wordmark, CTAs, glow, "en acción".
//   • accent  — halo-dim `#2FB99B` para labels, foco, acentos secundarios.
//   • ink / surface / card — capas de fondo (near-black → surface teal → card).
//   • pearl / mist — texto (blanco perlado sobre oscuro / gris teal para body).
//   • line    — bordes translúcidos derivados de mist.
//   • success / danger — sin cambio (semántica de canal / severidad).
//
// `brand` es alias de `primary` para retrocompatibilidad con clases legacy.

const primary = {
  50: '#f0fffb',
  100: '#c9fff0',
  200: '#9dfbe0',
  300: '#74f5cf',
  400: '#58f0ce', // halo — base ALIA
  500: '#3fdcb6',
  600: '#2fb99b', // halo-dim — texto sobre pearl si necesario
  700: '#22957c',
  800: '#177361',
  900: '#0d5449',
  950: '#032e28',
}

const accent = {
  50: '#e7fbf5',
  100: '#c4f4e5',
  200: '#94e7cf',
  300: '#5dd6b6',
  400: '#3cc7a4',
  500: '#2fb99b',
  600: '#219481',
  700: '#187366',
  800: '#125650',
  900: '#0a2a25',
  950: '#04100e',
}

const success = {
  50: '#ecfdf3',
  100: '#d1fadf',
  200: '#a6f4c5',
  300: '#6ce9a6',
  400: '#32d583',
  500: '#25d366',
  600: '#1fad52',
  700: '#128c3d',
  800: '#0e6e30',
  900: '#075e54',
  950: '#04332e',
}

const danger = {
  50: '#fff1f2',
  100: '#ffe4e6',
  200: '#fecdd3',
  300: '#fda4af',
  400: '#fb7185',
  500: '#f43f5e',
  600: '#e11d48',
  700: '#be123c',
  800: '#9f1239',
  900: '#881337',
  950: '#4c0519',
}

// Ink / surface / card / teal — capas de fondo del dark commit.
const ink = {
  DEFAULT: '#04100e',
  deep: '#020908',
  surface: '#081c19',
  card: '#0b2723',
  cardHi: '#103330',
  tealDeep: '#0a2a25',
  tealMid: '#12554a',
}

// Text / neutral (perla + mist teal).
const pearl = '#e9f6f2'
const mist = {
  DEFAULT: '#8aafa7',
  dim: '#567c75',
}

// Line — bordes translúcidos derivados de mist.
const line = {
  DEFAULT: 'rgba(138,175,167,0.16)',
  soft: 'rgba(138,175,167,0.08)',
}

export default <Partial<Config>>{
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Chivo drives body/UI text; Archivo variable is opted into via
        // `font-display` for the wordmark and display headings; Chivo Mono
        // is used for eyebrows / labels / metadata.
        sans: ['Chivo', ...defaultTheme.fontFamily.sans],
        display: ['Archivo', 'Chivo', ...defaultTheme.fontFamily.sans],
        mono: ['"Chivo Mono"', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        primary,
        brand: primary, // legacy alias
        accent,
        success,
        danger,
        ink,
        pearl: { DEFAULT: pearl },
        mist,
        // Line utilities: `border-line`, `border-line-soft`.
        line,
        // Halo utilities: `bg-halo-wash` (soft fill), `border-halo-line`.
        halo: {
          DEFAULT: '#58f0ce',
          dim: '#2fb99b',
          wash: 'rgba(88,240,206,0.10)',
          line: 'rgba(88,240,206,0.26)',
        },
      },
      backgroundImage: {
        // Brand gradient — halo → halo-dim. Se usa en botones sólidos y en el
        // wordmark cuando pinta con gradiente.
        'brand-gradient': 'linear-gradient(100deg, #58f0ce 0%, #2fb99b 100%)',
        // Ground: fondo canónico del dark commit — halo abisal arriba, deep
        // ink abajo, con un radial secundario en la esquina inferior derecha.
        'ground': [
          'radial-gradient(120% 80% at 50% -10%, rgba(18,85,74,.62) 0%, rgba(10,42,37,.22) 42%, rgba(4,16,14,0) 72%)',
          'radial-gradient(90% 60% at 100% 100%, rgba(18,85,74,.28) 0%, rgba(4,16,14,0) 60%)',
          'linear-gradient(180deg, #020908 0%, #04100e 30%, #04100e 100%)',
        ].join(','),
        // Brand ambient — legacy alias del ground para retrocompatibilidad
        // con lo que ya venía usando `bg-brand-ambient` en layouts.
        'brand-ambient': [
          'radial-gradient(120% 80% at 50% -10%, rgba(18,85,74,.62) 0%, rgba(10,42,37,.22) 42%, rgba(4,16,14,0) 72%)',
          'radial-gradient(90% 60% at 100% 100%, rgba(18,85,74,.28) 0%, rgba(4,16,14,0) 60%)',
          'linear-gradient(180deg, #020908 0%, #04100e 30%, #04100e 100%)',
        ].join(','),
        // Variante clara para admin (subordinada; mantiene el mismo motif
        // pero sobre base near-white).
        'brand-ambient-light': [
          'radial-gradient(circle at 12% 18%, rgba(47,185,155,0.14), transparent 55%)',
          'radial-gradient(circle at 88% 82%, rgba(88,240,206,0.14), transparent 55%)',
          'linear-gradient(180deg, #f4fbfd 0%, #eaf7fd 100%)',
        ].join(','),
        // Halo radial que respira detrás del wordmark del hero.
        'halo-radial': 'radial-gradient(circle, rgba(88,240,206,.16) 0%, rgba(18,85,74,.10) 34%, rgba(4,16,14,0) 64%)',
        // Chrome sutil para cards elevadas.
        'chrome-card': 'linear-gradient(170deg, #103330 0%, #081c19 46%, #04100e 100%)',
      },
      boxShadow: {
        // Elevated glass shadow.
        glass: '0 10px 30px -12px rgb(4 16 14 / 0.35), 0 4px 10px -6px rgb(4 16 14 / 0.15)',
        'glass-lg': '0 20px 50px -20px rgb(4 16 14 / 0.55), 0 8px 16px -8px rgb(4 16 14 / 0.20)',
        // Halo glow para el CTA sólido y el picked plan.
        'halo-glow': '0 10px 34px -14px rgba(88,240,206,.85)',
        'halo-glow-lg': '0 30px 70px -46px rgba(88,240,206,.7)',
        // Deep shadow para el phone frame.
        'phone': '0 40px 90px -50px rgba(0,0,0,.95), inset 0 1px 0 rgba(232,246,242,.06)',
      },
      keyframes: {
        // Pulso de ping para el dot del CTA sólido.
        ping: {
          '0%': { boxShadow: '0 0 0 0 rgba(88,240,206,.55)' },
          '70%, 100%': { boxShadow: '0 0 0 9px rgba(88,240,206,0)' },
        },
        // Halo del hero respirando.
        breathe: {
          '0%, 100%': { opacity: '0.75', transform: 'translate(-50%,-18%) scale(1)' },
          '50%': { opacity: '1', transform: 'translate(-50%,-18%) scale(1.07)' },
        },
        // Rise-in de líneas del headline.
        riseIn: { to: { transform: 'translateY(0)' } },
        // Fade-up simple (badge, copy, CTA, ticker).
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Bubble pop en el chat thread.
        pop: {
          from: { opacity: '0', transform: 'translateY(10px) scale(.97)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Typing dots en el thread.
        blip: {
          '0%, 100%': { opacity: '0.25', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-3px)' },
        },
        // Equalizer del phone bar.
        eq: {
          '0%, 100%': { height: '22%' },
          '50%': { height: '100%' },
        },
        // Marquee de integraciones.
        slide: { to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        ping: 'ping 2.6s ease-out infinite',
        breathe: 'breathe 9s ease-in-out infinite',
        pop: 'pop 0.42s cubic-bezier(.2,.9,.3,1) both',
        blip: 'blip 1.2s ease-in-out infinite',
        eq: 'eq 1.1s ease-in-out infinite',
        slide: 'slide 34s linear infinite',
      },
    },
  },
}
