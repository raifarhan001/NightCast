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
        ocean: {
          bg: '#011425',
          surface: '#081E30',
          surfaceHover: '#0D2A42',
          primary: '#1F4959',
          steel: '#5C7C89',
          charcoal: '#242424',
          white: '#FFFFFF',
          border: 'rgba(92, 124, 137, 0.2)',
          borderHover: 'rgba(92, 124, 137, 0.45)',
        },
        cinema: {
          black: '#011425',
          dark: '#081E30',
          surface: '#0D2A42',
          border: 'rgba(92, 124, 137, 0.2)',
          borderHover: 'rgba(92, 124, 137, 0.45)',
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
