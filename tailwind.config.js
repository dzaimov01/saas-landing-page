/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#08080d',
        surface: '#101019',
        surface2: '#171723',
        line: 'rgba(255,255,255,0.08)',
        fog: '#e9e9f2',
        muted: '#9494ad',
        violet: '#7c5cff',
        cyan: '#22d3ee',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: { float: 'float 7s ease-in-out infinite' },
    },
  },
  plugins: [],
}
