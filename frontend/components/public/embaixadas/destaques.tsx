"use client";

import Link from "next/link";
import { useState } from "react";
import { Map as MapIcon } from "lucide-react";
import type { EmbaixadaDestaque } from "@/lib/types";
import { EmbaixadasCarrossel } from "@/components/public/embaixadas/carrossel";
import { EmbaixadasMapa } from "@/components/public/embaixadas/mapa";

export function EmbaixadasDestaques({ igrejas }: { igrejas: EmbaixadaDestaque[] }) {
  const [igrejaSelecionadaId, setIgrejaSelecionadaId] = useState<number | null>(
    igrejas[0]?.id ?? null
  );
  const [pausado, setPausado] = useState(false);

  // minmax(0,1fr) no celular: sem isso a coluna cresce até caber o conteúdo (ex.: a linha de pontinhos) e a página
  // fica mais larga que a tela.
  return (
    <div className="mt-8 md:mt-12">
      <div
        className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2 md:gap-8"
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

      {/* No celular o mini-mapa é só visualização; a página própria tem o mapa em tela cheia, para arrastar e dar zoom. */}
      {igrejas.length > 0 && (
        <div className="mt-6 text-center">
          <Link href="/embaixadas" className="btn-outline">
            <MapIcon size={18} aria-hidden="true" />
            Abrir mapa em tela cheia
          </Link>
        </div>
      )}
    </div>
  );
}
