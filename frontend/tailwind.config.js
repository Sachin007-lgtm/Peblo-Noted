/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#4caf50',
        'accent-dark': '#2e7d32',
        'accent-light': '#e8f5e9',
        'accent-muted': '#c8e6c9',
        sidebar: '#1a1d23',
        'sidebar-hover': '#252932',
        'sidebar-active': 'rgba(76,175,80,0.15)',
        surface: '#f5f5f5',
        card: '#ffffff',
        border: '#e5e7eb',
        'border-strong': '#d1d5db',
        'text-primary': '#1a1d23',
        'text-secondary': '#6b7280',
        'text-muted': '#9ca3af',
        // Category colours
        'cat-todo':    '#3b82f6',
        'cat-project': '#8b5cf6',
        'cat-brief':   '#f59e0b',
        'cat-drawing': '#ec4899',
        'cat-general': '#6b7280',
        // Semantic
        danger: '#ef4444',
        'danger-light': '#fee2e2',
        warning: '#f59e0b',
        'warning-light': '#fef3c7',
        info: '#3b82f6',
        'info-light': '#dbeafe',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.08)',
        sm: '0 1px 3px rgba(0,0,0,0.1)',
        md: '0 4px 12px rgba(0,0,0,0.08)',
        lg: '0 8px 24px rgba(0,0,0,0.1)',
        'inner-sm': 'inset 0 1px 3px rgba(0,0,0,0.06)',
      },
      spacing: {
        sidebar: '220px',
        4.5: '18px',
      },
      animation: {
        'fade-up': 'fadeInUp 0.3s ease both',
        pulse: 'pulse 1.8s ease infinite',
      },
    },
  },
  plugins: [],
};
