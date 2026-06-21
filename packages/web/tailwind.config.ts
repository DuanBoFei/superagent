import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        panel: "#0d0d0d",
        modal: "#18181b",
        accent: "#10b981",
        border: "#1f1f23",
        foreground: "#fafafa",
        muted: "#a1a1aa",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        xs: ["0.6875rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.5rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
