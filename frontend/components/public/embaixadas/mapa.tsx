"use client";

import dynamic from "next/dynamic";
import type { IgrejaMapa } from "@/components/public/embaixadas/mapa-interno";
import { useMediaQuery } from "@/lib/use-media-query";

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

// Só dá para arrastar/dar zoom no mapa com mouse e tela larga. No toque o mapa vira "só visualização": o dedo sobre
// ele rola a página (em vez de ficar preso no mapa) e tocar num pin continua selecionando a embaixada.
const CONSULTA_MAPA_INTERATIVO = "(min-width: 768px) and (hover: hover) and (pointer: fine)";

export function EmbaixadasMapa({ igrejas, igrejaSelecionadaId, onSelecionarIgreja }: Props) {
  const interativo = useMediaQuery(CONSULTA_MAPA_INTERATIVO);

  // Altura fixa só no celular (coluna única). Do md em diante o mapa acompanha a altura do cartão ao lado:
  // o wrapper estica na grade e o mapa preenche com `absolute inset-0`.
  return (
    <div className="relative h-[260px] overflow-hidden rounded-lg border border-border bg-surface-2 md:h-auto md:min-h-[350px]">
      <div className="absolute inset-0">
        <EmbaixadasMapaInterno
          igrejas={igrejas}
          igrejaSelecionadaId={igrejaSelecionadaId}
          onSelecionarIgreja={onSelecionarIgreja}
          interativo={interativo}
        />
      </div>
    </div>
  );
}
