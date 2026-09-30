"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth, type Tipo } from "@/lib/auth-context";
import { ROTULO_TIPO } from "@/lib/labels";
import { NOME_SITE } from "@/lib/content/site";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import Image from "next/image";

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
  { href: "/cursos", rotulo: "Cursos", papeis: ["conselheiro", "auxiliar"] },
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
      <aside className="w-60 flex-shrink-0 bg-chrome text-white">
        <div className="flex flex-col [@media(min-height:40rem)]:sticky [@media(min-height:40rem)]:top-0 [@media(min-height:40rem)]:h-screen">
          <Link
            href="/painel"
            className="flex h-20 flex-shrink-0 items-center gap-3 border-b border-white/10 px-6"
          >
            <Image src="/logo.png" alt="logo" width={32} height={32} className="h-8 w-auto" priority />
            <span className="font-heading text-base font-semibold">{NOME_SITE}</span>
          </Link>
          <nav className="flex-1 overflow-y-auto px-3 py-3">
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
        </div>
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
