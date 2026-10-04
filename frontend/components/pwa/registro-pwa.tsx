"use client";

import { useEffect, useRef, useState } from "react";
import "@/lib/instalacao-pwa"; // só para o ouvinte de instalação já existir cedo (efeito colateral do módulo)

/**
 * Registra o service worker (apenas em produção — em `next dev` ele atrapalharia o recarregamento) e avisa quando
 * há uma versão nova esperando. Sem ação do usuário a versão antiga continua valendo, para não trocar o app no
 * meio de uma tarefa.
 */
export function RegistroPwa() {
  const [novaVersao, setNovaVersao] = useState<ServiceWorker | null>(null);
  const [dispensado, setDispensado] = useState(false);
  const recarregarAoTrocar = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let registro: ServiceWorkerRegistration | undefined;
    let cancelado = false;

    function verificarEspera(reg: ServiceWorkerRegistration) {
      // `controller` existente = já havia versão rodando; sem ele é a primeira instalação, que não precisa de aviso.
      if (reg.waiting && navigator.serviceWorker.controller) setNovaVersao(reg.waiting);
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        if (cancelado) return;
        registro = reg;
        verificarEspera(reg);
        reg.addEventListener("updatefound", () => {
          const instalando = reg.installing;
          instalando?.addEventListener("statechange", () => {
            if (instalando.state === "installed") verificarEspera(reg);
          });
        });
      })
      .catch(() => {
        // Sem service worker o site funciona normalmente, só não abre offline.
      });

    function aoTrocarDeVersao() {
      if (recarregarAoTrocar.current) window.location.reload();
    }
    // O app instalado raramente é recarregado: ao voltar para ele, procura versão nova.
    function aoVoltarParaApp() {
      if (document.visibilityState === "visible") registro?.update().catch(() => {});
    }

    navigator.serviceWorker.addEventListener("controllerchange", aoTrocarDeVersao);
    document.addEventListener("visibilitychange", aoVoltarParaApp);
    return () => {
      cancelado = true;
      navigator.serviceWorker.removeEventListener("controllerchange", aoTrocarDeVersao);
      document.removeEventListener("visibilitychange", aoVoltarParaApp);
    };
  }, []);

  function atualizar() {
    if (!novaVersao) return;
    recarregarAoTrocar.current = true;
    novaVersao.postMessage({ tipo: "PULAR_ESPERA" });
  }

  if (!novaVersao || dispensado) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-[70] rounded-lg border border-border bg-surface p-4 shadow-lg md:inset-x-auto md:bottom-4 md:right-4 md:max-w-sm"
    >
      <p className="text-sm font-medium text-text">Nova versão disponível</p>
      <p className="mt-0.5 text-sm text-text-muted">Atualize para usar as últimas melhorias.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={atualizar} className="btn-primary">
          Atualizar
        </button>
        <button type="button" onClick={() => setDispensado(true)} className="btn-ghost">
          Depois
        </button>
      </div>
    </div>
  );
}
