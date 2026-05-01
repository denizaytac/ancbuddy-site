import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    container: {
      center: true,
      padding: "var(--pad-x)",
      screens: { "2xl": "1240px" },
    },
    extend: {
      colors: {
        accent: { DEFAULT: "var(--accent)", "2": "var(--accent-2)", glow: "var(--accent-glow)" },
        bg: { DEFAULT: "var(--bg)", "2": "var(--bg-2)", "3": "var(--bg-3)" },
        surface: { DEFAULT: "var(--surface)", hi: "var(--surface-hi)" },
        ink: { DEFAULT: "var(--fg)", "2": "var(--fg-2)", "3": "var(--fg-3)", "4": "var(--fg-4)" },
        line: { DEFAULT: "var(--border)", hi: "var(--border-hi)" },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border-shadcn))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accentShadcn: {
          DEFAULT: "hsl(var(--accent-shadcn))",
          foreground: "hsl(var(--accent-shadcn-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
        serif: ["var(--font-serif)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.4s cubic-bezier(.2,.8,.2,1)",
        "accordion-up": "accordion-up 0.4s cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
