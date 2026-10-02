"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, KeyRound, LogOut, MonitorOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ROTULO_TIPO } from "@/lib/labels";

interface Props {
  /**
   * `sidebar`: cartão no pé da barra lateral (nome + usuário ao lado do círculo; o menu abre para cima).
   * `header`: só o círculo com a inicial, no cabeçalho (o menu abre para baixo).
   */
  variante: "sidebar" | "header";
}

/** Menu da conta: círculo com a inicial do nome e as operações de senha/sessão. */
export function MenuUsuario({ variante }: Props) {
  const { membro, logout, sairDeTodos } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const idPainel = useId();

  // Fecha ao clicar fora ou com Esc (devolvendo o foco ao botão).
  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: PointerEvent) {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    }
    document.addEventListener("pointerdown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("pointerdown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  if (!membro) return null;

  const inicial = membro.nome.trim().charAt(0).toUpperCase() || "?";
  const rotuloTipo = ROTULO_TIPO[membro.tipo];

  async function encerrarTodasAsSessoes() {
    if (!window.confirm("Sair de todos os dispositivos, inclusive deste? Você precisará entrar de novo.")) return;
    setErro(null);
    setEncerrando(true);
    try {
      await sairDeTodos(); // em caso de sucesso a sessão local acaba e o AppShell leva para /login
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível encerrar as sessões.");
      setEncerrando(false);
    }
  }

  const circulo = (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-daer-yellow text-lg font-bold text-black"
    >
      {inicial}
    </span>
  );

  const itemClasse =
    "flex min-h-[44px] w-full items-center gap-2 rounded px-3 text-left text-sm text-text hover:bg-surface-2 disabled:opacity-60";

  return (
    <div ref={raiz} className="relative">
      {variante === "sidebar" ? (
        <button
          ref={botao}
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          aria-expanded={aberto}
          aria-controls={aberto ? idPainel : undefined}
          className="flex min-h-[44px] w-full items-center gap-3 rounded px-2 py-1 text-left text-white hover:bg-white/10"
        >
          {circulo}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{membro.nome}</span>
            <span className="block truncate text-xs text-white/70">{membro.usuario || rotuloTipo}</span>
          </span>
          {aberto ? (
            <ChevronDown size={16} aria-hidden="true" className="flex-shrink-0" />
          ) : (
            <ChevronUp size={16} aria-hidden="true" className="flex-shrink-0" />
          )}
        </button>
      ) : (
        <button
          ref={botao}
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          aria-expanded={aberto}
          aria-controls={aberto ? idPainel : undefined}
          aria-label={`Menu da conta de ${membro.nome}`}
          className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {circulo}
        </button>
      )}

      {aberto && (
        <div
          id={idPainel}
          className={`absolute z-30 rounded-lg border border-border bg-surface p-2 text-text shadow-lg ${
            variante === "sidebar" ? "bottom-full left-0 right-0 mb-2" : "right-0 top-full mt-2 w-64"
          }`}
        >
          <div className="border-b border-border px-3 pb-2 pt-1">
            <p className="truncate text-sm font-medium text-text">{membro.nome}</p>
            <p className="truncate text-xs text-text-muted">{rotuloTipo}</p>
            {membro.usuario && <p className="truncate text-xs text-text-muted">Usuário: {membro.usuario}</p>}
          </div>

          <div className="mt-1">
            <Link href="/trocar-senha" onClick={() => setAberto(false)} className={itemClasse}>
              <KeyRound size={16} aria-hidden="true" />
              Alterar senha
            </Link>
            <button type="button" onClick={encerrarTodasAsSessoes} disabled={encerrando} className={itemClasse}>
              <MonitorOff size={16} aria-hidden="true" />
              {encerrando ? "Encerrando…" : "Sair de todos os dispositivos"}
            </button>
            <button type="button" onClick={logout} className={itemClasse}>
              <LogOut size={16} aria-hidden="true" />
              Sair
            </button>
          </div>

          {erro && (
            <p role="alert" className="px-3 pb-1 pt-2 text-xs text-danger">
              {erro}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
