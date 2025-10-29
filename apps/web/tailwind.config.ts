import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        tablet: '640px',
        desktop: '1232px',
      },
      colors: {
        brand: {
          50: '#f2f7ff', 100: '#e6efff', 200: '#cce0ff', 300: '#99c2ff', 400: '#66a3ff', 500: '#3385ff', 600: '#1a73e8', 700: '#1557b0', 800: '#0f3b78', 900: '#0a2550',
        },
        'comeback-gray': {
          25: 'rgb(249 250 251)',
          50: 'rgb(248 250 252)',
          600: 'rgb(71 84 103)',
          700: 'rgb(52 64 84)',
          900: 'rgb(16 24 40)',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        'bolt-bg-primary': '#f8fafc',
        'bolt-bg-secondary': '#eef7f4',
        'bolt-bg-tertiary': '#e6f4f1',
        'bolt-border-color': 'rgba(180, 220, 210, 0.6)',
        'bolt-text-primary': '#0f172a',
        'bolt-text-secondary': '#334155',
        'bolt-text-tertiary': '#64748b',
        'bg-primary': '#f1fff9',
        'bg-secondary': '#f6fff9',
        'bg-gradient-top': 'rgba(216, 248, 240, 0.9)',
        'bg-gradient-mid': 'rgba(210, 245, 231, 0.88)',
        'bg-gradient-bottom': 'rgba(245, 255, 250, 0.92)',
        'bg-accent-sky': 'rgba(121, 223, 255, 0.32)',
        'bg-accent-lime': 'rgba(208, 242, 36, 0.26)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate],
}
export default config
