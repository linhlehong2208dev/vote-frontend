/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        stage: {
          950: '#100B1F',
          900: '#17102B',
          800: '#1F1638',
          700: '#2A1F49',
          600: '#3A2C63',
        },
        amber: {
          DEFAULT: '#FFB627',
        },
        coral: {
          DEFAULT: '#FF5D5D',
        },
        sky: {
          DEFAULT: '#4C9AFF',
        },
        emerald: {
          DEFAULT: '#3DDC97',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        tile: '0 6px 0 0 rgba(0,0,0,0.25)',
        'tile-active': '0 2px 0 0 rgba(0,0,0,0.25)',
      },
      keyframes: {
        pulseSlow: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.55 },
        },
        popIn: {
          '0%': { transform: 'scale(0.85)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
      animation: {
        pulseSlow: 'pulseSlow 2s ease-in-out infinite',
        popIn: 'popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
};
