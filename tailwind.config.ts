import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        "primary": "#0353a4",
        "primary-container": "#006daa",
        "secondary": "#061a40",
        "on-surface-variant": "#3d4947",
        "surface": "#fafaff",
        "background": "#fafaff",
        "ghost-slate": "#F8F9FE",
        "surface-variant": "#e1e6f0",
        "on-primary": "#ffffff",
        "on-surface": "#061a40",
        "error": "#ba1a1a",
        "pearl-white": "#FFFFFF",
        "glass-border": "rgba(3, 83, 164, 0.2)",
        "glass-bg": "rgba(255, 255, 255, 0.75)",
        "surface-container-low": "#f4f6fa",
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
        "24px": "24px",
        full: "9999px",
      },
      spacing: {
        "margin-mobile": "16px",
        "unit": "4px",
        "bento-gap": "20px",
        "margin-desktop": "40px",
        "gutter": "24px",
      },
      fontFamily: {
        "headline-lg": ["Space Grotesk", "sans-serif"],
        "display-lg": ["Space Grotesk", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "title-md": ["Space Grotesk", "sans-serif"],
        "accent": ["Space Grotesk", "sans-serif"],
      },
      fontSize: {
        "display-lg": [
          "64px",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "headline-lg": [
          "32px",
          { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "700" },
        ],
      },
    },
  },
  plugins: [],
};

export default config;
