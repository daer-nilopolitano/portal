"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth, type Papel } from "@/lib/auth-context";
import { ROTULO_PAPEL } from "@/lib/labels";

interface ItemNav {
  href: string;
  rotulo: string;
  papeis: Papel[];
}

const ITENS_NAV: ItemNav[] = [
  { href: "/painel", rotulo: "Painel", papeis: ["diretoria", "conselheiro", "embaixador_do_rei"] },
  { href: "/painel/embaixadas", rotulo: "Embaixadas", papeis: ["diretoria"] },
  { href: "/painel/conselheiros", rotulo: "Conselheiros", papeis: ["diretoria"] },
  { href: "/painel/embaixadores", rotulo: "Embaixadores", papeis: ["diretoria", "conselheiro"] },
  {
    href: "/minha-carteirinha",
    rotulo: "Minha carteirinha",
    papeis: ["diretoria", "conselheiro", "embaixador_do_rei"],
  },
  { href: "/painel/materiais", rotulo: "Materiais", papeis: ["diretoria", "conselheiro", "embaixador_do_rei"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pessoa, carregando, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !pessoa) {
      router.replace("/login");
    }
  }, [carregando, pessoa, router]);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-daer-blue">
        Carregando…
      </div>
    );
  }

  if (!pessoa) {
    return null;
  }

  const itensVisiveis = ITENS_NAV.filter(
    (item) => pessoa.papel && item.papeis.includes(pessoa.papel)
  );

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-shrink-0 flex-col bg-daer-blue text-white">
        <div className="px-6 py-5 font-heading text-base font-semibold">DAER Nilopolitano</div>
        <nav className="flex-1 px-3">
          {itensVisiveis.map((item) => {
            const ativo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 block border-l-4 px-3 py-2 text-sm ${
                  ativo
                    ? "border-daer-yellow bg-white/10 font-medium"
                    : "border-transparent text-white/80 hover:bg-white/10"
                }`}
              >
                {item.rotulo}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col bg-gray-50">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
          <div>
            <p className="text-sm text-gray-500">
              {pessoa.papel ? ROTULO_PAPEL[pessoa.papel] : "Sem papel definido"}
            </p>
            <p className="font-heading text-base font-semibold text-daer-blue">{pessoa.nome}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Sair
          </button>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
