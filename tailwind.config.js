/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#5156be',
        'primary-soft': '#eef0fb',
        'primary-border': '#c5c7e8',
        'primary-text': '#5156be',
        'primary-dark': '#3d42a8',
        muted: '#8a909c',
        ink: '#2b2f38',
        line: '#e9eaef',
        ok: '#0e9f6e',
        danger: '#e0414a',
      },
      boxShadow: {
        pop: '0 8px 30px rgba(0,0,0,.12)',
      },
    },
  },
  plugins: [],
};
