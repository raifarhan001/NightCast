/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        prime: {
          blue: '#00A8E1',
          blueHover: '#0095C8',
          dark: '#0B1120',
          bg: '#0F172A',
          black: '#000000',
          surface: '#192231',
          surfaceHover: '#232E42',
          gold: '#E5B800',
          muted: '#8197A4',
          border: 'rgba(129, 151, 164, 0.2)',
          borderHover: 'rgba(0, 168, 225, 0.5)',
        },
        ocean: {
          bg: '#0B1120',
          surface: '#192231',
          surfaceHover: '#232E42',
          primary: '#00A8E1',
          steel: '#8197A4',
          charcoal: '#0F172A',
          white: '#FFFFFF',
          border: 'rgba(129, 151, 164, 0.2)',
          borderHover: 'rgba(0, 168, 225, 0.45)',
        },
        cinema: {
          black: '#000000',
          dark: '#0B1120',
          surface: '#192231',
          border: 'rgba(129, 151, 164, 0.2)',
          borderHover: 'rgba(0, 168, 225, 0.45)',
        },
      },
      fontFamily: {
        display: ['Outfit', 'Inter', '-apple-system', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
