/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#090a0f',
        darkCard: '#12141c',
        darkBorder: '#1f2231',
        lightBg: '#f8fafc',
        lightCard: '#ffffff',
        lightBorder: '#e2e8f0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
