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
        brand: {
          50: '#FBF8FD',
          100: '#F5EEF9',
          200: '#EADCF2',
          300: '#D9BFE7',
          400: '#BA8BBF',
          500: '#8B5CF6',
          600: '#6F53A3',
          700: '#4F3A8A',
          800: '#2D1B69',
          900: '#1E143C',
        },
        purple: {
          50: '#F7F3FB',
          100: '#EDE5F6',
          200: '#DACCEE',
          300: '#C1ABE3',
          400: '#A482D4',
          500: '#8B5CF6',
          600: '#6F53A3',
          700: '#4F3A8A',
          800: '#2D1B69',
          900: '#1E143C',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'purple-sm': '0 2px 10px rgba(111, 83, 163, 0.08)',
        'purple-md': '0 6px 24px rgba(111, 83, 163, 0.12)',
        'purple-lg': '0 12px 36px rgba(111, 83, 163, 0.18)',
        'purple-glow': '0 0 25px rgba(139, 92, 246, 0.35)',
      }
    },
  },
  plugins: [],
}
