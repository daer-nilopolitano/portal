"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth, type Tipo } from "@/lib/auth-context";
import { ROTULO_TIPO } from "@/lib/labels";
import { NOME_SITE } from "@/lib/content/site";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface ItemNav {
  href: string;
  rotulo: string;
  papeis: Tipo[];
}

const ITENS_NAV: ItemNav[] = [
  { href: "/painel", rotulo: "Painel", papeis: ["conselheiro", "auxiliar", "embaixador_do_rei"] },
  { href: "/painel/embaixadas", rotulo: "Embaixadas", papeis: ["conselheiro"] },
  { href: "/painel/conselheiros", rotulo: "Conselheiros", papeis: ["conselheiro", "auxiliar"] },
  { href: "/painel/auxiliares", rotulo: "Auxiliares", papeis: ["conselheiro", "auxiliar"] },
  { href: "/painel/embaixadores", rotulo: "Embaixadores", papeis: ["conselheiro", "auxiliar"] },
  { href: "/painel/diretoria", rotulo: "Diretoria", papeis: ["conselheiro", "auxiliar", "embaixador_do_rei"] },
  { href: "/painel/grupos", rotulo: "Grupos", papeis: ["conselheiro"] },
  { href: "/minha-carteirinha", rotulo: "Minha carteirinha", papeis: ["embaixador_do_rei"] },
  { href: "/painel/materiais", rotulo: "Materiais", papeis: ["conselheiro", "auxiliar", "embaixador_do_rei"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { membro, carregando, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !membro) router.replace("/login");
  }, [carregando, membro, router]);

  if (carregando) {
    return <div className="flex min-h-screen items-center justify-center text-primary">Carregando…</div>;
  }
  if (!membro) return null;

  const itensVisiveis = ITENS_NAV.filter((item) => membro.tipo && item.papeis.includes(membro.tipo));

  return (
    <div className="flex min-h-screen">
      {/*
        Sidebar é "chrome" de marca — fica sempre com o azul/amarelo do DAER,
        não amarra no token `primary` (que clareia no escuro pra contrastar
        com fundo escuro; não faz sentido pra um painel inteiro). Mesmo
        raciocínio do rodapé do site público.
      */}
      <aside className="flex w-60 flex-shrink-0 flex-col bg-daer-blue text-white">
        <div className="px-6 py-5 font-heading text-base font-semibold">{NOME_SITE}</div>
        <nav className="flex-1 px-3">
          {itensVisiveis.map((item) => {
            const ativo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex min-h-[44px] items-center rounded border-l-4 px-3 text-sm ${
                  ativo ? "border-daer-yellow bg-white/10 font-medium" : "border-transparent text-white/80 hover:bg-white/10"
                }`}
              >
                {item.rotulo}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-4">
          <div>
            <p className="text-sm text-text-muted">{membro.tipo ? ROTULO_TIPO[membro.tipo] : "Sem tipo definido"}</p>
            <p className="font-heading text-base font-semibold text-primary">{membro.nome}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={logout} className="btn-ghost">
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
