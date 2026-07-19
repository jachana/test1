import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0b1020",
        panel: "#141b2e",
      },
    },
  },
  plugins: [],
};

export default config;
