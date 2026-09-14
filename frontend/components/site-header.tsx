"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <header className="border-b border-border bg-surface-2">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-daer.png" alt="" width={36} height={39} priority />
          <span className="font-heading text-lg font-semibold text-primary">DAER Nilopolitano</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {ITENS_NAV.map((item) => {
            const ativo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 pb-1 text-sm transition-colors ${
                  ativo ? "border-accent text-primary" : "border-transparent text-text-muted hover:text-primary"
                }`}
              >
                {item.rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!carregando &&
            (pessoa ? (
              <Link href="/painel" className="btn-primary">
                Minha área
              </Link>
            ) : (
              <Link href="/login" className="btn-outline">
                Entrar
              </Link>
            ))}
        </div>
      </div>
    </header>
  );
}
