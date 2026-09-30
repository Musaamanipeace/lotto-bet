/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#10b981',
          gold: '#f59e0b',
          dark: '#0b1120',
          card: '#151f32',
          border: '#233554',
        },
      },
    },
  },
  plugins: [],
};
