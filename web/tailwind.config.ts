import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:    '#0F172A',
        muted:  '#64748B',
        line:   '#E2E8F0',
        bg:     '#F8FAFC',
        accent: '#0EA5E9'
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 6px rgba(15,23,42,0.06)'
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
