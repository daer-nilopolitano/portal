"use client";

import { useCallback, useEffect, useState } from "react";

// Evento não padronizado (Chrome/Edge/Android) que oferece o diálogo nativo de instalação.
interface EventoInstalacao extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// O navegador dispara `beforeinstallprompt` uma vez, cedo, e não repete. Por isso o ouvinte fica no escopo do módulo
// (carregado junto com o layout raiz) e guarda o evento até algum componente querer usá-lo.
let eventoGuardado: EventoInstalacao | null = null;
let jaInstalado = false;
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // segura o mini-aviso automático; quem decide quando mostrar é o nosso banner
    eventoGuardado = e as EventoInstalacao;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    eventoGuardado = null;
    jaInstalado = true;
    avisar();
  });
}

function estaEmModoApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function ehIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ se identifica como Mac; o toque múltiplo diferencia de um Mac de verdade.
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function useInstalacaoPwa() {
  const [instalado, setInstalado] = useState(false);
  const [podeInstalar, setPodeInstalar] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const atualizar = () => {
      setInstalado(jaInstalado || estaEmModoApp());
      setPodeInstalar(eventoGuardado !== null);
    };
    setIos(ehIos());
    atualizar();
    ouvintes.add(atualizar);
    return () => {
      ouvintes.delete(atualizar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!eventoGuardado) return;
    const evento = eventoGuardado;
    eventoGuardado = null; // o evento só pode ser usado uma vez
    avisar();
    await evento.prompt();
    await evento.userChoice;
  }, []);

  return { instalado, podeInstalar, ios, instalar };
}
