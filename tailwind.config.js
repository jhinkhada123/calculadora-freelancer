/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./app.js", "./head-init.js", "./utils/*.js", "./privacidade.html", "./privacidade/index.html"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        soft: "0 12px 40px rgba(0,0,0,.35)",
      },
      colors: {
        ink: {
          950: "#070A12",
          900: "#0B1020",
          800: "#111A33",
          700: "#16224A",
        },
        emeraldlux: {
          900: "#064E3B",
          700: "#047857",
          500: "#10B981",
        },
      },
    },
  },
  plugins: [],
};
