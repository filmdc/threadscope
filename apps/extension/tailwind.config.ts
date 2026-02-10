import type { Config } from 'tailwindcss';

export default {
  content: [
    './entrypoints/**/*.{html,tsx,ts,jsx,js}',
    './lib/**/*.{tsx,ts,jsx,js}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0095F6',
          600: '#0081d6',
          700: '#006db6',
          800: '#005996',
          900: '#004576',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
