import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        soft: "rgb(var(--soft) / <alpha-value>)",
        soft2: "rgb(var(--soft-2) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        ink2: "rgb(var(--ink-2) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-ink": "rgb(var(--accent-ink) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        "accent-deep": "rgb(var(--accent-deep) / <alpha-value>)",
        "soft-2": "rgb(var(--soft-2) / <alpha-value>)",
        ok: "rgb(var(--ok) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "Roboto", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "Menlo", "monospace"],
        script: ["var(--font-script)", "cursive"],
      },
      borderRadius: { card: "24px", hero: "28px" },
      boxShadow: { book: "0 14px 26px -12px rgba(30,20,10,.45)" },
    },
  },
  plugins: [],
} satisfies Config;
