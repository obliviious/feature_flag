import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0d0d0d",
          secondary: "#111111",
          card: "#151515",
          "card-hover": "#1c1c1c",
          elevated: "#1a1a1a",
        },
        border: {
          DEFAULT: "#1e1e1e",
          light: "#2a2a2a",
          lighter: "#333333",
        },
        accent: {
          red: "#c23b3b",
          "red-hover": "#d44444",
          "red-dark": "#8b2020",
          "red-glow": "rgba(194, 59, 59, 0.15)",
        },
        text: {
          primary: "#e8e4de",
          secondary: "#999999",
          muted: "#555555",
          label: "#777777",
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["clamp(3rem, 6vw, 5.5rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2.5rem, 5vw, 4.5rem)", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(2rem, 3.5vw, 3rem)", { lineHeight: "1.12", letterSpacing: "-0.01em" }],
        "label-sm": ["0.7rem", { lineHeight: "1.4", letterSpacing: "0.12em" }],
        "label-xs": ["0.6rem", { lineHeight: "1.4", letterSpacing: "0.14em" }],
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out forwards",
        "fade-in-up": "fadeInUp 0.8s ease-out forwards",
        "slide-in-left": "slideInLeft 0.8s ease-out forwards",
        "slide-in-right": "slideInRight 0.8s ease-out forwards",
        "draw-line": "drawLine 1.5s ease-out forwards",
        pulse_slow: "pulse 4s ease-in-out infinite",
        "ticker": "ticker 30s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-32px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(32px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        drawLine: {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
