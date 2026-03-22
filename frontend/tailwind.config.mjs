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
          DEFAULT: "#bc0002",
          foreground: "#ffffff",
          container: "#eb0003",
          fixed: "#ffdad4",
          "fixed-dim": "#ffb4a8",
        },
        secondary: {
          DEFAULT: "#5f5e5e",
          foreground: "#ffffff",
          container: "#e2dfde",
          fixed: "#e5e2e1",
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
          DEFAULT: "#fcf9f8",
          dim: "#dcd9d9",
          bright: "#fcf9f8",
          container: {
            DEFAULT: "#f0edec",
            low: "#f6f3f2",
            high: "#eae7e7",
            highest: "#e5e2e1",
            lowest: "#ffffff",
          },
          variant: "#e5e2e1",
          tint: "#c00002",
        },
        "on-surface": "#1c1b1b",
        "on-surface-variant": "#603e39",
        "on-background": "#1c1b1b",
        outline: {
          DEFAULT: "#956d67",
          variant: "#ebbbb4",
        },
        "inverse-surface": "#313030",
        "inverse-primary": "#ffb4a8",
        "inverse-on-surface": "#f3f0ef",
        tertiary: {
          DEFAULT: "#5c5c5c",
          container: "#757474",
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
        'editorial': '0 12px 32px rgba(28, 27, 27, 0.06)',
        'editorial-lg': '0 20px 48px rgba(28, 27, 27, 0.08)',
        'editorial-sm': '0 4px 12px rgba(28, 27, 27, 0.04)',
      },
    },
  },
  plugins: [],
}
