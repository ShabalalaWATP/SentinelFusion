import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: "#071015",
          900: "#0a151c",
          850: "#0d1b23",
          800: "#10242e",
          700: "#173342"
        },
        signal: {
          cyan: "#32d3ee",
          teal: "#2dd4bf",
          amber: "#f59e0b",
          red: "#ef4444"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        panel: "0 24px 80px rgb(0 0 0 / 0.35)"
      }
    }
  },
  plugins: []
} satisfies Config;
