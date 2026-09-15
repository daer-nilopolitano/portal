"use client";

import dynamic from "next/dynamic";
import type { IgrejaMapa } from "@/components/public/embaixadas/mapa-interno";

const EmbaixadasMapaInterno = dynamic(
  () => import("@/components/public/embaixadas/mapa-interno").then((m) => m.EmbaixadasMapaInterno),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">
        Carregando mapa…
      </div>
    ),
  }
);

interface Props {
  igrejas: IgrejaMapa[];
  igrejaSelecionadaId: number | null;
  onSelecionarIgreja: (id: number) => void;
}

export function EmbaixadasMapa({ igrejas, igrejaSelecionadaId, onSelecionarIgreja }: Props) {
  return (
    <div className="h-[350px] overflow-hidden rounded-lg border border-border bg-surface-2">
      <EmbaixadasMapaInterno
        igrejas={igrejas}
        igrejaSelecionadaId={igrejaSelecionadaId}
        onSelecionarIgreja={onSelecionarIgreja}
      />
    </div>
  );
}
