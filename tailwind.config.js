/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Hydrated at runtime from the business config row, so a tenant's
        // branding never needs a rebuild. See BusinessConfigProvider.
        brand: 'var(--brand-primary)',
        'brand-dark': 'var(--brand-primary-dark)',
        ink: 'var(--brand-secondary)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        // Ease-out curves: they start fast and settle, which is what makes an
        // interface feel responsive rather than sluggish.
        'out-cubic': 'cubic-bezier(.215, .61, .355, 1)',
        'out-quart': 'cubic-bezier(.165, .84, .44, 1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms cubic-bezier(.215, .61, .355, 1)',
        'slide-up': 'slide-up 240ms cubic-bezier(.165, .84, .44, 1)',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(.165, .84, .44, 1)',
      },
    },
  },
  plugins: [],
}
