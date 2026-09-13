"use client";

import { useTheme } from "@/lib/theme-context";

const ORDEM = ["light", "dark", "system"] as const;
const ROTULOS = { light: "Claro", dark: "Escuro", system: "Sistema" };

function IconeTema({ tema }: { tema: (typeof ORDEM)[number] }) {
  if (tema === "light") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (tema === "dark") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path strokeLinecap="round" d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function ThemeToggle() {
  const { tema, definirTema } = useTheme();

  function alternar() {
    const proximo = ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length];
    definirTema(proximo);
  }

  return (
    <button
      onClick={alternar}
      title={`Tema: ${ROTULOS[tema]}`}
      aria-label={`Alternar tema (atual: ${ROTULOS[tema]})`}
      className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-primary"
    >
      <IconeTema tema={tema} />
    </button>
  );
}
