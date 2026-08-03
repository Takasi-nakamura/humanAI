/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // HumanAI ブランドカラー: 白基調 + ソフトなインディゴアクセント
        brand: {
          50: '#f5f6fb',
          100: '#eaecf7',
          200: '#d1d6ee',
          300: '#a9b3df',
          400: '#7c8bcb',
          500: '#5a67b5',
          600: '#454f97',
          700: '#383f7a',
          800: '#313665',
          900: '#2b3055',
        },
        surface: {
          light: '#ffffff',
          soft: '#f7f8fb',
          border: '#e7e9f1',
          dark: '#14161f',
          darksoft: '#1c1f2b',
          darkborder: '#2b2f3d',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', '"Hiragino Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px rgba(20, 22, 31, 0.06)',
        floating: '0 8px 30px rgba(20, 22, 31, 0.10)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        typingDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
          '40%': { transform: 'scale(1)', opacity: 1 },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.25s ease-out',
        typingDot: 'typingDot 1.2s infinite ease-in-out',
      }
    },
  },
  plugins: [],
}
