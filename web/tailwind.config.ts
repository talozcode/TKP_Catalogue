import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A0F12',
        muted: '#7A6B6F',
        line: '#EAE3DF',
        bg: '#F7F3EF',
        brand: '#7A1F3D',
        brandDeep: '#5E1530',
        brandSoft: '#F5E9EE',
        gold: '#C9A14E',
        goldDeep: '#A8852F',
        goldSoft: '#FAF1DD',
        // Backwards-compat alias used by older components.
        accent: '#7A1F3D'
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,15,18,0.05), 0 4px 12px rgba(26,15,18,0.04)',
        cardHover: '0 4px 6px rgba(26,15,18,0.06), 0 12px 28px rgba(122,31,61,0.08)'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif']
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px'
      }
    }
  },
  plugins: []
};

export default config;
