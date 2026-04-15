/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        given:   '#2ec97a',
        refused: '#e8534a',
        pending: '#f4a435',
        info:    '#3a86ff',
        navy:    '#0d1b2a',
        navy2:   '#1a2e45',
        teal:    '#00a896',
        teal2:   '#00c9b1',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}

