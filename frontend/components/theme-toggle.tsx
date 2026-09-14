"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

const ORDEM = ["light", "dark", "system"] as const;
const ICONES = { light: Sun, dark: Moon, system: Monitor };
const ROTULOS = { light: "Claro", dark: "Escuro", system: "Sistema" };

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
      className="rounded-md border border-border p-2 text-text-muted hover:border-primary hover:text-primary"
    >
      <Icone size={16} />
    </button>
  );
}
