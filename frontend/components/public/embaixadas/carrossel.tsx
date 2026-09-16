"use client";

import { ChevronLeft, ChevronRight, Clock, MapPin, User } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect } from "react";
import type { EmbaixadaDestaque } from "@/lib/types";

const INTERVALO_MS = 6000;

function enderecoCompleto(igreja: EmbaixadaDestaque) {
  return [
    [igreja.rua, igreja.numero].filter(Boolean).join(", "),
    igreja.complemento,
    igreja.bairro,
    igreja.municipio,
  ]
    .filter(Boolean)
    .join(" — ");
}

function horariosReuniao(destaque: EmbaixadaDestaque) {
  if (destaque.horarios_reuniao.length === 0) {
    return "Horário de reunião: a definir";
  }
  const rotulo = destaque.horarios_reuniao.length > 1 ? "Reuniões" : "Reunião";
  const lista = destaque.horarios_reuniao.map((h) => `${h.dia_semana}, ${h.horario}`).join(" / ");
  return `${rotulo}: ${lista}`;
}

function conselheirosResponsaveis(destaque: EmbaixadaDestaque) {
  if (destaque.conselheiros_nomes.length === 0) {
    return "Conselheiro responsável: a definir";
  }
  const rotulo = destaque.conselheiros_nomes.length > 1 ? "Conselheiros" : "Conselheiro responsável";
  return `${rotulo}: ${destaque.conselheiros_nomes.join(", ")}`;
}

interface Props {
  igrejas: EmbaixadaDestaque[];
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
              <p className="text-xs text-text-muted">{igreja.embaixada_nome}</p>

              <div className="mt-4 space-y-3 text-sm text-text-muted">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="line-clamp-2 leading-relaxed">{enderecoCompleto(igreja)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={16} className="mt-0.5 flex-shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="leading-relaxed">{horariosReuniao(igreja)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <User size={16} className="mt-0.5 flex-shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="leading-relaxed">{conselheirosResponsaveis(igreja)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={scrollAnterior} aria-label="Embaixada anterior" className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-text-muted hover:border-primary hover:text-primary">
          <ChevronLeft size={16} />
        </button>

        <div className="flex gap-1">
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
