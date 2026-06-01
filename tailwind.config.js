/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0EFFF',
          100: '#E0DEFF',
          200: '#C2BCFF',
          300: '#A39BFF',
          400: '#8579FF',
          500: '#6C63FF',
          600: '#5046CC',
          700: '#3C3599',
          800: '#282366',
          900: '#141233',
        },
        accent: {
          DEFAULT: '#00D4FF',
          dark: '#00A8CC',
        },
        dark: {
          bg: '#0F0F23',
          card: '#1A1A3E',
          surface: '#252550',
          border: '#2D2D6B',
        },
        light: {
          bg: '#F8F9FA',
          card: '#FFFFFF',
          surface: '#F1F5F9',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        mono: ['SpaceMono', 'Monospace'],
      },
    },
  },
  plugins: [],
};
