/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cs2: {
          bg: '#0a0e14',
          surface: '#131a24',
          border: '#1e293b',
          accent: '#ff6b2b',
          'accent-hover': '#ff7f4d',
          gold: '#e2b04a',
          text: '#e6e8eb',
          'text-muted': '#8b949e',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
