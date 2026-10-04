"use client";

import { ChevronLeft, ChevronRight, Clock, MapPin, User } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect } from "react";
import { ComoChegar } from "@/components/public/embaixadas/como-chegar";
import { conselheirosResponsaveis, enderecoCompleto, horariosReuniao } from "@/lib/embaixadas";
import { useMediaQuery } from "@/lib/use-media-query";
import type { EmbaixadaDestaque } from "@/lib/types";

const INTERVALO_MS = 6000;

interface Props {
  igrejas: EmbaixadaDestaque[];
  igrejaSelecionadaId: number | null;
  onSelecionarIgreja: (id: number) => void;
  pausado: boolean;
}

export function EmbaixadasCarrossel({ igrejas, igrejaSelecionadaId, onSelecionarIgreja, pausado }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  // Troca automática só com mouse (que pausa ao passar por cima) e sem "reduzir movimento". No toque ela mudaria o
  // cartão e moveria o mapa enquanto a pessoa lê ou rola a página.
  const mouseDisponivel = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduzirMovimento = useMediaQuery("(prefers-reduced-motion: reduce)");
  const autoplayPermitido = mouseDisponivel && !reduzirMovimento;

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
    if (!emblaApi || !autoplayPermitido || pausado || igrejas.length <= 1) return;
    const id = setInterval(() => emblaApi.scrollNext(), INTERVALO_MS);
    return () => clearInterval(id);
  }, [emblaApi, autoplayPermitido, pausado, igrejas.length]);

  if (igrejas.length === 0) {
    return (
      <div className="flex min-h-[350px] items-center justify-center rounded-lg border border-border bg-surface p-4 text-center text-sm text-text-muted">
        Nenhuma embaixada cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[350px] flex-col justify-between gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {igrejas.map((igreja) => (
            <div key={igreja.id} aria-hidden={igreja.id !== igrejaSelecionadaId} className="min-w-0 flex-[0_0_100%]">
              <p className="break-words font-heading text-xl font-semibold text-primary">{igreja.nome}</p>
              <p className="text-lg text-text-muted mt-3">Embaixada: {igreja.embaixada_nome}</p>
              <div className="mt-4 space-y-3 text-sm text-text-muted">
                <div className="flex items-start gap-2 mt-5">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="min-w-0 break-words leading-relaxed">{enderecoCompleto(igreja)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={16} className="mt-0.5 flex-shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="min-w-0 break-words leading-relaxed">{horariosReuniao(igreja)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <User size={16} className="mt-0.5 flex-shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="min-w-0 break-words leading-relaxed">{conselheirosResponsaveis(igreja)}</span>
                </div>
              </div>
              <div className="mt-5">
                <ComoChegar igreja={igreja} tabIndex={igreja.id === igrejaSelecionadaId ? undefined : -1} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={scrollAnterior} aria-label="Embaixada anterior" className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-text-muted hover:border-primary hover:text-primary">
          <ChevronLeft size={16} />
        </button>

        {/* Celular: contador no lugar dos pontinhos (com muitas embaixadas eles não cabem na largura). */}
        <p className="text-sm text-text-muted sm:hidden" aria-live="polite">
          {Math.max(igrejas.findIndex((igreja) => igreja.id === igrejaSelecionadaId), 0) + 1} / {igrejas.length}
        </p>
        <div className="hidden min-w-0 flex-wrap justify-center gap-1 sm:flex">
          {igrejas.map((igreja) => (
            <button
              key={igreja.id}
              onClick={() => onSelecionarIgreja(igreja.id)}
              aria-label={`Ir para ${igreja.nome}`}
              className="flex h-6 w-6 items-center justify-center"
            >
              <span
                className={`block rounded-full transition-all ${
                  igreja.id === igrejaSelecionadaId
                    ? "h-2 w-5 bg-accent"
                    : "h-2 w-2 bg-text-muted/40"
                }`}
              />
            </button>
          ))}
        </div>

        <button onClick={scrollProximo} aria-label="Próxima embaixada" className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-text-muted hover:border-primary hover:text-primary">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
