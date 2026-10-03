"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { rotaAtiva, type ItemNav } from "@/components/layout/itens-nav";

interface Props {
  principais: ItemNav[];
  /** Itens que não cabem na barra; ficam na folha "Mais". Sem extras, o botão "Mais" não aparece. */
  extras: ItemNav[];
}

const CLASSE_ITEM =
  "flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] leading-tight tracking-tight";

/** Barra inferior do painel no celular (some a partir de md, onde entra a gaveta lateral). */
export function NavegacaoInferior({ principais, extras }: Props) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const botaoMais = useRef<HTMLButtonElement>(null);

  // Trocou de página: fecha a folha.
  useEffect(() => {
    setMaisAberto(false);
  }, [pathname]);

  // Folha aberta: Esc fecha, a página atrás não rola e, se a janela passar de md (a barra some), ela fecha sozinha.
  useEffect(() => {
    if (!maisAberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMaisAberto(false);
        botaoMais.current?.focus();
      }
    }
    const media = window.matchMedia("(min-width: 768px)");
    function aoMudarLargura() {
      if (media.matches) setMaisAberto(false);
    }
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", aoTeclar);
    media.addEventListener("change", aoMudarLargura);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener("keydown", aoTeclar);
      media.removeEventListener("change", aoMudarLargura);
    };
  }, [maisAberto]);

  const extraAtivo = extras.some((item) => rotaAtiva(pathname, item.href));

  return (
    <>
      {maisAberto && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setMaisAberto(false)}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
          />
          <div
            id="navegacao-mais"
            role="dialog"
            aria-label="Mais opções"
            className="fixed inset-x-0 bottom-0 z-40 max-h-[80dvh] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-border bg-surface px-3 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] shadow-xl md:hidden"
          >
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Mais</p>
            <ul>
              {extras.map((item) => {
                const ativo = rotaAtiva(pathname, item.href);
                const Icone = item.icone;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMaisAberto(false)}
                      aria-current={ativo ? "page" : undefined}
                      className={`flex min-h-[48px] items-center gap-3 rounded-lg px-3 text-base ${
                        ativo ? "bg-primary/10 font-medium text-primary" : "text-text hover:bg-surface-2"
                      }`}
                    >
                      <Icone size={20} aria-hidden="true" />
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      >
        {principais.map((item) => {
          const ativo = rotaAtiva(pathname, item.href);
          const Icone = item.icone;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={`${CLASSE_ITEM} ${ativo ? "font-semibold text-primary" : "text-text-muted"}`}
            >
              <Icone size={22} aria-hidden="true" />
              <span className="max-w-full truncate">{item.rotuloCurto ?? item.rotulo}</span>
            </Link>
          );
        })}

        {extras.length > 0 && (
          <button
            ref={botaoMais}
            type="button"
            onClick={() => setMaisAberto((atual) => !atual)}
            aria-expanded={maisAberto}
            aria-controls={maisAberto ? "navegacao-mais" : undefined}
            className={`${CLASSE_ITEM} ${maisAberto || extraAtivo ? "font-semibold text-primary" : "text-text-muted"}`}
          >
            <MoreHorizontal size={22} aria-hidden="true" />
            <span>Mais</span>
          </button>
        )}
      </nav>
    </>
  );
}
