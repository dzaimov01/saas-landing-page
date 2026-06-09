import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#08080d',
        surface: '#101019',
        surface2: '#171723',
        line: 'rgba(255,255,255,0.08)',
        fog: '#e9e9f2',
        muted: '#9494ad',
        violet: '#7c5cff',
        cyan: '#22d3ee',
      },
      fontFamily: {
        display: ['var(--font-sora)', 'sans-serif'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: { float: 'float 7s ease-in-out infinite' },
    },
  },
  plugins: [],
}

export default config
