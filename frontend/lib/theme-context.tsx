"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Tema = "light" | "dark" | "system";

interface ThemeContextValue {
  tema: Tema;
  definirTema: (tema: Tema) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function aplicarClasse(tema: Tema) {
  const escuro =
    tema === "dark" ||
    (tema === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", escuro);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>("system");

  useEffect(() => {
    const salvo = (localStorage.getItem("tema") as Tema | null) ?? "system";
    setTema(salvo);
    aplicarClasse(salvo);

    if (salvo === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const escutar = () => aplicarClasse("system");
      media.addEventListener("change", escutar);
      return () => media.removeEventListener("change", escutar);
    }
  }, []);

  function definirTema(novoTema: Tema) {
    localStorage.setItem("tema", novoTema);
    setTema(novoTema);
    aplicarClasse(novoTema);
  }

  return (
    <ThemeContext.Provider value={{ tema, definirTema }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const contexto = useContext(ThemeContext);
  if (!contexto) throw new Error("useTheme precisa estar dentro de ThemeProvider");
  return contexto;
}
