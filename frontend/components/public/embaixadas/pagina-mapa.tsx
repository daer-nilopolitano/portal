"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, List, MapPin, User, X } from "lucide-react";
import { ComoChegar } from "@/components/public/embaixadas/como-chegar";
import { MapaDinamico } from "@/components/public/embaixadas/mapa";
import { conselheirosResponsaveis, enderecoCompleto, horariosReuniao } from "@/lib/embaixadas";
import type { EmbaixadaDestaque } from "@/lib/types";

function Detalhes({ igreja }: { igreja: EmbaixadaDestaque }) {
  const noMapa = igreja.latitude !== null && igreja.longitude !== null;
  return (
    <div className="space-y-3 text-sm text-text-muted">
      <p className="text-base text-text">Embaixada: {igreja.embaixada_nome}</p>
      <div className="flex items-start gap-2">
        <MapPin size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words leading-relaxed">{enderecoCompleto(igreja)}</span>
      </div>
      <div className="flex items-start gap-2">
        <Clock size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words leading-relaxed">{horariosReuniao(igreja)}</span>
      </div>
      <div className="flex items-start gap-2">
        <User size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words leading-relaxed">{conselheirosResponsaveis(igreja)}</span>
      </div>
      {!noMapa && <p className="text-xs">Esta igreja ainda não aparece no mapa, mas o "Como chegar" usa o endereço.</p>}
      <ComoChegar igreja={igreja} />
    </div>
  );
}

interface ListaProps {
  igrejas: EmbaixadaDestaque[];
  selecionadaId: number | null;
  onSelecionar: (id: number) => void;
  /** Na lista lateral (tela larga) a igreja escolhida abre os detalhes ali mesmo; no celular eles ficam no cartão sobre o mapa. */
  expandirSelecionada: boolean;
}

function Lista({ igrejas, selecionadaId, onSelecionar, expandirSelecionada }: ListaProps) {
  return (
    <ul className="divide-y divide-border">
      {igrejas.map((igreja) => {
        const selecionada = igreja.id === selecionadaId;
        return (
          <li key={igreja.id} className={selecionada ? "bg-primary/5" : undefined}>
            <button
              type="button"
              onClick={() => onSelecionar(igreja.id)}
              aria-pressed={selecionada}
              className="flex min-h-[56px] w-full flex-col items-start px-4 py-3 text-left hover:bg-surface-2"
            >
              <span className="break-words font-heading font-semibold text-primary">{igreja.nome}</span>
              <span className="text-sm text-text-muted">
                {[igreja.bairro, igreja.municipio].filter(Boolean).join(" — ")}
              </span>
            </button>
            {expandirSelecionada && selecionada && (
              <div className="px-4 pb-4">
                <Detalhes igreja={igreja} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Página /embaixadas: mapa em tela cheia.
 * - Tela larga: lista à esquerda (a escolhida abre os detalhes) e mapa à direita.
 * - Celular: mapa ocupando tudo; tocar num pin mostra um cartão embaixo, e o botão "Lista" abre todas as embaixadas.
 */
export function PaginaEmbaixadas({ igrejas }: { igrejas: EmbaixadaDestaque[] }) {
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null);
  const [listaAberta, setListaAberta] = useState(false);
  const selecionada = igrejas.find((igreja) => igreja.id === selecionadaId) ?? null;

  function selecionar(id: number) {
    setSelecionadaId(id);
    setListaAberta(false);
  }

  useEffect(() => {
    if (!listaAberta) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setListaAberta(false);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [listaAberta]);

  return (
    // pb: a área segura (barra de gestos do iPhone) fica fora do mapa, e a atribuição do OpenStreetMap continua visível.
    <div className="flex h-app flex-col bg-background pb-[env(safe-area-inset-bottom,0px)]">
      <header className="flex h-14 flex-shrink-0 items-center gap-1 border-b border-border bg-surface px-2">
        <Link
          href="/#embaixadas"
          className="flex h-11 flex-shrink-0 items-center gap-1 rounded-md px-2 text-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Início
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center font-heading text-base font-semibold text-primary md:pl-2 md:text-left">
          Embaixadas
        </h1>
        {igrejas.length > 0 && (
          <button
            type="button"
            onClick={() => setListaAberta(true)}
            className="flex h-11 flex-shrink-0 items-center gap-1 rounded-md px-3 text-sm text-primary hover:bg-surface-2 md:hidden"
          >
            <List size={18} aria-hidden="true" />
            Lista
          </button>
        )}
      </header>

      {igrejas.length === 0 ? (
        <p className="flex flex-1 items-center justify-center p-6 text-center text-sm text-text-muted">
          Nenhuma embaixada cadastrada ainda.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside
            aria-label="Lista de embaixadas"
            className="hidden w-96 flex-shrink-0 overflow-y-auto border-r border-border bg-surface md:block"
          >
            <Lista igrejas={igrejas} selecionadaId={selecionadaId} onSelecionar={selecionar} expandirSelecionada />
          </aside>

          <div className="relative min-w-0 flex-1">
            {/* isolate: os controles do Leaflet têm z-index alto e não podem ficar por cima do cartão e da lista. */}
            <div className="absolute inset-0 isolate">
              <MapaDinamico
                igrejas={igrejas}
                igrejaSelecionadaId={selecionadaId}
                onSelecionarIgreja={selecionar}
                interativo
                scrollWheelZoom
                comPopup={false}
                ajustarAosPins
              />
            </div>

            {selecionada && (
              <div className="absolute inset-x-3 bottom-8 z-10 max-h-[55%] overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-lg md:hidden">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words font-heading text-lg font-semibold text-primary">{selecionada.nome}</p>
                  <button
                    type="button"
                    onClick={() => setSelecionadaId(null)}
                    aria-label="Fechar detalhes"
                    className="-mr-2 -mt-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-2"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-2">
                  <Detalhes igreja={selecionada} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {listaAberta && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setListaAberta(false)}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
          />
          <div
            role="dialog"
            aria-label="Lista de embaixadas"
            className="fixed inset-x-0 bottom-0 z-40 flex max-h-[75dvh] flex-col rounded-t-2xl border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)] shadow-xl md:hidden"
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Embaixadas ({igrejas.length})
              </p>
              <button
                type="button"
                onClick={() => setListaAberta(false)}
                aria-label="Fechar lista"
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-text-muted hover:bg-surface-2"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain">
              <Lista
                igrejas={igrejas}
                selecionadaId={selecionadaId}
                onSelecionar={selecionar}
                expandirSelecionada={false}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
