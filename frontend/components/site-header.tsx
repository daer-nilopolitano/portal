"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ITENS_NAV = [
  { href: "/", rotulo: "Início" },
  { href: "/#sobre", rotulo: "Sobre" },
  { href: "/#eventos", rotulo: "Eventos" },
  { href: "/#embaixadas", rotulo: "Embaixadas" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { pessoa, carregando } = useAuth();

  return (
    <header className="border-b border-daer-blue/15 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-heading text-lg font-semibold text-daer-blue">
          DAER Nilopolitano
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {ITENS_NAV.map((item) => {
            const ativo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 pb-1 text-sm transition-colors ${
                  ativo
                    ? "border-daer-yellow text-daer-blue"
                    : "border-transparent text-gray-600 hover:text-daer-blue"
                }`}
              >
                {item.rotulo}
              </Link>
            );
          })}
        </nav>

        {!carregando &&
          (pessoa ? (
            <Link
              href="/painel"
              className="rounded-md bg-daer-blue px-4 py-2 text-sm font-medium text-white hover:bg-daer-blue-light"
            >
              Minha área
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-daer-blue px-4 py-2 text-sm font-medium text-daer-blue hover:bg-daer-blue hover:text-white"
            >
              Entrar
            </Link>
          ))}
      </div>
    </header>
  );
}
