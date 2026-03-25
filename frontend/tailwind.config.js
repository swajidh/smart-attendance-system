/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        "muted-foreground": "var(--color-muted-foreground)",
        border: "var(--color-border)",
        surface: "var(--color-surface)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, hsl(27, 100%, 55%), hsl(14, 100%, 55%), hsl(290, 98%, 74%), hsl(217, 100%, 65%))',
        'gradient-primary': 'linear-gradient(135deg, hsl(27, 100%, 55%), hsl(217, 100%, 65%))',
        'gradient-accent': 'linear-gradient(90deg, hsl(27, 100%, 55%), hsl(14, 100%, 55%), hsl(217, 100%, 65%))'
      },
      screens: {
        'lgPlus': '1180px',
        '3xl': '1920px'
      }
    },
  },
  plugins: [],
}
