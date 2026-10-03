"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ROTULO_TIPO } from "@/lib/labels";
import { NOME_SITE } from "@/lib/content/site";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MenuUsuario } from "@/components/layout/menu-usuario";
import { NavegacaoInferior } from "@/components/layout/navegacao-inferior";
import { dividirParaBarra, itensDoTipo, rotaAtiva } from "@/components/layout/itens-nav";

const ID_GAVETA = "navegacao-lateral";

/**
 * Moldura da área logada. Três modos conforme a largura da janela:
 * - lg ou mais (>= 1024px): sidebar fixa à esquerda;
 * - md até lg (768–1023px, ex.: janela pequena no desktop ou tablet): a sidebar vira uma gaveta deslizante,
 *   aberta pelo botão de menu do cabeçalho;
 * - abaixo de md (celular): barra inferior com os itens principais e "Mais".
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { membro, carregando } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const botaoMenu = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!carregando && !membro) router.replace("/login");
  }, [carregando, membro, router]);

  // Trocou de página: fecha a gaveta.
  useEffect(() => {
    setGavetaAberta(false);
  }, [pathname]);

  // Gaveta aberta: Esc fecha, a página atrás não rola e, ao esticar a janela até lg (onde a sidebar fica fixa), fecha sozinha.
  useEffect(() => {
    if (!gavetaAberta) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setGavetaAberta(false);
        botaoMenu.current?.focus();
      }
    }
    const media = window.matchMedia("(min-width: 1024px)");
    function aoMudarLargura() {
      if (media.matches) setGavetaAberta(false);
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
  }, [gavetaAberta]);

  if (carregando) {
    return <div className="flex min-h-app items-center justify-center text-primary">Carregando…</div>;
  }
  if (!membro) return null;

  const itensVisiveis = itensDoTipo(membro.tipo);
  const { principais, extras } = dividirParaBarra(itensVisiveis);

  return (
    <div className="flex min-h-app">
      {gavetaAberta && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setGavetaAberta(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <aside
        id={ID_GAVETA}
        className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] flex-shrink-0 bg-chrome text-white transition-[transform,visibility] duration-200 lg:static lg:z-auto lg:w-60 lg:max-w-none lg:visible lg:translate-x-0 ${
          gavetaAberta ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col lg:h-auto lg:[@media(min-height:40rem)]:sticky lg:[@media(min-height:40rem)]:top-0 lg:[@media(min-height:40rem)]:h-screen">
          <div className="flex h-20 flex-shrink-0 items-center border-b border-white/10 pr-2">
            <Link href="/painel" className="flex h-full min-w-0 flex-1 items-center gap-1 px-4">
              <Image src="/logo.png" alt="logo" width={32} height={32} className="h-10 w-auto" priority />
              <span className="truncate font-heading text-base font-semibold">{NOME_SITE}</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setGavetaAberta(false);
                botaoMenu.current?.focus();
              }}
              aria-label="Fechar menu"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-white/80 hover:bg-white/10 lg:hidden"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Navegação do painel" className="flex-1 overflow-y-auto px-3 py-3">
            {itensVisiveis.map((item) => {
              const ativo = rotaAtiva(pathname, item.href);
              const Icone = item.icone;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setGavetaAberta(false)}
                  aria-current={ativo ? "page" : undefined}
                  className={`mb-1 flex min-h-[44px] items-center gap-3 rounded border-l-4 px-3 text-sm ${
                    ativo ? "border-daer-yellow bg-white/10 font-medium" : "border-transparent text-white/80 hover:bg-white/10"
                  }`}
                >
                  <Icone size={18} aria-hidden="true" className="flex-shrink-0" />
                  {item.rotulo}
                </Link>
              );
            })}
          </nav>
          <div className="flex-shrink-0 border-t border-white/10 p-3">
            <MenuUsuario variante="sidebar" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6 lg:h-20 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              ref={botaoMenu}
              type="button"
              onClick={() => setGavetaAberta((atual) => !atual)}
              aria-label="Abrir menu"
              aria-expanded={gavetaAberta}
              aria-controls={ID_GAVETA}
              className="hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-text hover:bg-surface-2 md:flex lg:hidden"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <Link href="/painel" aria-label={NOME_SITE} className="flex-shrink-0 md:hidden">
              <Image src="/logo.png" alt="" width={32} height={32} className="h-9 w-auto" priority />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm text-text-muted">{membro.tipo ? ROTULO_TIPO[membro.tipo] : "Sem tipo definido"}</p>
              <p className="truncate font-heading text-base font-semibold text-primary">{membro.nome}</p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <ThemeToggle />
            <MenuUsuario variante="header" />
          </div>
        </header>
        <main className="flex-1 px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pt-6 md:pb-6 lg:px-8 lg:pt-8 lg:pb-8">
          {children}
        </main>
      </div>

      <NavegacaoInferior principais={principais} extras={extras} />
    </div>
  );
}
