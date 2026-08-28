import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

// LURVIA design tokens — dark commit. El wordmark vive sobre un vórtice azul
// noche (núcleo deep navy + halo cian). Todos los colores se pintan desde
// tokens, no hardcodeados en componentes.
//
// Palettes:
//   • primary — LURVIA action blue (base `#077DDC`). Wordmark accents, CTAs,
//     enlaces, "en acción".
//   • accent  — cian `#5BE9EC` para glow, highlights, foco, bordes iluminados.
//   • ink / surface / card — capas de fondo (near-black → azul noche → azul
//     profundo).
//   • pearl / mist — texto (blanco sobre oscuro / gris azulado para body).
//   • line    — bordes translúcidos derivados del cian.
//   • success / danger — WhatsApp verde y rose (semántica de canal / severidad,
//     no se rebrandean).
//
// `brand` es alias de `primary` para retrocompatibilidad con clases legacy.

const primary = {
  50: '#e6f5ff',
  100: '#c1e6ff',
  200: '#8fd1ff',
  300: '#5bb9fb',
  400: '#2a9cec',
  500: '#077ddc', // base LURVIA — --color-4
  600: '#0668ba',
  700: '#065396',
  800: '#054073',
  900: '#032e56',
  950: '#01142a',  // --color-3
}

const accent = {
  50: '#e8fdfe',
  100: '#c6f8fa',
  200: '#9ff2f5',
  300: '#77ecf0',
  400: '#5be9ec', // base cian — --color-5
  500: '#3ecdd1',
  600: '#2ba7ab',
  700: '#1f8083',
  800: '#155a5d',
  900: '#0a3436',
  950: '#031619',
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

// Ink / surface / card — capas de fondo del dark commit.
const ink = {
  DEFAULT: '#030303',   // --color-1
  deep: '#000000',
  surface: '#01142a',   // --color-3
  card: '#032040',
  cardHi: '#034871',    // --color-2
  navyDeep: '#01142a',
  navyMid: '#034871',
}

// Text / neutral (perla + mist azulado).
const pearl = '#ffffff'
const mist = {
  DEFAULT: 'rgba(255,255,255,0.72)',
  dim: 'rgba(255,255,255,0.48)',
}

// Line — bordes translúcidos derivados del cian de acento.
const line = {
  DEFAULT: 'rgba(91,233,236,0.20)',
  soft: 'rgba(91,233,236,0.10)',
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
          DEFAULT: '#5be9ec',
          dim: '#077ddc',
          wash: 'rgba(91,233,236,0.10)',
          line: 'rgba(91,233,236,0.35)',
        },
      },
      backgroundImage: {
        // Brand gradient — cian → azul primario. Se usa en botones sólidos y
        // en el wordmark cuando pinta con gradiente.
        'brand-gradient': 'linear-gradient(135deg, #5be9ec 0%, #077ddc 100%)',
        // Ground: fondo canónico del dark commit — vórtice radial azul con
        // núcleo noche, anillos primario y desvanecido a negro.
        'ground': [
          'radial-gradient(closest-side circle at 50% -10%, rgba(7,125,220,0.32) 0%, rgba(3,72,113,0.18) 42%, rgba(3,3,3,0) 72%)',
          'radial-gradient(90% 60% at 100% 100%, rgba(7,125,220,0.20) 0%, rgba(3,3,3,0) 60%)',
          'linear-gradient(180deg, #000000 0%, #030303 30%, #030303 100%)',
        ].join(','),
        // Brand ambient — legacy alias del ground para retrocompatibilidad
        // con lo que ya venía usando `bg-brand-ambient` en layouts.
        'brand-ambient': [
          'radial-gradient(closest-side circle at 50% -10%, rgba(7,125,220,0.32) 0%, rgba(3,72,113,0.18) 42%, rgba(3,3,3,0) 72%)',
          'radial-gradient(90% 60% at 100% 100%, rgba(7,125,220,0.20) 0%, rgba(3,3,3,0) 60%)',
          'linear-gradient(180deg, #000000 0%, #030303 30%, #030303 100%)',
        ].join(','),
        // Variante clara para admin (subordinada; mantiene el mismo motif
        // pero sobre base near-white con tinte azul).
        'brand-ambient-light': [
          'radial-gradient(circle at 12% 18%, rgba(7,125,220,0.10), transparent 55%)',
          'radial-gradient(circle at 88% 82%, rgba(91,233,236,0.12), transparent 55%)',
          'linear-gradient(180deg, #f4f8fd 0%, #eaf2fd 100%)',
        ].join(','),
        // Halo radial que respira detrás del wordmark del hero.
        'halo-radial': 'radial-gradient(circle, rgba(91,233,236,0.18) 0%, rgba(7,125,220,0.12) 34%, rgba(3,3,3,0) 64%)',
        // Chrome sutil para cards elevadas.
        'chrome-card': 'linear-gradient(170deg, #034871 0%, #01142a 46%, #030303 100%)',
      },
      boxShadow: {
        // Elevated glass shadow.
        glass: '0 10px 30px -12px rgb(3 3 3 / 0.45), 0 4px 10px -6px rgb(3 3 3 / 0.20)',
        'glass-lg': '0 20px 50px -20px rgb(3 3 3 / 0.65), 0 8px 16px -8px rgb(3 3 3 / 0.28)',
        // Halo glow para el CTA sólido y el picked plan.
        'halo-glow': '0 10px 34px -14px rgba(91,233,236,0.85)',
        'halo-glow-lg': '0 30px 70px -46px rgba(91,233,236,0.70)',
        // Deep shadow para el phone frame.
        'phone': '0 40px 90px -50px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      keyframes: {
        // Pulso de ping para el dot del CTA sólido.
        ping: {
          '0%': { boxShadow: '0 0 0 0 rgba(91,233,236,0.55)' },
          '70%, 100%': { boxShadow: '0 0 0 9px rgba(91,233,236,0)' },
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
