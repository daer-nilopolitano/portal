"use client";

import Fade from "embla-carousel-fade";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { NoticiaFoto } from "@/lib/types";

interface Props {
  fotos: NoticiaFoto[];
  indiceInicial: number;
  onFechar: () => void;
}

export function NoticiaLightbox({ fotos, indiceInicial, onFechar }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, startIndex: indiceInicial }, [Fade()]);
  const [slideAtual, setSlideAtual] = useState(indiceInicial);

  // Trava o scroll da página enquanto a galeria em tela cheia está aberta.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const aoSelecionar = () => setSlideAtual(emblaApi.selectedScrollSnap());
    emblaApi.on("select", aoSelecionar);
    return () => {
      emblaApi.off("select", aoSelecionar);
    };
  }, [emblaApi]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onFechar();
      if (evento.key === "ArrowLeft") emblaApi?.scrollPrev();
      if (evento.key === "ArrowRight") emblaApi?.scrollNext();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [emblaApi, onFechar]);

  const legendaAtual = fotos[slideAtual]?.legenda;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Galeria de fotos em tela cheia"
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={onFechar}
    >
      <button
        onClick={onFechar}
        aria-label="Fechar galeria"
        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 sm:right-4 sm:top-4"
      >
        <X size={20} />
      </button>

      {fotos.length > 1 ? (
        <span className="absolute left-4 top-4 z-10 text-sm text-white/80">
          {slideAtual + 1} / {fotos.length}
        </span>
      ) : null}

      <div className="relative flex flex-1 items-center justify-center px-4" onClick={(evento) => evento.stopPropagation()}>
        <div className="relative h-[75vh] w-full max-w-4xl overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {fotos.map((foto, indice) => (
              <div key={indice} className="relative h-full min-w-0 flex-[0_0_100%]">
                {foto.imagem ? (
                  <Image
                    src={foto.imagem.full_url ?? foto.imagem.url}
                    alt={foto.imagem.alt || foto.legenda || ""}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    priority={indice === indiceInicial}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {fotos.length > 1 ? (
          <>
            <button
              onClick={() => emblaApi?.scrollPrev()}
              aria-label="Foto anterior"
              className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 sm:left-4"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              aria-label="Próxima foto"
              className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 sm:right-4"
            >
              <ChevronRight size={20} />
            </button>
          </>
        ) : null}
      </div>

      {legendaAtual ? (
        <p className="px-6 pb-6 text-center text-sm text-white/80" onClick={(evento) => evento.stopPropagation()}>
          {legendaAtual}
        </p>
      ) : null}
    </div>
  );
}
