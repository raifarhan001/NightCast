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
        // Canonical NightCast Cinema Palette
        cinema: {
          bg: '#0B131B',        // Primary Dark Base
          teal: '#39AEA9',      // Accent Teal
          ice: '#A4C8E1',       // Ice Blue Accent
          muted: '#8FA8AD',     // Muted Secondary Text
          platinum: '#F0F0F0',  // Crisp Off-White Text
        },
        // Deep Cinematic Canvas
        canvas: {
          950: '#070C12', // Ultra Deep Canvas
          900: '#0B131B', // Primary Dark Base
          850: '#0F1A24', // Subtle Elevated Surface
          800: '#142230', // Card Surface
        },
        // Semantic Mappings
        background: '#0B131B',
        foreground: '#F0F0F0',
        card: {
          DEFAULT: '#142230',
          foreground: '#F0F0F0',
        },
        popover: {
          DEFAULT: '#0F1A24',
          foreground: '#F0F0F0',
        },
        primary: {
          DEFAULT: '#39AEA9',
          foreground: '#0B131B',
          hover: '#F0F0F0',
        },
        secondary: {
          DEFAULT: '#142230',
          foreground: '#F0F0F0',
          hover: '#39AEA9',
        },
        muted: {
          DEFAULT: '#142230',
          foreground: '#8FA8AD',
        },
        border: 'rgba(255, 255, 255, 0.12)',
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
        'glow-teal': '0 0 25px rgba(57, 174, 169, 0.5)',
        'glow-ice': '0 0 25px rgba(164, 200, 225, 0.45)',
        'card-cinema': '0 12px 32px -4px rgba(7, 12, 18, 0.85), 0 0 20px -2px rgba(57, 174, 169, 0.15)',
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
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s infinite',
      },
      transitionDuration: {
        DEFAULT: '200ms',
        '200': '200ms',
        '250': '250ms',
        'cinema': '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        'cinema': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
