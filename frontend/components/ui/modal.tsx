"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  /** Impede fechar com Esc (ex.: enquanto envia, ou enquanto uma senha gerada ainda não foi anotada). */
  bloqueado?: boolean;
  children: ReactNode;
}

/**
 * Janela modal sobre o elemento nativo <dialog>: o navegador já cuida do foco preso dentro da janela, do Esc e de
 * deixar o resto da página inerte. Não fecha ao clicar fora, para ninguém perder o que digitou sem querer.
 * O conteúdo só é montado enquanto estiver aberta, então o estado dos filhos reinicia a cada abertura.
 */
export function Modal({ aberto, titulo, onFechar, bloqueado = false, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        if (bloqueado) e.preventDefault();
      }}
      // O evento "close" também dispara quando o pai fecha a janela (aberto = false); aí não há nada a fazer.
      onClose={() => {
        if (aberto) onFechar();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface p-0 text-text shadow-xl backdrop:bg-black/50"
    >
      {aberto && (
        <div className="p-5">
          <h2 id={idTitulo} className="font-heading text-lg font-semibold text-primary">
            {titulo}
          </h2>
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
