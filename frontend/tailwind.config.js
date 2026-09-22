/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        // Paleta de interface — independente das cores da organização (azul/branco/amarelo), que fica só na logo.
        // Ver globals.css para os valores claro/escuro de cada variável.
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--color-surface-2) / <alpha-value>)",
        "surface-soft": "rgb(var(--color-surface-soft) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          hover: "rgb(var(--color-primary-hover) / <alpha-value>)",
        },
        "on-primary": "rgb(var(--color-on-primary) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        text: {
          DEFAULT: "rgb(var(--color-text) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
        },
        border: "rgb(var(--color-border) / <alpha-value>)",
        danger: {
          DEFAULT: "rgb(var(--color-danger) / <alpha-value>)",
          hover: "rgb(var(--color-danger-hover) / <alpha-value>)",
        },
        success: "rgb(var(--color-success) / <alpha-value>)",
        "focus-ring": "rgb(var(--color-focus-ring) / <alpha-value>)",
        // Cinza-carvão da sidebar do painel — acompanha o tema (ver globals.css),
        // mais claro no claro e mais escuro no escuro. Não é cor da marca, por
        // isso fica fora do grupo "daer" abaixo. Texto branco sobre ele dá
        // ~11:1 no claro e ~15:1 no escuro — folga de sobra nos dois.
        chrome: "rgb(var(--color-chrome) / <alpha-value>)",
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
