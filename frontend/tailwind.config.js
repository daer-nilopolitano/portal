/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta base do DAER Nilopolitano — azul, branco e amarelo.
        // Ajustar os tons exatos a partir do logo/insígnia enviados.
        daer: {
          blue: "#1B3A6B",
          "blue-light": "#2E5AA8",
          yellow: "#F2B705",
          white: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
