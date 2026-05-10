import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-bg": "#F5E6C8",
        "brand-primary": "#0D4A2A",
        "brand-accent": "#7B3F00",
        "brand-text": "#2C2C2C",
        "brand-surface": "#F0F0F0",
      },
    },
  },
  plugins: [],
};
export default config;
