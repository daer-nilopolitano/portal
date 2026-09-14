"use client";

import { useState } from "react";
import type { Igreja } from "@/components/embaixadas-secao";
import { EmbaixadasCarrossel } from "@/components/embaixadas-carrossel";
import { EmbaixadasMapa } from "@/components/embaixadas-mapa";

export function EmbaixadasPainel({ igrejas }: { igrejas: Igreja[] }) {
  const [igrejaSelecionadaId, setIgrejaSelecionadaId] = useState<number | null>(
    igrejas[0]?.id ?? null
  );
  const [pausado, setPausado] = useState(false);

  return (
    <div
      className="mt-12 grid gap-8 md:grid-cols-2"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <EmbaixadasCarrossel
        igrejas={igrejas}
        igrejaSelecionadaId={igrejaSelecionadaId}
        onSelecionarIgreja={setIgrejaSelecionadaId}
        pausado={pausado}
      />
      <EmbaixadasMapa
        igrejas={igrejas}
        igrejaSelecionadaId={igrejaSelecionadaId}
        onSelecionarIgreja={setIgrejaSelecionadaId}
      />
    </div>
  );
}
