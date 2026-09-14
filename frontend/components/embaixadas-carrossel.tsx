"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect } from "react";
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

interface Props {
  igrejas: Igreja[];
  igrejaSelecionadaId: number | null;
  onSelecionarIgreja: (id: number) => void;
  pausado: boolean;
}

export function EmbaixadasCarrossel({ igrejas, igrejaSelecionadaId, onSelecionarIgreja, pausado }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollAnterior = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollProximo = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Carrossel -> pai: avisa qual igreja ficou visível (autoplay, arraste ou setas)
  useEffect(() => {
    if (!emblaApi) return;
    const aoSelecionar = () => {
      const igreja = igrejas[emblaApi.selectedScrollSnap()];
      if (igreja) onSelecionarIgreja(igreja.id);
    };
    emblaApi.on("select", aoSelecionar);
    return () => {
      emblaApi.off("select", aoSelecionar);
    };
  }, [emblaApi, igrejas, onSelecionarIgreja]);

  useEffect(() => {
    if (!emblaApi || igrejaSelecionadaId === null) return;
    const indiceAlvo = igrejas.findIndex((igreja) => igreja.id === igrejaSelecionadaId);
    if (indiceAlvo !== -1 && emblaApi.selectedScrollSnap() !== indiceAlvo) {
      emblaApi.scrollTo(indiceAlvo);
    }
  }, [emblaApi, igrejaSelecionadaId, igrejas]);

  useEffect(() => {
    if (!emblaApi || pausado || igrejas.length <= 1) return;
    const id = setInterval(() => emblaApi.scrollNext(), INTERVALO_MS);
    return () => clearInterval(id);
  }, [emblaApi, pausado, igrejas.length]);

  if (igrejas.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center rounded-lg border border-border bg-surface text-sm text-text-muted">
        Nenhuma embaixada cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="relative flex h-[350px] flex-col justify-between rounded-lg border border-border bg-surface p-6">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {igrejas.map((igreja) => (
            <div key={igreja.id} className="min-w-0 flex-[0_0_100%]">
              <p className="font-heading text-lg font-semibold text-primary">{igreja.nome}</p>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {enderecoCompleto(igreja)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={scrollAnterior} aria-label="Embaixada anterior" className="rounded-full border border-border p-2 text-text-muted hover:border-primary hover:text-primary">
          <ChevronLeft size={16} />
        </button>

        <div className="flex gap-1.5">
          {igrejas.map((igreja) => (
            <button
              key={igreja.id}
              onClick={() => onSelecionarIgreja(igreja.id)}
              aria-label={`Ir para ${igreja.nome}`}
              className={`h-1.5 w-1.5 rounded-full ${
                igreja.id === igrejaSelecionadaId ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>

        <button onClick={scrollProximo} aria-label="Próxima embaixada" className="rounded-full border border-border p-2 text-text-muted hover:border-primary hover:text-primary">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
