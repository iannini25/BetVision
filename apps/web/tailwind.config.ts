import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#06080F',
          panel: '#0B0F1C',
          primary: '#06080F',
          secondary: '#0B0F1C',
          card: '#111729',
          'card-2': '#18203A',
          subtle: '#18203A',
        },
        text: {
          hi: '#F4F6FB',
          mid: '#9AA3B8',
          low: '#8893AC',
          primary: '#F4F6FB',
          secondary: '#9AA3B8',
          muted: '#8893AC',
        },
        brand: {
          1: '#7C3AED',
          2: '#A855F7',
          3: '#D946EF',
          soft: '#A78BFA',
          purple: '#7C3AED',
          violet: '#A855F7',
          fuchsia: '#D946EF',
          light: '#A78BFA',
        },
        accent: {
          green: '#22C55E',
          'green-text': '#4ADE80',
          yellow: '#FBBF24',
          red: '#FB4D6D',
          blue: '#38BDF8',
        },
        warn: '#FBBF24',
        info: '#38BDF8',
        danger: '#FB4D6D',
        line: {
          DEFAULT: 'rgba(148,163,255,0.10)',
          strong: 'rgba(148,163,255,0.18)',
        },
        border: {
          DEFAULT: 'rgba(148,163,255,0.10)',
          subtle: 'rgba(148,163,255,0.08)',
          hover: 'rgba(168,85,247,0.25)',
        },
      },
      fontFamily: {
        // next/font exposes the loaded faces ONLY as CSS variables (set on <html>).
        // Pointing at the literal names ('Sora'...) silently fell back to system fonts.
        display: ['var(--font-display)', 'Sora', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '18px',
        button: '14px',
        input: '12px',
        pill: '999px',
      },
      // `duration-600` was used across the app but is not a default Tailwind step,
      // so those transitions silently ran at 0ms (ProbBar/EyeRing snapped).
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
      boxShadow: {
        'glow-brand': 'var(--shadow-glow-brand)',
        'glow-green': 'var(--shadow-glow-green)',
        card: 'var(--shadow-card)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #7C3AED 0%, #A855F7 45%, #D946EF 100%)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        screenIn: {
          from: { transform: 'translateY(10px)' },
          to: { transform: 'translateY(0)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '80%, 100%': { transform: 'scale(2.6)', opacity: '0' },
        },
        dotGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        ticker: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        blinkMin: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        typingDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-4px)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        shimmerSweep: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 350ms cubic-bezier(0.4,0,0.2,1)',
        screenIn: 'screenIn 250ms cubic-bezier(0.4,0,0.2,1)',
        pulseRing: 'pulseRing 2s cubic-bezier(0.4,0,0.2,1) infinite',
        dotGlow: 'dotGlow 2s ease-in-out infinite',
        ticker: 'ticker 38s linear infinite',
        blinkMin: 'blinkMin 2s ease-in-out infinite',
        typingDot: 'typingDot 1.2s ease-in-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
        shimmerSweep: 'shimmerSweep 1.3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
