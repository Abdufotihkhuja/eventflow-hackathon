import type { Config } from 'tailwindcss'

/**
 * Bone-and-ink brand ramps. The legacy palette hardcoded cool colors
 * (blue/indigo/violet/purple/sky/cyan) as the old indigo brand. We alias
 * those Tailwind families to brand ramps so every remaining `*-blue-*` /
 * `*-violet-*` utility renders on-brand without touching each call site:
 *   blue · sky · cyan        → ember  (old primary / links / info)
 *   indigo · violet · purple → forest (old secondary / accent)
 */
const ember = {
  50: '#fff3eb',
  100: '#ffe1cc',
  200: '#ffba85',
  300: '#fb893f',
  400: '#ea580c',
  500: '#c64a07',
  600: '#963405',
  700: '#7a2b05',
  800: '#5c2004',
  900: '#3d1503',
  950: '#240c02',
}

const forest = {
  50: '#eef3ef',
  100: '#d2e0d4',
  200: '#a4c0a8',
  300: '#6e9a76',
  400: '#3f7048',
  500: '#275235',
  600: '#173626',
  700: '#122b1f',
  800: '#0e2118',
  900: '#0a1710',
  950: '#050c08',
}

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        soft: '0 2px 6px rgba(14, 14, 13, 0.05), 0 1px 2px rgba(14, 14, 13, 0.04)',
        'soft-lg': '0 14px 32px rgba(14, 14, 13, 0.08), 0 2px 6px rgba(14, 14, 13, 0.04)',
        'inner-soft': 'inset 0 1px 2px rgba(14, 14, 13, 0.04)',
      },
      maxWidth: {
        narrow: 'var(--container-narrow)',
        wide: 'var(--container-wide)',
        'container-full': 'var(--container-full)',
      },
      colors: {
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
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        brand: {
          DEFAULT: 'hsl(var(--brand-primary))',
          primary: 'hsl(var(--brand-primary))',
          secondary: 'hsl(var(--brand-secondary))',
          light: 'hsl(var(--brand-light))',
          soft: 'var(--brand-soft)',
          'soft-foreground': 'var(--brand-soft-fg)',
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
        // ---- Eventflow design-system semantic role aliases ----
        // Consume the CSS vars defined in index.css (dark-mode aware).
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        sunken: 'var(--bg-sunken)',
        fg: {
          strong: 'var(--fg-strong)',
          DEFAULT: 'var(--fg-default)',
          muted: 'var(--fg-muted)',
          subtle: 'var(--fg-subtle)',
        },
        'success-soft': { DEFAULT: 'var(--success-soft)', foreground: 'var(--success-soft-fg)' },
        'warning-soft': { DEFAULT: 'var(--warning-soft)', foreground: 'var(--warning-soft-fg)' },
        'danger-soft': { DEFAULT: 'var(--danger-soft)', foreground: 'var(--danger-soft-fg)' },
        'info-soft': { DEFAULT: 'var(--info-soft)', foreground: 'var(--info-soft-fg)' },
        'neutral-soft': { DEFAULT: 'var(--neutral-soft)', foreground: 'var(--neutral-soft-fg)' },
        // Legacy cool families re-aliased to brand ramps (see top of file).
        blue: ember,
        sky: ember,
        cyan: ember,
        indigo: forest,
        violet: forest,
        purple: forest,
      },
      borderColor: {
        subtle: 'var(--border-subtle)',
        strong: 'var(--border-strong)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scale-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'check-bounce': {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'content-show': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-out': 'scale-out 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.15s ease-out',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'check-bounce': 'check-bounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'content-show': 'content-show 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow': 'spin-slow 3s linear infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '400ms',
      },
    },
  },
}

export default config
