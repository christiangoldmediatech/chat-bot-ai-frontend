import type { Config } from 'tailwindcss'

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
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#b9cdff',
          300: '#8aa9ff',
          400: '#5a82ff',
          500: '#345eff',
          600: '#1f43ed',
          700: '#1834c2',
          800: '#172e98',
          900: '#162a78',
        },
      },
    },
  },
}
