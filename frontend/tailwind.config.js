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
        // User Cinema Palette
        cinema: {
          prussian: '#1B3A57',  // Deep Prussian Navy (#1B3A57)
          slate: '#2C3E50',     // Dark Charcoal Blue / Midnight Slate (#2C3E50)
          steel: '#4A6E8D',     // Steel Blue / Muted Slate (#4A6E8D)
          ice: '#A4C8E1',       // Ice Blue / Soft Glow (#A4C8E1)
          platinum: '#F0F0F0',  // Crisp Off-White / Platinum (#F0F0F0)
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
          DEFAULT: '#1B3A57',
          foreground: '#F0F0F0',
        },
        popover: {
          DEFAULT: '#142230',
          foreground: '#F0F0F0',
        },
        primary: {
          DEFAULT: '#A4C8E1',
          foreground: '#0B131B',
          hover: '#F0F0F0',
        },
        secondary: {
          DEFAULT: '#2C3E50',
          foreground: '#F0F0F0',
          hover: '#4A6E8D',
        },
        muted: {
          DEFAULT: '#2C3E50',
          foreground: '#A4C8E1',
        },
        border: 'rgba(74, 110, 141, 0.25)',
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
        'glow-ice': '0 0 25px rgba(164, 200, 225, 0.45)',
        'glow-steel': '0 0 25px rgba(74, 110, 141, 0.35)',
        'card-cinema': '0 12px 32px -4px rgba(7, 12, 18, 0.85), 0 0 20px -2px rgba(164, 200, 225, 0.15)',
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
