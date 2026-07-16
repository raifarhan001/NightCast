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
        nexus: {
          black: '#000000',
          darker: '#050505',
          dark: '#0a0a0b',
          surface: '#0f0f11',
          card: '#141416',
          border: 'rgba(255,255,255,0.06)',
          borderHover: 'rgba(255,255,255,0.12)',
          text: '#f5f5f7',
          muted: '#8a8a92',
          dim: '#5a5a62',
        },
        cyan: {
          DEFAULT: '#00d4ff',
          dark: '#00a6cc',
          deep: '#007a99',
          glow: 'rgba(0,212,255,0.25)',
          glowIntense: 'rgba(0,212,255,0.5)',
          muted: 'rgba(0,212,255,0.1)',
        },
        luxury: {
          bg: '#000000',
          surface: '#0a0a0b',
          textPrimary: '#f5f5f7',
          textSecondary: '#8a8a92',
          accent: '#00d4ff',
          accentMuted: 'rgba(0,212,255,0.12)',
        },
        glass: {
          stroke: 'rgba(255,255,255,0.08)',
          highlight: 'rgba(255,255,255,0.04)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'SF Pro Display', 'Inter', 'sans-serif'],
        sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial-cyan': 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 70%)',
        'gradient-radial-top': 'radial-gradient(ellipse at top, rgba(0,212,255,0.06), transparent 60%)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
        'gradient-fade-up': 'linear-gradient(to top, #000000 0%, transparent 100%)',
        'gradient-fade-down': 'linear-gradient(to bottom, #000000 0%, transparent 100%)',
        'gradient-fade-right': 'linear-gradient(to right, #000000 0%, transparent 100%)',
        'gradient-hero': 'linear-gradient(to top, #000000 20%, rgba(0,0,0,0.3) 60%, transparent 100%)',
        'gradient-glow': 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, transparent 50%)',
        'gradient-surface': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
      },
      boxShadow: {
        'glow-cyan': '0 0 30px -5px rgba(0,212,255,0.2)',
        'glow-cyan-sm': '0 0 15px -5px rgba(0,212,255,0.15)',
        'glow-cyan-lg': '0 0 50px -10px rgba(0,212,255,0.25)',
        'glow-cyan-xl': '0 0 80px -15px rgba(0,212,255,0.3)',
        'card': '0 4px 20px rgba(0,0,0,0.5)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6), 0 0 30px -5px rgba(0,212,255,0.1)',
        'panel': '0 8px 32px rgba(0,0,0,0.4)',
        'panel-hover': '0 12px 48px rgba(0,0,0,0.5)',
        'elevated': '0 20px 60px -15px rgba(0,0,0,0.7)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05)',
        'neon': '0 0 10px rgba(0,212,255,0.3), 0 0 40px rgba(0,212,255,0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'pulse-cyan': 'pulseCyan 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        pulseCyan: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0,212,255,0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(0,212,255,0.6)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
