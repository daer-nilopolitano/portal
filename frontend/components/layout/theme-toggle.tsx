"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

const ORDEM = ["light", "dark"] as const;
const ICONES = { light: Sun, dark: Moon };
const ROTULOS = { light: "Claro", dark: "Escuro" };

export function ThemeToggle() {
  const { tema, definirTema } = useTheme();
  const Icone = ICONES[tema];

  function alternar() {
    const proximo = ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length];
    definirTema(proximo);
  }

  return (
    <button
      onClick={alternar}
      title={`Tema: ${ROTULOS[tema]}`}
      aria-label={`Alternar tema (atual: ${ROTULOS[tema]})`}
      className="btn-ghost"
    >
      <Icone size={16} />
    </button>
  );
}
