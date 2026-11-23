import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Font Russo One dimuat lewat next/font di app/layout.tsx (variabel CSS --font-russo).
        display: ["var(--font-russo)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
