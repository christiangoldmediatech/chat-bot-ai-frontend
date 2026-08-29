import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const primary = {
  50: '#e6f5ff',
  100: '#c1e6ff',
  200: '#8fd1ff',
  300: '#5bb9fb',
  400: '#2a9cec',
  500: '#077ddc',
  600: '#0668ba',
  700: '#065396',
  800: '#054073',
  900: '#032e56',
  950: '#01142a',
}

const accent = {
  50: '#e8fdfe',
  100: '#c6f8fa',
  200: '#9ff2f5',
  300: '#77ecf0',
  400: '#5be9ec',
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

const ink = {
  DEFAULT: '#030303',
  deep: '#000000',
  surface: '#01142a',
  card: '#032040',
  cardHi: '#034871',
  navyDeep: '#01142a',
  navyMid: '#034871',
}

const pearl = '#ffffff'
const mist = {
  DEFAULT: 'rgba(255,255,255,0.72)',
  dim: 'rgba(255,255,255,0.48)',
}

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
        sans: ['Chivo', ...defaultTheme.fontFamily.sans],
        display: ['Archivo', 'Chivo', ...defaultTheme.fontFamily.sans],
        mono: ['"Chivo Mono"', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        primary,
        brand: primary,
        accent,
        success,
        danger,
        ink,
        pearl: { DEFAULT: pearl },
        mist,
        line,
        halo: {
          DEFAULT: '#5be9ec',
          dim: '#077ddc',
          wash: 'rgba(91,233,236,0.10)',
          line: 'rgba(91,233,236,0.35)',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #5be9ec 0%, #077ddc 100%)',
        'ground': [
          'radial-gradient(closest-side circle at 50% -10%, rgba(7,125,220,0.32) 0%, rgba(3,72,113,0.18) 42%, rgba(3,3,3,0) 72%)',
          'radial-gradient(90% 60% at 100% 100%, rgba(7,125,220,0.20) 0%, rgba(3,3,3,0) 60%)',
          'linear-gradient(180deg, #000000 0%, #030303 30%, #030303 100%)',
        ].join(','),
        'brand-ambient': [
          'radial-gradient(closest-side circle at 50% -10%, rgba(7,125,220,0.32) 0%, rgba(3,72,113,0.18) 42%, rgba(3,3,3,0) 72%)',
          'radial-gradient(90% 60% at 100% 100%, rgba(7,125,220,0.20) 0%, rgba(3,3,3,0) 60%)',
          'linear-gradient(180deg, #000000 0%, #030303 30%, #030303 100%)',
        ].join(','),
        'brand-ambient-light': [
          'radial-gradient(circle at 12% 18%, rgba(7,125,220,0.10), transparent 55%)',
          'radial-gradient(circle at 88% 82%, rgba(91,233,236,0.12), transparent 55%)',
          'linear-gradient(180deg, #f4f8fd 0%, #eaf2fd 100%)',
        ].join(','),
        'halo-radial': 'radial-gradient(circle, rgba(91,233,236,0.18) 0%, rgba(7,125,220,0.12) 34%, rgba(3,3,3,0) 64%)',
        'chrome-card': 'linear-gradient(170deg, #034871 0%, #01142a 46%, #030303 100%)',
      },
      boxShadow: {
        glass: '0 10px 30px -12px rgb(3 3 3 / 0.45), 0 4px 10px -6px rgb(3 3 3 / 0.20)',
        'glass-lg': '0 20px 50px -20px rgb(3 3 3 / 0.65), 0 8px 16px -8px rgb(3 3 3 / 0.28)',
        'halo-glow': '0 10px 34px -14px rgba(91,233,236,0.85)',
        'halo-glow-lg': '0 30px 70px -46px rgba(91,233,236,0.70)',
        'phone': '0 40px 90px -50px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      keyframes: {
        ping: {
          '0%': { boxShadow: '0 0 0 0 rgba(91,233,236,0.55)' },
          '70%, 100%': { boxShadow: '0 0 0 9px rgba(91,233,236,0)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.75', transform: 'translate(-50%,-18%) scale(1)' },
          '50%': { opacity: '1', transform: 'translate(-50%,-18%) scale(1.07)' },
        },
        riseIn: { to: { transform: 'translateY(0)' } },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        pop: {
          from: { opacity: '0', transform: 'translateY(10px) scale(.97)' },
          to: { opacity: '1', transform: 'none' },
        },
        blip: {
          '0%, 100%': { opacity: '0.25', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-3px)' },
        },
        eq: {
          '0%, 100%': { height: '22%' },
          '50%': { height: '100%' },
        },
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
