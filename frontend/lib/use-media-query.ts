"use client";

import { useEffect, useState } from "react";

/**
 * Acompanha uma media query no navegador. Começa em `false` (igual ao servidor, que não conhece a tela) e corrige
 * logo depois de montar, para não divergir do HTML renderizado e causar erro de hidratação.
 */
export function useMediaQuery(consulta: string): boolean {
  const [corresponde, setCorresponde] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(consulta);
    const atualizar = () => setCorresponde(media.matches);
    atualizar();
    media.addEventListener("change", atualizar);
    return () => media.removeEventListener("change", atualizar);
  }, [consulta]);

  return corresponde;
}
