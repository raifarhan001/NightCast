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
        // Turtle Palette from user specification
        turtle: {
          light: '#E5EFC1', // Cream / Light Sage
          mint: '#A2D5AB',  // Mint Green / Soft Jade
          teal: '#39AEA9',  // Vibrant Turquoise / Teal (Primary)
          slate: '#557B83', // Deep Slate Teal / Ocean Moss
        },
        // Midnight Slate Canvas
        midnight: {
          950: '#0A0F11', // Ultra Deep Canvas
          900: '#0E1416', // Elevated Backdrop
          800: '#121A1D', // Card Base
          750: '#152024', // Popovers / Dropdowns
          700: '#1A2529', // Hover Surface
          600: '#223136', // Subtle Hairline Border
          500: '#2E4249', // Secondary
          400: '#557B83', // Slate accent
          300: '#8FA8AD', // Subtitle text
        },
        // Electric Violet (kept for backward compatibility)
        violet: {
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        // Neon Pink (kept for backward compatibility)
        pink: {
          400: '#F472B6',
          500: '#EC4899',
          600: '#DB2777',
        },
        // Neutral Palette
        neutral: {
          100: '#FFFFFF',
          200: '#E2E8F0',
          300: '#8FA8AD',
        },
        // Semantic Mappings
        background: '#0A0F11',
        foreground: '#E2E8F0',
        card: {
          DEFAULT: '#121A1D',
          foreground: '#FFFFFF',
        },
        popover: {
          DEFAULT: '#152024',
          foreground: '#E2E8F0',
        },
        primary: {
          DEFAULT: '#39AEA9',
          foreground: '#0A0F11',
          hover: '#A2D5AB',
        },
        secondary: {
          DEFAULT: '#1A2529',
          foreground: '#E2E8F0',
          hover: '#223136',
        },
        muted: {
          DEFAULT: '#1A2529',
          foreground: '#8FA8AD',
        },
        border: 'rgba(85, 123, 131, 0.25)',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        'sm': '0 2px 6px 0 rgba(0, 0, 0, 0.6)',
        'md': '0 4px 12px -2px rgba(0, 0, 0, 0.7)',
        'lg': '0 12px 28px -4px rgba(0, 0, 0, 0.8)',
        'xl': '0 20px 48px -8px rgba(0, 0, 0, 0.9)',
        'neon-turtle': '0 0 25px rgba(57, 174, 169, 0.45)',
        'neon-violet': '0 0 25px rgba(57, 174, 169, 0.45)',
        'neon-pink': '0 0 25px rgba(162, 213, 171, 0.45)',
        'card-glow': '0 12px 32px -4px rgba(0, 0, 0, 0.7), 0 0 24px -2px rgba(57, 174, 169, 0.28)',
      },
      borderRadius: {
        'none': '0px',
        'sm': '6px',
        'DEFAULT': '8px',
        'md': '10px',
        'lg': '14px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '28px',
        'full': '9999px',
      },
    },
  },
  plugins: [],
};
