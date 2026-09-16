"use client";

import { useState } from "react";
import type { EmbaixadaDestaque } from "@/lib/types";
import { EmbaixadasCarrossel } from "@/components/public/embaixadas/carrossel";
import { EmbaixadasMapa } from "@/components/public/embaixadas/mapa";

export function EmbaixadasDestaques({ igrejas }: { igrejas: EmbaixadaDestaque[] }) {
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
