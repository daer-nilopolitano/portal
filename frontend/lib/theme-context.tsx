"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Tema = "light" | "dark";

interface ThemeContextValue {
  tema: Tema;
  definirTema: (tema: Tema) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function temaDoSistema(): Tema {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function temaSalvo(): Tema | null {
  const salvo = localStorage.getItem("tema");
  return salvo === "light" || salvo === "dark" ? salvo : null;
}

// Mesmas cores de fundo de --color-background em globals.css (claro e escuro).
const COR_BARRA: Record<Tema, string> = { light: "#FAF9F6", dark: "#0D0C0B" };

function aplicarClasse(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "dark");
  // A barra de status do celular / do PWA instalado acompanha o tema escolhido. As metas do layout usam `media`
  // (só seguem o tema do sistema), então aqui fixamos a cor do tema ativo.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.removeAttribute("media");
    meta.content = COR_BARRA[tema];
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Sempre inicia em "light", igual ao servidor (que não tem window pra saber o
  // valor real) — senão o cliente já nasce com o tema real nessa mesma primeira
  // renderização e diverge do HTML vindo do servidor, causando erro de hidratação.
  // O useEffect abaixo corrige pro valor real logo depois, já com a página montada.
  const [tema, setTema] = useState<Tema>("light");

  useEffect(() => {
    const atualizarTema = () => {
      const preferencia = temaSalvo();
      const proximoTema = preferencia ?? temaDoSistema();
      setTema(proximoTema);
      aplicarClasse(proximoTema);
    };

    atualizarTema();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const escutar = () => {
      if (temaSalvo() === null) {
        atualizarTema();
      }
    };

    media.addEventListener("change", escutar);
    return () => media.removeEventListener("change", escutar);
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
