/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#07090f',
          900: '#0d1320',
          850: '#121a2b',
          800: '#1a2438',
        },
        ink: '#e8eef7',
        mute: '#9aa8bd',
        faint: '#73829a',
        line: '#2a384e',
        accent: '#00f0ff',
        violet: '#c4b5fd',
        good: '#8fd0ae',
        warn: '#e4c074',
        bad: '#f0a0a0',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Source Sans 3"', 'Segoe UI', 'sans-serif'],
        display: ['"Space Grotesk"', 'Outfit', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 20px 50px rgba(0, 0, 0, 0.28)',
      },
    },
  },
  plugins: [],
}
