/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "Verdict ledger" palette
        ink: {
          900: '#070b16', // page base
          800: '#0b1020', // raised base
          700: '#111729', // card
          600: '#1a2237', // card border / hover
          500: '#232c44',
        },
        ac: {
          // Accepted-green accent, used sparingly
          DEFAULT: '#37d67a',
          dim: '#1f6b41',
          glow: 'rgba(55,214,122,0.12)',
        },
        wa: '#ff5d6c', // wrong-answer / fail red
        warn: '#f5b556',
        idx: '#7c8cf8', // indigo structure accent
        muted: '#8c98b8',
        faint: '#5b6684',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 18px 40px -24px rgba(0,0,0,0.8)',
      },
      borderRadius: {
        xl: '14px',
      },
    },
  },
  plugins: [],
};
