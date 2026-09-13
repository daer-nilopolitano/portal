"use client";

import { useEffect, useState } from "react";
import type { Igreja } from "@/components/embaixadas-secao";

const INTERVALO_MS = 6000;

function enderecoCompleto(igreja: Igreja) {
  return [
    [igreja.rua, igreja.numero].filter(Boolean).join(", "),
    igreja.complemento,
    igreja.bairro,
    igreja.municipio,
  ]
    .filter(Boolean)
    .join(" — ");
}

export function EmbaixadasCarrossel({ igrejas }: { igrejas: Igreja[] }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado || igrejas.length <= 1) return;
    const id = setInterval(() => setIndice((atual) => (atual + 1) % igrejas.length), INTERVALO_MS);
    return () => clearInterval(id);
  }, [pausado, igrejas.length]);

  if (igrejas.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-lg border border-border bg-surface text-sm text-text-muted">
        Nenhuma embaixada cadastrada ainda.
      </div>
    );
  }

  const igreja = igrejas[indice];
  const irPara = (novoIndice: number) => setIndice((novoIndice + igrejas.length) % igrejas.length);

  return (
    <div
      className="relative flex h-[350px] flex-col justify-between rounded-lg border border-border bg-surface p-6"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div>
        <p className="font-heading text-lg font-semibold text-primary">{igreja.nome}</p>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{enderecoCompleto(igreja)}</p>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => irPara(indice - 1)} aria-label="Embaixada anterior" className="rounded-full border border-border p-2 text-text-muted hover:border-primary hover:text-primary">
          ‹
        </button>
        <div className="flex gap-1.5">
          {igrejas.map((_, i) => (
            <button key={i} onClick={() => irPara(i)} aria-label={`Ir para embaixada ${i + 1}`} className={`h-1.5 w-1.5 rounded-full ${i === indice ? "bg-accent" : "bg-border"}`} />
          ))}
        </div>
        <button onClick={() => irPara(indice + 1)} aria-label="Próxima embaixada" className="rounded-full border border-border p-2 text-text-muted hover:border-primary hover:text-primary">
          ›
        </button>
      </div>
    </div>
  );
}
