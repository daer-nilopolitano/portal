"use client";

import Image from "next/image";
import { useState } from "react";
import type { NoticiaFoto } from "@/lib/types";
import { NoticiaLightbox } from "./lightbox";

interface Props {
  fotos: NoticiaFoto[];
}

export function NoticiaGaleria({ fotos }: Props) {
  const [indiceAberto, setIndiceAberto] = useState<number | null>(null);

  if (fotos.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="font-heading text-lg font-semibold text-primary">Fotos</h2>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fotos.map((foto, indice) => (
          <button
            key={indice}
            type="button"
            onClick={() => setIndiceAberto(indice)}
            aria-label={`Ampliar foto ${indice + 1}${foto.legenda ? `: ${foto.legenda}` : ""}`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
          >
            {foto.imagem ? (
              <Image
                src={foto.imagem.full_url ?? foto.imagem.url}
                alt={foto.imagem.alt || foto.legenda || ""}
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : null}
          </button>
        ))}
      </div>

      {indiceAberto !== null ? (
        <NoticiaLightbox fotos={fotos} indiceInicial={indiceAberto} onFechar={() => setIndiceAberto(null)} />
      ) : null}
    </div>
  );
}
