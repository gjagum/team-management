/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "#7c3aed",
          foreground: "#ffffff",
          container: "#8b5cf6",
          fixed: "#ede9fe",
          "fixed-dim": "#c4b5fd",
        },
        secondary: {
          DEFAULT: "#5b5566",
          foreground: "#ffffff",
          container: "#ece9f3",
          fixed: "#ece9f3",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "#ba1a1a",
          foreground: "#ffffff",
        },
        surface: {
          DEFAULT: "#faf9fd",
          dim: "#dedbe7",
          bright: "#ffffff",
          container: {
            DEFAULT: "#f4f2f9",
            low: "#f8f6fc",
            high: "#efecf6",
            highest: "#e9e5f2",
            lowest: "#ffffff",
          },
          variant: "#e9e5f2",
          tint: "#7c3aed",
        },
        "on-surface": "#1b1826",
        "on-surface-variant": "#514b60",
        "on-background": "#1b1826",
        outline: {
          DEFAULT: "#7c7690",
          variant: "#d3cee0",
        },
        "inverse-surface": "#2b2738",
        "inverse-primary": "#c4b5fd",
        "inverse-on-surface": "#f4f2f9",
        tertiary: {
          DEFAULT: "#5b5766",
          container: "#74707f",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        headline: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        'editorial': '0 12px 32px rgba(30, 22, 52, 0.06)',
        'editorial-lg': '0 20px 48px rgba(30, 22, 52, 0.08)',
        'editorial-sm': '0 4px 12px rgba(30, 22, 52, 0.04)',
      },
    },
  },
  plugins: [],
}
