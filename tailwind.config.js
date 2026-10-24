/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1e293b',
        ice:  '#e0f2fe',
        green: { DEFAULT: '#059669' },
        amber: { DEFAULT: '#b45309' },
        rose:  { DEFAULT: '#e11d48' },
      },
    },
  },
  plugins: [],
};

