export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'Noto Sans Thai', 'sans-serif'], display: ['Inter', 'Noto Sans Thai', 'sans-serif'] },
      colors: {
        wellness: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
        thai: { gold: '#d97706', lotus: '#f43f5e', herbal: '#0d9488', clay: '#b45309' },
        ar: { cyan: '#06b6d4', neon: '#10b981', amber: '#f59e0b', crimson: '#ef4444', thermal: '#f97316' },
      },
      animation: { 'spin-slow': 'spin 8s linear infinite', 'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite', 'bounce-slow': 'bounce 2s infinite', ripple: 'ripple 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite' },
      keyframes: { ripple: { '0%': { transform: 'scale(0.8)', opacity: '1' }, '100%': { transform: 'scale(2.2)', opacity: '0' } } },
    },
  },
  plugins: [],
};
