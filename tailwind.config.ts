import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        card: "hsl(var(--card))",
      },
      boxShadow: {
        editorial: "0 20px 40px -24px rgba(20, 24, 38, 0.35)",
      },
      borderRadius: {
        lg: "0.85rem",
        md: "0.65rem",
        sm: "0.45rem",
      },
    },
  },
  plugins: [],
};

export default config;
