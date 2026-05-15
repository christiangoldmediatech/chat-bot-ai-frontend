import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

// Semantic palettes for the platform. Three identities:
//   • primary — modern AI agent indigo (anchored at #6366F1). Used for brand,
//     primary actions, focus rings, links.
//   • success — WhatsApp green (anchored at #25D366, the canonical brand
//     green; the 900 step lands on #075E54, the dark teal from WhatsApp's
//     header). Doubles as "active/connected" status because the product is a
//     WhatsApp bot platform.
//   • danger — modern rose/coral (anchored at #F43F5E). Replaces flat red.
//
// `brand` is kept as an alias of `primary` so existing `bg-brand-600` etc.
// keep working. New code should prefer `primary-*`.
const primary = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b',
}

const success = {
  50: '#ecfdf3',
  100: '#d1fadf',
  200: '#a6f4c5',
  300: '#6ce9a6',
  400: '#32d583',
  500: '#25d366', // WhatsApp brand green
  600: '#1fad52',
  700: '#128c3d',
  800: '#0e6e30',
  900: '#075e54', // WhatsApp dark teal (header)
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
        sans: ['Poppins', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary,
        // `brand` is the legacy name for the primary palette — kept as an
        // alias so existing `bg-brand-600` / `text-brand-700` classes keep
        // working. New code should prefer `primary-*`.
        brand: primary,
        success,
        danger,
      },
      backgroundImage: {
        // Subtle chrome gradients. Use on headers, sidebars, login/hero cards.
        // Body buttons and ordinary cards stay flat — see polish-ui skill.
        'chrome-light': 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
        'chrome-dark': 'linear-gradient(to bottom, #020617 0%, #0f172a 100%)',
        // Hero gradients tinted with each palette's 50/100 step over white.
        'hero-primary': 'linear-gradient(135deg, #eef2ff 0%, #ffffff 60%, #e0e7ff 100%)',
        'hero-success': 'linear-gradient(135deg, #ecfdf3 0%, #ffffff 60%, #d1fadf 100%)',
        'hero-danger': 'linear-gradient(135deg, #fff1f2 0%, #ffffff 60%, #ffe4e6 100%)',
        // Airy "sky" background for auth and landing screens — sky-200 at the
        // top fading through white to a faint primary tint. Pair with
        // glassmorphic cards (`bg-white/70 backdrop-blur-xl`).
        'sky-day': 'linear-gradient(180deg, #bae6fd 0%, #e0f2fe 30%, #ffffff 70%, #eef2ff 100%)',
        // Soft mist for admin work surfaces — replaces flat bg-slate-50 with
        // a barely-there cool gradient that lifts glass cards.
        'mist-light': 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      },
      boxShadow: {
        // Soft elevated shadow for glass cards. Tighter and cooler than
        // Tailwind's default shadow-xl so it doesn't fight the airy bg.
        glass: '0 10px 30px -12px rgb(15 23 42 / 0.12), 0 4px 10px -6px rgb(15 23 42 / 0.06)',
        'glass-lg': '0 20px 50px -20px rgb(15 23 42 / 0.18), 0 8px 16px -8px rgb(15 23 42 / 0.08)',
      },
    },
  },
}
