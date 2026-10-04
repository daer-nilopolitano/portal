"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useInstalacaoPwa } from "@/lib/instalacao-pwa";

const CHAVE_DISPENSADO = "daer_instalar_dispensado";
const DIAS_ESCONDIDO = 30;

/**
 * Convite para instalar o app. Só aparece quando faz sentido: não está instalado e (Android/Chrome) o navegador
 * liberou a instalação ou (iPhone/iPad) é preciso ensinar o caminho manual. "Agora não" esconde por 30 dias.
 */
export function BannerInstalar() {
  const { instalado, podeInstalar, ios, instalar } = useInstalacaoPwa();
  // Começa escondido até ler o armazenamento, para não piscar na tela de quem já dispensou.
  const [dispensado, setDispensado] = useState(true);
  const [mostrarComoInstalar, setMostrarComoInstalar] = useState(false);

  useEffect(() => {
    try {
      const quando = Number(localStorage.getItem(CHAVE_DISPENSADO));
      setDispensado(Boolean(quando) && Date.now() - quando < DIAS_ESCONDIDO * 24 * 60 * 60 * 1000);
    } catch {
      setDispensado(false);
    }
  }, []);

  function dispensar() {
    try {
      localStorage.setItem(CHAVE_DISPENSADO, String(Date.now()));
    } catch {
      // sem armazenamento: some só nesta visita
    }
    setDispensado(true);
  }

  if (instalado || dispensado || (!podeInstalar && !ios)) return null;

  return (
    <section aria-label="Instalar aplicativo" className="mb-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Download size={20} className="mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">Instale o app do DAER Nilopolitano</p>
          <p className="mt-0.5 text-sm text-text-muted">Acesso rápido pela tela inicial do celular, em tela cheia.</p>

          {ios && mostrarComoInstalar && (
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-text">
              <li>
                Toque em <Share size={14} className="inline align-text-bottom" aria-hidden="true" />{" "}
                <strong>Compartilhar</strong>, na barra do navegador.
              </li>
              <li>
                Escolha <strong>Adicionar à Tela de Início</strong> e confirme.
              </li>
              <li>Abra o app pelo novo ícone e entre com seu login (no iPhone o app instalado pede o login de novo).</li>
            </ol>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {podeInstalar ? (
              <button type="button" onClick={instalar} className="btn-primary">
                Instalar
              </button>
            ) : (
              <button type="button" onClick={() => setMostrarComoInstalar((atual) => !atual)} className="btn-primary">
                {mostrarComoInstalar ? "Ocultar passos" : "Como instalar"}
              </button>
            )}
            <button type="button" onClick={dispensar} className="btn-ghost">
              Agora não
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dispensar}
          aria-label="Fechar"
          className="-mr-2 -mt-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-2"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
