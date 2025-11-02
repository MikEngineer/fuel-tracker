/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#7C4DFF",
        accent: "#FF8E3C",
        bg: "#0B0B10",
        surface: "#141420",
        on: "#E5E5F0",
      },
    },
  },
  plugins: [],
};
