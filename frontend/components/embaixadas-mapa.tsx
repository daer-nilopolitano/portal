"use client";

import dynamic from "next/dynamic";
import type { IgrejaMapa } from "@/components/embaixadas-mapa-interno";

const EmbaixadasMapaInterno = dynamic(
  () => import("@/components/embaixadas-mapa-interno").then((m) => m.EmbaixadasMapaInterno),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
        Carregando mapa…
      </div>
    ),
  }
);

export function EmbaixadasMapa({ igrejas }: { igrejas: IgrejaMapa[] }) {
  return (
    <div className="h-[350px] overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <EmbaixadasMapaInterno igrejas={igrejas} />
    </div>
  );
}
