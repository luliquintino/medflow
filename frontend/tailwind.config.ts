import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        moss: {
          50:  "#f4f7f0",
          100: "#e6eddc",
          200: "#ccdcbb",
          300: "#a8c490",
          400: "#84aa66",
          500: "#638f46",
          600: "#4d7235",
          700: "#3d5a2a",
          800: "#334924",
          900: "#2b3d1f",
        },
        cream: {
          50:  "#fdfcf8",
          100: "#faf7f0",
          200: "#f4ede0",
          300: "#ecddd0",
          400: "#e0c9b8",
        },
        sand: {
          100: "#f9f6f1",
          200: "#f2ece2",
          300: "#e8dfd3",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        card:  "0 1px 4px 0 rgba(0,0,0,0.06), 0 4px 16px 0 rgba(0,0,0,0.04)",
        float: "0 4px 24px 0 rgba(0,0,0,0.10)",
      },
      backgroundImage: {
        "moss-gradient": "linear-gradient(135deg, #4d7235 0%, #638f46 100%)",
      },
      animation: {
        "in": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
