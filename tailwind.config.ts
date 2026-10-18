import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#060a18', 900: '#0a1020', 800: '#101a33', 700: '#1a2745' },
        emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669' }, // main accent
        gold: { 300: '#fcd980', 400: '#f5c451', 500: '#e0a82e' },    // odds and CTAs
        cyan: { 400: '#22d3ee' },                                    // minor accent
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
