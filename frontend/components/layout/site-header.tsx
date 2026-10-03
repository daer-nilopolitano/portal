"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { NOME_SITE } from "@/lib/content/site";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const ITENS_NAV = [
  { href: "/#sobre", rotulo: "Sobre" },
  { href: "/#embaixadores-do-rei", rotulo: "Embaixadores do Rei" },
  { href: "/#eventos", rotulo: "Eventos" },
  { href: "/#embaixadas", rotulo: "Embaixadas" },
  { href: "/noticias", rotulo: "Notícias" },
  { href: "/galeria", rotulo: "Galeria" },
];

const ID_MENU = "menu-site";

export function SiteHeader() {
  const pathname = usePathname();
  const { membro, carregando } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMenu = useRef<HTMLButtonElement>(null);

  // Trocou de página: fecha o menu.
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  // Menu aberto: Esc fecha (devolvendo o foco ao botão) e, ao alargar a janela até md (onde a navegação aparece
  // inteira no cabeçalho), ele fecha sozinho.
  useEffect(() => {
    if (!menuAberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuAberto(false);
        botaoMenu.current?.focus();
      }
    }
    const media = window.matchMedia("(min-width: 768px)");
    function aoMudarLargura() {
      if (media.matches) setMenuAberto(false);
    }
    document.addEventListener("keydown", aoTeclar);
    media.addEventListener("change", aoMudarLargura);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      media.removeEventListener("change", aoMudarLargura);
    };
  }, [menuAberto]);

  return (
    <header className="border-b border-border bg-surface-2">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Image src="/logo-daer.png" alt="" width={36} height={39} priority />
          {/* Em telas muito estreitas só a logo cabe ao lado dos botões; o nome fica disponível para leitores de tela. */}
          <span className="sr-only min-[480px]:hidden">{NOME_SITE}</span>
          <span className="hidden truncate font-heading text-lg font-semibold text-primary min-[480px]:inline">
            {NOME_SITE}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {ITENS_NAV.map((item) => {
            const ativo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-[3px] pb-1 text-sm transition-colors ${
                  ativo ? "border-accent text-primary" : "border-transparent text-text-muted hover:text-primary"
                }`}
              >
                {item.rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-3">
          <ThemeToggle />
          {!carregando &&
            (membro ? (
              <Link href="/painel" className="btn-primary">
                Minha área
              </Link>
            ) : (
              <Link href="/login" className="btn-outline">
                Entrar
              </Link>
            ))}
          <button
            ref={botaoMenu}
            type="button"
            onClick={() => setMenuAberto((atual) => !atual)}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            aria-controls={menuAberto ? ID_MENU : undefined}
            className="flex h-11 w-11 items-center justify-center rounded-md text-text hover:bg-surface md:hidden"
          >
            {menuAberto ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuAberto && (
        <nav id={ID_MENU} aria-label="Menu do site" className="border-t border-border bg-surface-2 px-2 py-2 md:hidden">
          <ul className="mx-auto max-w-5xl">
            {ITENS_NAV.map((item) => {
              const ativo = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuAberto(false)}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex min-h-[48px] items-center rounded-lg px-4 text-base ${
                      ativo ? "bg-primary/10 font-medium text-primary" : "text-text hover:bg-surface"
                    }`}
                  >
                    {item.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
